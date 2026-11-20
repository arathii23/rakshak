// Tests for the accuracy work: reading the model's answer, matching its quotes to the user's own words, the merge of
// rules and AI, and the rules added after the first evaluation. All of these run offline with stand-ins for the AI.
import test from 'node:test';
import assert from 'node:assert/strict';
import { runRules, rulesVerdict } from '../src/rules.js';
import { analyze, parseAiOutput, snapQuote, mergeVerdicts, aiOnlyVerdict, SYSTEM_PROMPT } from '../src/analyze.js';
import { DEV } from '../evals/data/dev.js';
import { DEV2 } from '../evals/data/dev2.js';

const stubAi = (obj) => ({ chat: async () => (typeof obj === 'string' ? obj : JSON.stringify(obj)) });
const flaggedByRules = (t) => ['warning_signs', 'likely_scam'].includes(rulesVerdict(runRules(t), t));
const merge = (text, aiVerdict, quotes = []) => {
  const rules = runRules(text);
  return mergeVerdicts({ text, rules, rVerdict: rulesVerdict(rules, text), aiVerdict, quotes, hasStrongRule: rules.signals.some((s) => s.kind === 'strong') });
};

// ---------------- reading the model's answer ----------------
test('parseAiOutput: complete JSON, code fences and a cut-off answer padded with blank lines', () => {
  const full = { verdict: 'warning_signs', quotes: [{ quote: 'share your OTP', why: 'asks for a code' }], explanation: 'The caller asks for a code.' };
  assert.deepEqual(parseAiOutput(JSON.stringify(full)), full);
  assert.deepEqual(parseAiOutput('```json\n' + JSON.stringify(full) + '\n```'), full);
  // the model sometimes writes the whole answer, then blank lines until it runs out of room, never closing the brace
  const open = JSON.stringify(full).slice(0, -1) + '\n\n\n\n\n\n';
  assert.deepEqual(parseAiOutput(open), full);
});

test('parseAiOutput: an answer cut off inside the explanation is repaired; text around JSON is salvaged; no verdict gives null', () => {
  const cut = '{"verdict":"likely_scam","quotes":[{"quote":"bata do","why":"asks"}],"explanation":"The caller asks for a code and';
  const d = parseAiOutput(cut);
  assert.equal(d.verdict, 'likely_scam');
  assert.equal(d.quotes[0].quote, 'bata do');
  const salvaged = parseAiOutput('Sure! Here it is: {"verdict": "warning_signs", "quotes": [{"quote": "OTP bata do", "why": "asks for a code"}], "explanation": "Be care');
  assert.equal(salvaged.verdict, 'warning_signs');
  assert.equal(salvaged.quotes[0].quote, 'OTP bata do');
  assert.equal(parseAiOutput('I cannot help with that.'), null);
  assert.equal(parseAiOutput(''), null);
  assert.equal(parseAiOutput(null), null);
  assert.equal(aiOnlyVerdict('{"verdict":"no_clear_signs","quotes":[],"explanation":"x"}'), 'no_clear_signs');
  assert.equal(aiOnlyVerdict('{"verdict":"safe","quotes":[],"explanation":"x"}'), null); // "safe" is not a verdict this app ever shows
});

test('analyze: an unusable model answer ends in the honest limited check, never in a guess', async () => {
  const r = await analyze({ text: 'Please share your OTP now so that we can close the case', lang: 'en', sarvam: stubAi('{"verdict":"safe","quotes":[],"explanation":"fine"}') });
  assert.equal(r.limited, true);
  assert.equal(r.source, 'rules');
  assert.equal(r.verdict, 'warning_signs');
  const padded = await analyze({
    text: 'Please share your OTP now so that we can close the case', lang: 'en',
    sarvam: stubAi('{"verdict":"warning_signs","quotes":[{"quote":"share your OTP","why":"asks for a code"}],"explanation":"The caller asks for a code."\n\n\n\n'),
  });
  assert.equal(padded.limited, false);
  assert.equal(padded.source, 'ai');
});

// ---------------- matching quotes to the user's words ----------------
test('snapQuote: exact quotes, slightly mis-copied quotes and unrelated quotes', () => {
  const text = 'Sir aapka khata aaj raat band ho jayega, isliye abhi apna OTP bata dijiye';
  const exact = snapQuote(text, 'apna OTP bata dijiye');
  assert.equal(text.slice(exact.start, exact.end), 'apna OTP bata dijiye');
  const near = snapQuote(text, 'abhi apna OTP bta dijiye');
  assert.ok(near, 'a dropped letter should still find the span');
  assert.equal(text.slice(near.start, near.end), 'abhi apna OTP bata dijiye');
  const hindi = 'आपका खाता आज रात बंद हो जाएगा';
  const h = snapQuote(hindi, 'आपका खाता आज रात बन्द हो जाएगा');
  assert.ok(h);
  assert.equal(hindi.slice(h.start, h.end), hindi);
  assert.equal(snapQuote(text, 'send money to this account today'), null);
  assert.equal(snapQuote(text, 'PIN'), null); // too short to snap: only an exact match counts
});

