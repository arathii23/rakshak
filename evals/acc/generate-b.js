// Builds TEST-B: a held-out set written by the Sarvam model instead of by me. It has never seen the detector's rules
// or prompt, so it shares fewer blind spots with the detector than my own hand-written sets do. (It is still the
// same model family as the detector's AI layer, which can make its scams easier to recognise; see docs/ACCURACY.md.)
//
//   node evals/acc/generate-b.js --budget 30      writes evals/data/test-b.json (calls Sarvam; answers are cached)
//
// Labels come from the instruction given for each item, then every item is read once by a person/Claude BEFORE any
// detector is run on it (see meta.review in evals/data/test-b.json and evals/acc/review-b.js); only clear mismatches
// are relabelled.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDotEnv } from '../../src/config.js';
import { createSarvam } from '../../src/sarvam.js';
import { Cache, Ledger, cachedSarvam, pool } from './lib.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const evals = path.resolve(here, '..');
const argv = process.argv.slice(2);
const budget = Number(argv[argv.indexOf('--budget') + 1]) || 30;
loadDotEnv();
if (!process.env.SARVAM_API_KEY) { console.error('SARVAM_API_KEY is not set. Nothing was called.'); process.exit(2); }

const SYSTEM = `You write short, realistic example phone-call transcripts that are used ONLY as test data for a scam-awareness app for families in India. Write natural spoken language, not textbook language: contractions, small hesitations, local words. Every item must be self-contained and between 25 and 90 words (two-sided conversations may be up to 120). Do not add titles, notes, labels such as "Scam:", or explanations. Return JSON only.`;

const FORMS = {
  en_caller: 'English. Only the caller\'s own words, as one speech.',
  hinglish_caller: 'Hinglish: Hindi written in Roman letters mixed with English words, the way people text. Only the caller\'s own words, as one speech.',
  hi_caller: 'Hindi in Devanagari script (English words such as OTP, bank or app may stay in English letters). Only the caller\'s own words, as one speech.',
  en_dialogue: 'English. A two-sided conversation written as lines starting "Caller:" and "Person:".',
  hinglish_dialogue: 'Hinglish (Roman letters). A two-sided conversation written as lines starting "Caller:" and "Person:".',
  en_stt: 'English, written the way a speech-to-text tool prints it: all lower case, no punctuation, no line breaks, a few filler words.',
  hinglish_stt: 'Hinglish (Roman letters), written the way a speech-to-text tool prints it: all lower case, no punctuation, no line breaks, a few filler words.',
  hi_stt: 'Hindi in Devanagari, written the way a speech-to-text tool prints it: no punctuation, no line breaks, a few filler words.',
};
const FORM_META = {
  en_caller: ['en', 'caller'], hinglish_caller: ['hinglish', 'caller'], hi_caller: ['hi', 'caller'],
  en_dialogue: ['en', 'dialogue'], hinglish_dialogue: ['hinglish', 'dialogue'],
  en_stt: ['en', 'stt'], hinglish_stt: ['hinglish', 'stt'], hi_stt: ['hi', 'stt'],
};

