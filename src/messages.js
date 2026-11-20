// Fixed wording shown to users, in Hindi and English. Hindi was written with AI help and should be
// reviewed by a native Hindi speaker before real use.

export const VERDICTS = ['not_enough_info', 'no_clear_signs', 'warning_signs', 'likely_scam'];

export const SIGNAL_LABELS = {
  secret_request: {
    en: 'Asks for your OTP, PIN or card details',
    hi: 'आपसे OTP, पिन या कार्ड की जानकारी माँगी जा रही है',
  },
  money_request: {
    en: 'Asks you to send money or pay a fee',
    hi: 'पैसे भेजने या शुल्क भरने को कहा जा रहा है',
  },
  remote_app: {
    en: 'Asks you to install an app or share your screen',
    hi: 'ऐप डालने या स्क्रीन शेयर करने को कहा जा रहा है',
  },
  call_merge: {
    en: 'Asks you to merge calls, which can let a scammer hear your bank\'s OTP call',
    hi: 'कॉल मर्ज करने को कहा जा रहा है, जिससे ठग आपके बैंक का OTP वाला कॉल सुन सकते हैं',
  },
  digital_arrest: {
    en: '"Digital arrest" is a well-known scam phrase',
    hi: '"डिजिटल अरेस्ट" ठगी में इस्तेमाल होने वाला जाना-पहचाना शब्द है',
  },
  arrest_threat: {
    en: 'Threatens arrest or a legal case',
    hi: 'गिरफ्तारी या कानूनी कार्रवाई की धमकी',
  },
  block_threat: {
    en: 'Threatens to block or cut off your account, SIM or service',
    hi: 'खाता, सिम या सेवा बंद करने की धमकी',
  },
  secrecy: {
    en: 'Tells you to keep this secret or stay on the call',
    hi: 'इसे राज़ रखने या कॉल पर बने रहने को कहा जा रहा है',
  },
  authority: {
    en: 'Mentions police, a bank or an office (not a warning sign by itself)',
    hi: 'पुलिस, बैंक या दफ़्तर का नाम (अकेले यह ठगी का संकेत नहीं है)',
  },
  urgency: {
    en: 'Pushes you to act quickly (not a warning sign by itself)',
    hi: 'जल्दी करने का दबाव (अकेले यह ठगी का संकेत नहीं है)',
  },
  prize: {
    en: 'Mentions a prize or big returns (not a warning sign by itself)',
    hi: 'इनाम या भारी मुनाफ़े की बात (अकेले यह ठगी का संकेत नहीं है)',
  },
};

// Which signal decides the "next step" wording (first match wins).
const NEXT_PRIORITY = ['digital_arrest', 'arrest_threat', 'remote_app', 'call_merge', 'secret_request', 'money_request', 'block_threat', 'secrecy'];

const NEXT = {
  digital_arrest: {
    en: 'Hang up. Genuine officers do not ask for money or codes over a call. If you are worried, go to your local police station yourself.',
    hi: 'फ़ोन काट दें। असली अधिकारी फ़ोन पर पैसे या कोड नहीं माँगते। चिंता हो तो खुद अपने नज़दीकी थाने जाएँ।',
  },
  remote_app: {
    en: 'Hang up. Do not install any app or share your screen. If you already did, uninstall it and call your bank.',
    hi: 'फ़ोन काट दें। कोई ऐप न डालें और स्क्रीन शेयर न करें। अगर कर चुके हैं तो ऐप हटाएँ और बैंक को फ़ोन करें।',
  },
  call_merge: {
    en: 'Do not merge the call. Hang up. Scammers use call merging to listen in when your bank calls you with an OTP.',
    hi: 'कॉल मर्ज न करें। फ़ोन काट दें। ठग कॉल मर्ज करवाकर तब सुन लेते हैं जब बैंक आपको OTP का कॉल करता है।',
  },
  secret_request: {
    en: 'Do not share the code or card details. Hang up and call your bank on the number printed on your card.',
    hi: 'कोड या कार्ड की जानकारी न बताएँ। फ़ोन काटें और कार्ड पर छपे नंबर पर बैंक को फ़ोन करें।',
  },
  money_request: {
    en: 'Do not send any money. Hang up and check with the real organisation, using a number you look up yourself.',
    hi: 'कोई पैसा न भेजें। फ़ोन काटें और असली संस्था से खुद ढूँढे हुए नंबर पर पूछें।',
  },
  block_threat: {
    en: 'Do not act on this call. Hang up and check your account or SIM using the official app or the number on your card or bill.',
    hi: 'इस कॉल पर कुछ न करें। फ़ोन काटें और आधिकारिक ऐप या कार्ड/बिल पर छपे नंबर से खाता या सिम जाँचें।',
  },
  secrecy: {
    en: 'Hang up. Real offices never ask you to keep a call secret. Talk to someone you trust.',
    hi: 'फ़ोन काट दें। असली दफ़्तर कॉल को राज़ रखने को नहीं कहते। किसी भरोसेमंद व्यक्ति से बात करें।',
  },
  likely_scam: {
    en: 'Hang up. Do not share any code or card details, and do not send money.',
    hi: 'फ़ोन काट दें। कोई कोड या कार्ड की जानकारी न बताएँ और पैसे न भेजें।',
  },
  warning_signs: {
    en: 'Do not act on this call yet. Hang up and call the organisation back on an official number (from your card, bill or its website).',
    hi: 'अभी इस कॉल पर कुछ न करें। फ़ोन काटें और संस्था को उसके आधिकारिक नंबर (कार्ड, बिल या वेबसाइट से) पर फ़ोन करें।',
  },
  no_clear_signs: {
    en: 'Stay careful. Never share OTPs or PINs, or send money, because of a phone call. If unsure, hang up and call back on an official number.',
    hi: 'सावधान रहें। फ़ोन कॉल पर OTP या पिन न बताएँ और पैसे न भेजें। शक हो तो फ़ोन काटकर आधिकारिक नंबर पर दोबारा बात करें।',
  },
  not_enough_info: {
    en: 'Add more of what the caller said or asked you to do (for example any request for codes, money or an app), then check again.',
    hi: 'कॉल करने वाले ने जो कहा या करने को कहा (जैसे कोड, पैसे या ऐप माँगना) वह और लिखें, फिर दोबारा जाँचें।',
  },
};

