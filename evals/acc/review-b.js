// Applies the outcome of the one blind read-through of the generated test-B texts (done before any detector was run
// on them): relabels the items the reader judged mislabelled and fixes the language tag where the text is plainly
// Hinglish although English was requested. Deterministic; running it twice changes nothing.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'test-b.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

// id → [new label, reason]. Only items where the text, read cold, did not match the label it was generated under.
const RELABEL = {
  TB081: ['ambiguous', 'a customer-care callback that asks the person to "keep your card details handy for verification": plausible for a real agency, but also how card-detail scams begin'],
};

const HINDI_WORDS = new Set(('hai hain hoon aap aapka aapke aapki mera meri mujhe nahi toh bas jaldi kijiye karo karna dijiye bataiye batao bhai beta warna abhi aaj kal raha rahe hoga wala kya theek thik yeh woh tum bhej mat kisi chahiye paisa rupaye ghar baat bol bolo hum humare tera tere tu').split(' '));
const hinglishWords = (t) => new Set((t.toLowerCase().match(/[a-z]+/g) || []).filter((w) => HINDI_WORDS.has(w))).size;

let langFixed = 0;
const relabelled = {};
for (const c of data.cases) {
  if (RELABEL[c.id] && c.label !== RELABEL[c.id][0]) { relabelled[c.id] = `${c.label} → ${RELABEL[c.id][0]}: ${RELABEL[c.id][1]}`; c.label = RELABEL[c.id][0]; }
  if (c.lang === 'en' && hinglishWords(c.text) >= 3) { c.lang = 'hinglish'; langFixed++; }
}
data.meta.review = {
  note: 'All items were read once, before any detector was run on them. Items were kept unless the text clearly contradicted its label; the reader changed the labels below and nothing else.',
  relabelled: { ...(data.meta.review?.relabelled || {}), ...relabelled },
  languageTagFixed: (data.meta.review?.languageTagFixed || 0) + langFixed,
};
fs.writeFileSync(file, JSON.stringify(data, null, 1) + '\n');
const by = (k) => data.cases.reduce((m, c) => (m[c[k]] = (m[c[k]] || 0) + 1, m), {});
console.log(JSON.stringify(data.meta.review.relabelled), 'languageTagFixed', data.meta.review.languageTagFixed, 'labels', JSON.stringify(by('label')), 'lang', JSON.stringify(by('lang')));