// Scam types, described in plain words from docs/RESEARCH.md (not from the detector's rules).
const SCAMS = [
  ['digital_arrest', 'a fake police, CBI, ED or court officer who says the person is involved in a serious crime, keeps them on a video call and makes them afraid to tell anyone'],
  ['courier_customs', 'a fake courier or customs officer who says a parcel in the person\'s name was held with something illegal and passes them on to a "cyber crime" officer'],
  ['sim_telecom', 'a fake telecom-authority caller who says the person\'s SIM or Aadhaar will be cancelled or has been misused'],
  ['electricity_kyc', 'a fake electricity-board caller or message saying power will be cut tonight because of a pending bill or KYC, and asking the person to call a number or use an app'],
  ['bank_card_code', 'a fake bank employee who wants the person to read out a code that arrives by SMS (or card details) to stop a problem on the account or card'],
  ['upi_refund', 'someone who says they sent money by mistake or that a refund or cashback is coming, and gets the person to approve a payment request or scan a code'],
  ['apk_install', 'someone who sends a file or link (for a traffic fine, a government scheme, KYC or rewards) and asks the person to install it or enter details'],
  ['remote_support', 'a fake tech-support or refund agent who asks the person to install a remote-control or screen-sharing app'],
  ['task_job', 'a recruiter of a part-time online job (liking videos, reviews, small tasks) who asks for a deposit or fee before payouts'],
  ['investment_group', 'a stock or crypto "advisor" who promises very high guaranteed returns and asks the person to put money in quickly'],
  ['loan_advance_fee', 'a lender offering an easy pre-approved loan who asks for a processing, insurance or GST fee first'],
  ['lottery_prize', 'a caller announcing a lottery, KBC or lucky-draw prize that needs a fee or tax to be paid first'],
  ['relative_emergency', 'someone pretending to be a relative, or acting for one, who is in an accident, hospital or police trouble and needs money urgently and secretly'],
  ['insurance_bonus', 'a fake insurance or pension-office caller saying a policy bonus or maturity amount is stuck and needs a fee, tax or code to be released'],
  ['call_merge_or_wrong_code', 'a stranger who gives a friendly reason to call (a job interview, an event, a friend gave the number) and asks the person to merge calls, or says a code was sent to the person\'s phone by mistake and asks to be told it'],
  ['fake_authority_bank_loan', 'a fake loan-recovery or bank-legal caller who threatens a police case or public shame unless money is sent right now'],
];
const SCAM_FORMS = [
  ['en_caller', 'hinglish_caller', 'hi_caller', 'en_dialogue'],
  ['hinglish_caller', 'en_caller', 'hi_caller', 'hinglish_stt'],
  ['hi_caller', 'en_stt', 'hinglish_caller', 'hinglish_dialogue'],
  ['en_caller', 'hi_stt', 'hinglish_caller', 'en_dialogue'],
];

const GENUINE = [
  [['parcel_timing', 'a delivery person giving a delivery time slot for a parcel'], ['food_arrival', 'a food-delivery rider saying they have arrived and asking the customer to come down'], ['gas_booking', 'a gas agency confirming a cylinder delivery'], ['grocery_call', 'a grocery store calling about an out-of-stock item and offering a substitute']],
  [['bank_branch_kyc', 'a bank asking the customer to visit the branch with documents for periodic KYC, or to update it in the official app'], ['bank_statement', 'a bank telling the customer the statement is ready on email'], ['fd_maturity', 'a bank relationship manager mentioning a fixed deposit that matures soon and offering to renew it at the branch'], ['bank_fraud_check', 'a bank fraud team asking only "did you make this payment of X today?" and telling the customer to block the card from the official app if not, never asking for any code']],
  [['clinic_reminder', 'a clinic reminding about tomorrow\'s appointment'], ['school_notice', 'a school office about a parent-teacher meeting or fee last date to be paid at the school office'], ['tuition_teacher', 'a tuition teacher about a changed class time'], ['hostel_parent', 'a student telling their parent they reached the hostel']],
  [['bank_warning', 'a bank message reminding customers never to share OTP, PIN or CVV with anyone'], ['parent_warning', 'a child warning an elderly parent not to give any code or money to people claiming to be police or bank staff'], ['news_digital_arrest', 'a news reader explaining that "digital arrest" is a scam and real agencies never arrest over video call'], ['retelling_scam', 'a person telling a friend about a suspicious call they received yesterday, which they refused and reported on 1930']],
  [['hr_interview', 'an HR executive scheduling an interview and mentioning the meeting link will come by email'], ['colleague_change', 'a colleague changing a meeting time'], ['landlord_rent', 'a landlord reminding the tenant that rent is due, to be paid to the usual account'], ['society_maintenance', 'a housing society office about the monthly maintenance to be paid at the office or in the society app']],
  [['telecom_plan', 'a telecom company saying the plan expires tomorrow, recharge in the official app'], ['bill_reminder', 'an electricity company reminding of a bill due date, to be paid in the official app or at the counter'], ['broadband_visit', 'a broadband technician announcing a visit, no charge'], ['dth_recharge', 'a DTH operator reminding of a recharge']],
  [['police_followup', 'a police station asking the complainant to come in person with an ID to sign a statement'], ['passport_appointment', 'a passport office about an appointment and documents to bring'], ['tax_notice_portal', 'a tax office saying a notice has been sent and the person should reply on the official portal; nobody will ask for payment on the phone'], ['property_tax', 'a municipal office about property tax payable online or at the ward office']],
  [['friends_dinner', 'friends planning dinner and agreeing to split the bill later'], ['mother_check', 'a mother checking whether her child ate and when they will be home'], ['sibling_errand', 'a sibling asking to pick something up on the way home'], ['wedding_invite', 'a relative inviting someone to a wedding']],
  [['customer_callback', 'a customer-care callback with a complaint number and a refund timeline to the original payment method'], ['return_pickup', 'an e-commerce return pickup slot'], ['flight_status', 'an airline informing about a delay'], ['hotel_booking', 'a hotel confirming a booking and check-in time']],
  [['otp_sms', 'an automatic SMS giving a one-time password for a booking or login with "do not share this with anyone"'], ['payment_received', 'a payment confirmation message'], ['card_dispatched', 'a bank saying a new debit card is dispatched, the customer sets the PIN themselves and the bank will never ask for it'], ['emi_debited', 'an EMI debit confirmation']],
];
const GENUINE_FORMS = [
  ['en_caller', 'hinglish_caller', 'hi_caller', 'hinglish_stt'],
  ['hinglish_caller', 'en_caller', 'hi_caller', 'en_dialogue'],
  ['hi_caller', 'hinglish_caller', 'en_caller', 'hi_stt'],
  ['en_caller', 'hinglish_dialogue', 'hi_caller', 'en_stt'],
];