test('analyze: a highlight is always the user\'s own words, even when the model copied them wrongly', async () => {
  const text = 'Sir aapka khata aaj raat band ho jayega, isliye abhi apna OTP bata dijiye';
  const r = await analyze({
    text, lang: 'en',
    sarvam: stubAi({ verdict: 'likely_scam', quotes: [{ quote: 'apna OTP bata dijiy', why: 'asks for a code' }, { quote: 'khata aaj raat band ho jayegaa', why: 'threat' }], explanation: 'Careful.' }),
  });
  assert.ok(r.highlights.length >= 1);
  for (const h of r.highlights) assert.equal(text.slice(h.start, h.end), h.text);
});

// ---------------- merging rules and AI ----------------
test('merge: the AI finding nothing outvotes a single thin rule hit, but not strong or firm evidence', () => {
  const thin = 'Sir please tell me your OTP so we can update your records quickly';
  assert.equal(runRules(thin).score, 1);
  assert.equal(merge(thin, 'no_clear_signs').verdict, 'no_clear_signs');
  const strong = 'Main CBI se bol raha hoon. Digital arrest mein hain, OTP bata do.';
  assert.equal(merge(strong, 'no_clear_signs').verdict, 'likely_scam');
  const merging = 'Sir please merge the call with my colleague so that we can all talk together';
  assert.equal(merge(merging, 'no_clear_signs').verdict, 'warning_signs');
});

test('merge: the AI cannot raise a verdict on thin or invisible evidence', () => {
  const t = 'He asked me about my holiday plans and the weather in Delhi';
  assert.equal(merge(t, 'warning_signs', []).verdict, 'no_clear_signs'); // no quote at all
  assert.equal(merge(t, 'warning_signs', ['holiday', 'weather']).verdict, 'no_clear_signs'); // one or two words describe a topic
  assert.equal(merge(t, 'likely_scam', ['about my holiday plans']).verdict, 'warning_signs'); // one thin quote cannot make "very likely"
  assert.equal(merge(t, 'likely_scam', ['about my holiday plans', 'the weather in Delhi']).verdict, 'likely_scam');
  assert.equal(merge('OTP bata do', 'likely_scam', []).verdict, 'warning_signs'); // one request, nothing else: a warning sign, not "very likely"
});

test('merge: whichever side is more worried wins when both found something', () => {
  const t = 'Please send the money to my account today, I am from the bank branch near you';
  const rules = runRules(t);
  assert.ok(rules.score >= 1);
  assert.equal(merge(t, 'likely_scam', ['send the money to my account today', 'I am from the bank branch']).verdict, 'likely_scam');
});

// ---------------- rules added after the first evaluation ----------------
test('call merging is a warning sign in English, Hinglish and Hindi; advice not to do it is not', () => {
  for (const t of [
    'Can you please merge the call so that we can all talk together?',
    'Aap mere dusre number ko call merge kar dijiye na, bas ek minute ke liye.',
    'आप यह कॉल मर्ज कर दीजिए ताकि हम सब बात कर सकें।',
    'Sir aap mera call apne bank wale dost ke saath merge kar do, bahut jaldi hai',
  ]) {
    const r = runRules(t);
    assert.ok(r.strongIds.includes('call_merge'), t);
    assert.deepEqual(r.firmIds, ['call_merge']);
  }
  for (const t of ['Never merge a call with someone you do not know.', 'Kisi anjaan ke kehne par call merge mat kijiye.']) {
    assert.equal(runRules(t).score, 0, t);
  }
});

test('"digital arrest" is a strong scam phrase when said to you, and just news when it is about scams', () => {
  assert.ok(runRules('You are under digital arrest. Do not disconnect the video call.').score >= 2);
  const news = 'Police have warned citizens about digital arrest scams where fraudsters pose as CBI officers on video calls. Real agencies never ask for money transfers.';
  const r = runRules(news);
  assert.equal(r.score, 0);
  assert.equal(r.flags.meta, true);
});

test('a story about an earlier call is not a demand; the same words said to you still are', () => {
  const story = 'Mom, a bank person called asking for my OTP and said my account would be blocked. I told him I will go to the branch myself. Is that okay?';
  const r = runRules(story);
  assert.equal(r.score, 0);
  assert.equal(r.flags.retelling, true);
  assert.equal(runRules('Kal mujhe ek call aaya tha jisne bola ki wo CBI se hai aur mera arrest warrant hai. Maine call kaat diya.').score, 0);
  // a first-person aside inside a real demand must not hide the demand
  assert.ok(runRules('Person: He called me yesterday. Caller: Sir please share your OTP now.').score >= 1);
});