export const HELP_LINE = {
  en: 'Already shared details or paid? Call 1930 (national cyber-crime helpline) right away.',
  hi: 'जानकारी दे दी या पैसे भेज दिए? तुरंत 1930 (साइबर अपराध हेल्पलाइन) पर फ़ोन करें।',
};

export function nextStep(verdict, strongIds, lang) {
  if (verdict === 'likely_scam' || verdict === 'warning_signs') {
    const id = NEXT_PRIORITY.find((x) => strongIds.includes(x));
    if (verdict === 'likely_scam') return (NEXT[id] || NEXT.likely_scam)[lang];
    return NEXT.warning_signs[lang];
  }
  return NEXT[verdict][lang];
}

// Explanation used when the AI is unavailable (limited check) or its text is unusable.
export function templateExplanation(verdict, strongIds, flags, lang) {
  const labels = strongIds.map((id) => SIGNAL_LABELS[id][lang]);
  const join = (arr) => arr.join(lang === 'hi' ? '; ' : '; ');
  if (verdict === 'likely_scam' || verdict === 'warning_signs') {
    return lang === 'hi'
      ? `इन शब्दों में ठगी के संकेत दिखे: ${join(labels)}। असली बैंक या पुलिस फ़ोन पर ऐसा नहीं माँगते।`
      : `These words show warning signs: ${join(labels)}. Real banks and police do not ask for this over a phone call.`;
  }
  if (flags?.retelling) {
    return lang === 'hi'
      ? 'यह पहले हुए किसी कॉल की कहानी लगती है, अभी कोई आपसे कुछ माँग नहीं रहा। अगर कोई कोड या पैसे माँगे तो दोबारा जाँचें।'
      : 'This reads like a story about an earlier call, not someone asking you for something now. If a caller does ask for codes or money, check again.';
  }
  if (flags?.meta && !flags?.advisory) {
    return lang === 'hi'
      ? 'ये शब्द ठगी के बारे में बताते हैं (खबर या सलाह), आपसे कुछ माँगते नहीं। इसका मतलब यह नहीं कि कोई कॉल सुरक्षित है।'
      : 'These words talk about scams (news or advice) rather than ask you for something. This does not mean any call is safe.';
  }
  if (flags?.advisory) {
    return lang === 'hi'
      ? 'यह OTP या पिन न बताने की सलाह जैसा लगता है, जो असली बैंक भी कहते हैं। इससे यह साबित नहीं होता कि कॉल असली है।'
      : 'This sounds like advice not to share an OTP or PIN, which real banks also say. It does not prove the call is genuine.';
  }
  if (flags?.doorstep) {
    return lang === 'hi'
      ? 'दरवाज़े पर डिलीवरी के लिए OTP माँगना सामान्य हो सकता है, पर तभी बताएँ जब आपने ऑर्डर किया हो और व्यक्ति सच में वहाँ हो।'
      : 'An OTP for a delivery at your door can be normal, but only give it if you ordered something and the person is really there.';
  }
  if (verdict === 'no_clear_signs') {
    return lang === 'hi'
      ? 'इन शब्दों में OTP/पिन, पैसे, ऐप, धमकी या राज़ रखने की आम ठगी वाली माँगें नहीं दिखीं। इसका मतलब यह नहीं कि कॉल सुरक्षित है।'
      : 'We did not see the usual scam requests here (OTP or PIN, money, an app, threats or secrecy). This does not mean the call is safe.';
  }
  return lang === 'hi'
    ? 'इतने शब्दों से कुछ कहना मुश्किल है।'
    : 'There is not enough text to judge.';
}

export const VERDICT_TITLE = {
  likely_scam: { en: 'Very likely a scam', hi: 'बहुत संभव है कि यह ठगी है' },
  warning_signs: { en: 'Warning signs. Be careful', hi: 'ठगी के संकेत हैं। सावधान रहें' },
  no_clear_signs: { en: 'No clear warning signs in these words', hi: 'इन शब्दों में ठगी के साफ़ संकेत नहीं दिखे' },
  not_enough_info: { en: 'Not enough to tell', hi: 'इतने से कुछ कहना मुश्किल है' },
};