const AMBIGUOUS = [
  [['doorstep_or_ride_otp', 'a delivery person at the customer\'s door asking for the delivery code'], ['cab_start_otp', 'a cab driver arriving and asking for the ride-start code shown in the app'], ['address_confirmation', 'a courier asking the customer to confirm the address and landmark'], ['hotel_desk', 'a hotel front desk asking for a booking code']],
  [['relative_money', 'a relative or friend (plausibly genuine) asking for a small urgent money transfer'], ['colleague_lend', 'a colleague asking to borrow money until payday'], ['child_fees', 'a grown-up child asking a parent to send college fees'], ['neighbour_help', 'a neighbour asking for a UPI transfer for an emergency purchase']],
  [['loan_telemarketing', 'a telemarketer offering a pre-approved loan and asking if the person is interested'], ['broker_property', 'a property broker or buyer asking to pay a token amount to book a flat'], ['dob_confirmation', 'an unknown caller who says they are from the bank and asks to confirm date of birth'], ['kyc_visit', 'a caller who says the person\'s KYC is pending and asks them to visit the branch']],
  [['scam_opening_courier', 'only the first words of a call from a "courier company" about a parcel with a problem, no request yet'], ['scam_opening_police', 'only the first words of a call from a "cyber crime department" about a complaint, no request yet'], ['vague_account_issue', 'a caller who says something is wrong with the account and asks if the person can talk, no request yet'], ['tax_discrepancy', 'a caller about a tax return discrepancy asking the person to check the official portal']],
];
const AMBIG_FORMS = [
  ['en_caller', 'hinglish_caller', 'hi_caller', 'en_dialogue'],
  ['hinglish_caller', 'en_caller', 'hi_caller', 'hinglish_dialogue'],
  ['en_caller', 'hinglish_caller', 'hi_caller', 'hinglish_stt'],
  ['hinglish_caller', 'en_caller', 'hi_caller', 'en_dialogue'],
];

const SCHEMA = {
  type: 'object',
  properties: { items: { type: 'array', items: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false } } },
  required: ['items'], additionalProperties: false,
};

const jobs = [];
SCAMS.forEach(([typ, desc], i) => {
  const forms = SCAM_FORMS[i % SCAM_FORMS.length];
  jobs.push({
    label: 'scam', items: forms.map((f) => ({ typ, form: f })),
    user: `Write ${forms.length} different test transcripts. Every one is a SCAM call: ${desc}. The speaker is the fraudster. Items, in this order:\n${forms.map((f, k) => `${k + 1}. ${FORMS[f]}`).join('\n')}\nVary the fraudster: one aggressive and frightening, one calm and polite, others in between. Use different openings and different details (names, amounts, places) in each item. Return {"items":[{"text":"..."},...]}.`,
  });
});
GENUINE.forEach((group, i) => {
  const forms = GENUINE_FORMS[i % GENUINE_FORMS.length];
  jobs.push({
    label: 'genuine', items: group.map(([typ], k) => ({ typ, form: forms[k] })),
    user: `Write ${group.length} different test transcripts of ORDINARY, LEGITIMATE calls or messages. Nobody is trying to cheat anyone: the speaker is exactly who they say they are and asks for nothing risky. Items, in this order:\n${group.map(([, d], k) => `${k + 1}. ${d}. Form: ${FORMS[forms[k]]}`).join('\n')}\nUse everyday wording, different names and details. Return {"items":[{"text":"..."},...]}.`,
  });
});
AMBIGUOUS.forEach((group, i) => {
  const forms = AMBIG_FORMS[i % AMBIG_FORMS.length];
  jobs.push({
    label: 'ambiguous', items: group.map(([typ], k) => ({ typ, form: forms[k] })),
    user: `Write ${group.length} different test transcripts of calls where the words alone do NOT show whether the caller is honest or a fraudster (a genuine call and a scam could sound the same). Do not make the caller threatening, and do not add any hint about who they really are. Items, in this order:\n${group.map(([, d], k) => `${k + 1}. ${d}. Form: ${FORMS[forms[k]]}`).join('\n')}\nReturn {"items":[{"text":"..."},...]}.`,
  });
});

