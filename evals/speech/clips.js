// Short invented calls for the speech check. "text" is what the computer voice reads (Hindi and Hindi-English mixes are
// written in Devanagari so that the Hindi voice pronounces them like a Hindi speaker would). "reference" is the same
// call as plain words, used to compare the transcript. All calls are invented.
export const CLIPS = [
  { id: 'C1', label: 'scam', lang: 'en', voice: 'Aman', text: 'This is the cyber crime branch. A parcel in your name has drugs in it. You are under digital arrest. Do not tell anyone and transfer fifty thousand rupees to this safe account right now.' },
  { id: 'C2', label: 'scam', lang: 'hi', voice: 'Lekha', text: 'मैं एसबीआई बैंक से बोल रहा हूँ। आपका एटीएम कार्ड बंद हो गया है। उसे चालू करने के लिए अपना कार्ड नंबर और पिन अभी बताइए।' },
  { id: 'C3', label: 'scam', lang: 'hinglish', voice: 'Lekha', text: 'सर मैं बैंक से बोल रहा हूँ, आपके अकाउंट में प्रॉब्लम है। आपके फोन पर एक ओ टी पी आया होगा, वो अभी बता दीजिए।' },
  { id: 'C4', label: 'scam', lang: 'hinglish', voice: 'Lekha', text: 'मैडम आप अपने दूसरे नंबर को कॉल मर्ज कर दीजिए, बैंक वाले दोस्त से बात करनी है, बहुत जल्दी है।' },
  { id: 'C5', label: 'genuine', lang: 'en', voice: 'Tara', text: 'Hello, this is your Uber driver. I am outside your building. Please share the ride PIN when you sit in the car.' },
  { id: 'C6', label: 'genuine', lang: 'hi', voice: 'Lekha', text: 'नमस्ते, मैं स्कूल से बोल रहा हूँ। कल अभिभावक बैठक है। कृपया ग्यारह बजे तक स्कूल आ जाइए।' },
  { id: 'C7', label: 'genuine', lang: 'hinglish', voice: 'Lekha', text: 'हेलो सर, मैं बैंक ब्रांच से बोल रहा हूँ। आपकी चेक बुक तैयार है। आप कभी भी आकर ले सकते हैं। हम फोन पर कभी ओटीपी या पिन नहीं मांगते।' },
  { id: 'C8', label: 'genuine', lang: 'en', voice: 'Rishi', text: 'Hi, I am calling from the clinic. Your appointment is tomorrow at ten in the morning. Please bring your previous reports.' },
];