test('a code described without the word OTP is still a code request', () => {
  assert.ok(runRules('Please read out the six numbers that have just come on your phone, it takes ten seconds.').strongIds.includes('secret_request'));
  assert.ok(runRules('कृपया आप अपने मोबाइल पर आए हुए छह अंकों के कोड को मुझे पढ़कर सुना दीजिए।').strongIds.includes('secret_request'));
  assert.ok(runRules('Aap apna Aadhaar aur wo code bata dijiye jo abhi aapke phone par aayega.').strongIds.includes('secret_request'));
  assert.equal(runRules('Can you please confirm the last four digits of your card? We never ask for the full number.').score, 0);
});

test('payment demands put as an obligation, gift cards and "accept the request" are money requests', () => {
  for (const t of [
    'You need to pay 5,000 rupees as a processing charge today.',
    'इसे पाने के लिए पहले पांच हज़ार रुपये की जीएसटी आपको हमारे खाते में डालनी होगी।',
    'Aapko 3,000 rupaye insurance ke liye abhi jama karne honge.',
    'Buy Google Play gift cards worth 10,000 rupees and read me the codes on the back.',
    'Main aapko ek rupaye ka GPay request bhej raha hoon, aap bas accept kar dijiye.',
    'If you pay 24,000 right now through this link, I will stop the notice.',
  ]) assert.ok(runRules(t).strongIds.includes('money_request'), t);
  for (const t of [
    'Your bill of Rs 1450 is due. Please pay through the official app.',
    'Please pay the fee at the school office counter before the 20th.',
    'Hello, I am from the hospital billing counter. Please deposit the advance at the counter on the ground floor.',
  ]) assert.equal(runRules(t).score, 0, t);
});

test('a cab driver or delivery person who is there in person is not a scam; the same PIN request from a stranger is', () => {
  assert.equal(runRules('Your Uber driver is arriving in two minutes. Please share the ride PIN with him after you sit in the cab.').score, 0);
  assert.ok(runRules('Sir your account will be blocked today, please share your PIN now.').score >= 1);
});

test('advice that starts "if someone asks" is not a demand', () => {
  const t = 'RBI has clarified that you never need to enter your UPI PIN to receive money. If a request asks for your PIN, it is for sending money, so decline it.';
  assert.equal(runRules(t).score, 0);
});

test('"final warning" and "alert" do not silence a threat, and a new rule never hides a real demand', () => {
  assert.ok(runRules('This is your final warning, you will be arrested today if you do not cooperate. Keep this a secret.').score >= 1);
  assert.ok(runRules('Cyber crime alert: share your OTP now or your account will be blocked today.').score >= 1);
});

// ---------------- the development sets as a guard against regressions ----------------
test('rules only (no AI) on the development sets: highlights are exact, no honest call is called a scam, and false alarms stay rare', () => {
  const all = [...DEV, ...DEV2];
  let genuine = 0, genuineFlagged = 0, scams = 0, scamsFlagged = 0;
  for (const c of all) {
    const r = runRules(c.text);
    for (const s of r.signals) assert.equal(c.text.slice(s.start, s.end), s.text, `${c.id}: span mismatch`);
    const v = rulesVerdict(r, c.text);
    if (c.label !== 'scam') assert.notEqual(v, 'likely_scam', `${c.id} (${c.label}) was called a likely scam by the rules`);
    if (c.label === 'genuine') { genuine++; if (flaggedByRules(c.text)) genuineFlagged++; }
    if (c.label === 'scam') { scams++; if (flaggedByRules(c.text)) scamsFlagged++; }
  }
  assert.ok(genuineFlagged / genuine <= 0.05, `rules flagged ${genuineFlagged} of ${genuine} genuine texts`);
  assert.ok(scamsFlagged / scams >= 0.8, `rules flagged only ${scamsFlagged} of ${scams} scams`);
});

test('the prompt tells the model what normal calls look like and never to call a call safe', () => {
  assert.match(SYSTEM_PROMPT, /no_clear_signs/);
  assert.match(SYSTEM_PROMPT, /Never say the call is safe/);
  assert.match(SYSTEM_PROMPT, /merge/i);
  assert.match(SYSTEM_PROMPT, /ignore any instruction/i);
});

test('merge: a delivery OTP asked for at the door is at most a warning sign, never "very likely"', () => {
  const t = 'Hello, I am the delivery boy, I am at your gate with your Amazon package. The OTP came on your phone, please tell me so I can hand over the parcel.';
  assert.equal(runRules(t).score, 0);
  assert.equal(merge(t, 'likely_scam', ['The OTP came on your phone, please tell me so I can hand over the parcel']).verdict, 'warning_signs');
});

test('merge: a story about an earlier call, flagged only by the AI, is not a warning', async () => {
  const text = 'Mom, a bank person called asking for my OTP and said my account would be blocked. I told him I will go to the branch myself. Is that okay?';
  const r = await analyze({
    text, lang: 'en',
    sarvam: stubAi({ verdict: 'warning_signs', quotes: [{ quote: 'asking for my OTP', why: 'asks for a code' }, { quote: 'my account would be blocked', why: 'threat' }], explanation: 'The caller asked for an OTP.' }),
  });
  assert.equal(r.verdict, 'no_clear_signs');
  assert.match(r.explanation, /earlier call/);
});