fs.mkdirSync(path.join(evals, 'cache'), { recursive: true });
const cache = new Cache(path.join(evals, 'cache', 'chat.jsonl'));
const ledger = new Ledger(path.join(evals, 'cache', 'spend.json'), budget);
const real = createSarvam({ apiKey: process.env.SARVAM_API_KEY, timeouts: { chat: 90000 } });
const cs = cachedSarvam({ real, cache, ledger, live: true });

const DEV = /[ऀ-ॿ]/g;
const letters = (s) => (s.match(/\p{L}/gu) || []).length;
const scriptOk = (lang, text) => {
  const dev = (text.match(DEV) || []).length;
  const share = dev / Math.max(1, letters(text));
  if (lang === 'hi') return share >= 0.35;
  return share === 0; // en and hinglish are written in Roman letters only
};

const out = [];
const rejected = [];
await pool(jobs.map((j, idx) => ({ j, idx })), 3, async ({ j, idx }) => {
  const sv = cs.make();
  let data = null;
  try {
    const content = await sv.chat({ system: SYSTEM, user: j.user, schema: SCHEMA, maxTokens: 1800, temperature: 0.9 });
    data = JSON.parse(content.trim().replace(/^```(?:json)?/i, '').replace(/```$/, ''));
  } catch (e) { rejected.push({ idx, why: `call_failed:${e?.kind || e?.message}` }); return; }
  const items = Array.isArray(data?.items) ? data.items : [];
  j.items.forEach((spec, k) => {
    const text = String(items[k]?.text ?? '').trim();
    const [lang, style] = FORM_META[spec.form];
    if (!text) { rejected.push({ idx, k, why: 'missing' }); return; }
    if (text.length > 900 || text.length < 20) { rejected.push({ idx, k, why: 'length' }); return; }
    if (!scriptOk(lang, text)) { rejected.push({ idx, k, why: `script_${lang}`, sample: text.slice(0, 70) }); return; }
    out.push({ order: idx * 10 + k, label: j.label, typ: spec.typ, lang, style, text });
  });
});

out.sort((a, b) => a.order - b.order);
const cases = out.map((o, i) => ({ id: `TB${String(i + 1).padStart(3, '0')}`, label: o.label, typ: o.typ, lang: o.lang, style: o.style, text: o.text }));
const meta = {
  about: 'Written by the Sarvam model sarvam-105b-conversations (temperature 0.9) from plain-language scenario descriptions; not by the detector author. Labels are the instruction given for each item, then checked by reading (meta.review below and evals/acc/review-b.js).',
  generated: new Date().toISOString().slice(0, 10), generator: 'sarvam-105b-conversations', script: 'evals/acc/generate-b.js',
  requested: jobs.reduce((n, j) => n + j.items.length, 0), kept: cases.length, rejected: rejected.length,
};
fs.writeFileSync(path.join(evals, 'data', 'test-b.json'), JSON.stringify({ meta, cases }, null, 1) + '\n');
if (argv.includes('--show-rejects')) for (const r of rejected) console.log('rejected', r.idx, r.k, r.why, JSON.stringify(r.sample || ''));
console.log(`jobs ${jobs.length} · items kept ${cases.length}/${meta.requested} · rejected ${rejected.length}: ${JSON.stringify(rejected.reduce((m, r) => (m[r.why] = (m[r.why] || 0) + 1, m), {}))}`);
console.log(`calls ${cs.state.calls} (cache hits ${cs.state.hits}) · spend so far ₹${ledger.estRs.toFixed(2)} of ₹${budget} (upper-bound prices)`);
const by = (k) => cases.reduce((m, c) => (m[c[k]] = (m[c[k]] || 0) + 1, m), {});
console.log('labels', JSON.stringify(by('label')), 'lang', JSON.stringify(by('lang')), 'style', JSON.stringify(by('style')));
