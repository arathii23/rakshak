// Rule-based checks for what a caller said. Works on Hindi (Devanagari), Hinglish (Roman) and English.
// Used (a) always, to find exact suspicious phrases, and (b) alone as a clearly-labelled limited check
// when the AI service is unavailable.
//
// Design: a single word like "OTP" or "police" is never a scam signal. A signal needs a DEMAND or THREAT
// pattern (e.g. "OTP batao", "share your OTP", "account will be blocked"). Warnings NOT to share an OTP,
// and a delivery person at the door, are recognised and suppressed.

const LET = String.raw`\p{L}\p{M}\p{N}`;
const wb = (s) => String.raw`(?<![${LET}])(?:${s})(?![${LET}])`;
const gap = (n) => String.raw`(?:\s+[^\s]+){0,${n}}?\s+`;
const re = (src) => new RegExp(src, 'giu');

// ---------- vocabulary ----------
const SECRET_NOUN = [
  String.raw`o\.?\s?t\.?\s?p\.?`, String.raw`one[- ]time[- ]pass(?:word|code)`, String.raw`pin(?!\s?code)`,
  String.raw`upi\s+pin`, String.raw`atm\s+pin`, 'cvv', 'cvc', 'password', 'passcode',
  String.raw`card\s+(?:number|no\.?|details?)`, String.raw`verification\s+code`, String.raw`security\s+code`,
  String.raw`net\s?banking\s+(?:id|password)`, String.raw`aa?dh?a+r\s+(?:number|otp)`,
  String.raw`access\s+code`, String.raw`card\s+(?:ki|ka|ke)\s+(?:detail|details|jaankari|number)`,
  // a code described without the word "OTP": "the six numbers that just came on your phone", "wo code jo aapke phone par aayega"
  String.raw`(?:6|six)[- ]?(?:digits?|numbers)(?:\s+(?:ka|ke|ki|of|the)\s+(?:code|number|otp))?`,
  String.raw`(?:छह|छः|६|6)\s+अंकों?(?:\s+(?:के|का|की)\s+(?:कोड|नंबर))?`,
  String.raw`code(?=\s+(?:[^\s]+\s+){0,3}?(?:jo|that|which|जो)\s+(?:[^\s]+\s+){0,6}?(?:aayega|ayega|aaya|aaye|aata|came|come|sent|received|आएगा|आयेगा|आया|आए|भेजा))`,
  'ओटीपी', String.raw`ओ\.?\s?टी\.?\s?पी\.?`, 'पिन', 'सीवीवी', 'पासवर्ड',
  String.raw`कार्ड\s+(?:नंबर|का\s+नंबर|डिटेल)`, String.raw`वेरिफिकेशन\s+कोड`, String.raw`आधार\s+(?:नंबर|ओटीपी)`,
].join('|');

// Hindi/Hinglish word order: NOUN ... VERB ("OTP batao")
const DEMAND_AFTER = [
  String.raw`bata(?:o|iye|iyie|ye|na|do|dena|dijiye|dijiyega|iyega|yein|yen|en|e)`, 'batao', String.raw`bol(?:o|iye)?`,
  String.raw`bol\s+(?:do|dijiye)`,
  String.raw`(?:share|send)\s*(?:kar|karo|kijiye|kariye|karein|karen|krdo|kr)(?:\s+(?:do|dijiye|dena))?`,
  String.raw`bhej(?:o|iye|iyie|na)?`, String.raw`bhej\s+(?:do|dijiye|dena)`,
  String.raw`de\s*do`, 'dedo', 'dijiye', 'dijiyega', 'dena', 'dein', String.raw`de\s+dijiye`,
  'chahiye', 'chahie', 'zaroori', String.raw`maang\w*`, String.raw`mang\w*`, String.raw`puch\w*`, String.raw`pooch\w*`,
  String.raw`(?:confirm|verify|enter)\s*(?:kar|karo|kijiye)`, String.raw`read\s*(?:it\s+|that\s+|this\s+)?out`, String.raw`bata\s+(?:do|dijiye|dena|dijiyega)`,
  'बताओ', 'बताइए', 'बताइये', 'बताएं', 'बताएँ', String.raw`बता\s+दो`, String.raw`बता\s+दीजिए`, 'बताना', 'बोलो',
  String.raw`बोल\s+दो`, String.raw`शेयर\s+(?:करो|कीजिए|करें|कर\s+दो)`, 'भेजो', 'भेजिए', String.raw`भेज\s+दो`,
  String.raw`d[aā]{1,2}l(?:o|iye|iyie|na|ein|en|do|dijiye|dijiyega)`, 'डालिये',
  'दो', 'दीजिए', 'दीजिये', 'दें', 'देना', 'डालो', 'डालिए', 'चाहिए', String.raw`मांग\w*`, String.raw`पूछ\w*`,
].join('|');

// English word order: VERB ... NOUN ("share your OTP")
const VERB_BEFORE = [
  'share', 'send', 'give', 'tell', 'provide', 'enter', 'confirm', 'verify', String.raw`read(?:\s+out)?`,
  'need', 'require', 'want', String.raw`ask(?:ing|ed)?\s+for`, String.raw`request(?:ing)?`, 'dictate',
  String.raw`bata(?:o|do)`,
].join('|');

// Advisory context: "never share", "mat batayein", "kabhi nahi maangta" ...
const ADVISORY = re(
  wb(
    [
      'never', String.raw`do\s+not`, "don'?t", 'dont', String.raw`should\s+not`, "shouldn'?t", String.raw`must\s+not`,
      String.raw`not\s+to`, "won'?t", String.raw`will\s+not`, 'kabhi', 'kabhee', 'mat', 'nahi', 'nahin', 'nhi',
      String.raw`no\s+one`, String.raw`na\s+(?:bata\w*|share|de|dijiye|den|dein|karein|karen)`,
      'कभी', 'मत', 'नहीं', 'नही', String.raw`न\s+(?:बताएं|बताएँ|दें|बताइए|शेयर|करें)`,
      // advice that starts "if someone asks ...": a description of what to do, not a demand
      String.raw`if\s+(?:a\s+|an\s+|any\s+|some\s+)?(?:someone|anyone|somebody|anybody|caller|person|request|call|message|link|one)`,
      String.raw`agar\s+(?:koi|kisi)`, String.raw`अगर\s+(?:कोई|किसी)`, String.raw`जब\s+कोई`, String.raw`जो\s+कोई`,
      'beware', String.raw`be\s+careful`, 'savdhan', 'सावधान', 'decline', 'refuse',
    ].join('|'),
  ),
);

// A delivery person or a cab driver who is physically there and asks for the delivery OTP or the ride PIN is normal.
const DELIVERY = re(wb(String.raw`deliver\w*|courier|parcel|package|packet|order|rider|cab|taxi|ride|driver|uber|ola|rapido|डिलीवरी|कूरियर|पार्सल|ऑर्डर|ड्राइवर`));
const AT_DOOR = re(
  String.raw`(?<![${LET}])(?:door|gate|downstairs|outside|neeche|niche|bahar|darwaz[ae]|darwaja|building|society|pahunch\w*|pahonch\w*|aa\s+gay[ae]|arriv\w*|pick-?up|boarding|sit|seated|दरवाज[ेा]|दरवाज़[ेा]|गेट|नीचे|बाहर|पहुँच\w*|पहुंच\w*|आ\s+गया|आ\s+गए)(?![${LET}])`,
);

const OFFICIAL = re(
  String.raw`official\s+(?:app|website|site|portal|office|number|channel)|(?:bank|branch|office|counter|police\s+station|station|school|college|hospital|ward|desk)\s+(?:me|mein|par|pe|jaakar|jakar|jaake|aakar|visit)|visit\s+(?:the|your|a|nearest|any)|nearest\s+(?:branch|office|police|counter)|at\s+the\s+(?:counter|reception|office|branch|desk|ward|school)|in\s+person|(?:play|app)\s*store|cash\s+on\s+delivery|(?<![${LET}])cod(?![${LET}])|ऑफिशियल|आधिकारिक|शाखा|थाने|थाना|कार्यालय|दफ़?्तर|ऑफिस\s+(?:में|मे|जाकर|आकर)|काउंटर`,
);

// Someone describing a call that already happened ("a bank person called me asking for my OTP ... I told him no").
// Only used when the demand sits next to a first-person word ("my OTP") and no second-person word ("your OTP").
const RETELLING = re(
  wb(
    [
      String.raw`(?:called|phoned|rang|messaged|texted)\s+(?:me|us)`, String.raw`(?:i|we)\s+(?:told|said\s+to)\s+(?:him|her|them|the\s+caller)`,
      String.raw`(?:call|phone|fone|message|msg|sms)\s+(?:aaya|aya|aayi|aai|kiya|kiye)\s+(?:tha|thi|the)`,
      String.raw`(?:maine|humne|hamne)\s+(?:usse|unse|unko|use|unhe|us\s+se|un\s+se)\s+(?:kaha|bola|bataya)`,
      String.raw`(?:कॉल|फोन|फ़ोन|मैसेज)\s+(?:आया|आई|किया|किए)\s+(?:था|थी|थे)`, String.raw`(?:मैंने|हमने)\s+(?:उसे|उन्हें|उनसे|उससे)\s+(?:कहा|बोला|बताया)`,
    ].join('|'),
  ),
);
const FIRST_PERSON = re(wb(String.raw`my|mine|me|i|we|our|mera|meri|mere|mujhe|mujhse|mujhko|humein|hamara|मेरा|मेरी|मेरे|मुझे|मुझसे|हमें|हमारा`));
const SECOND_PERSON = re(
  wb(String.raw`you|your|yours|aap|aapka|aapki|aapke|aapko|aapse|tum|tumhara|tumhare|tumhari|tumse|आप|आपका|आपकी|आपके|आपको|आपसे|तुम|तुम्हारा|तुम्हारे|तुम्हारी`),
);
// Talk about scams (news, awareness) rather than a scam: plural or abstract words, so "this is not a scam" does not count.
const META_SCAM = re(
  wb(String.raw`scams|frauds|fraudsters|awareness|beware|advisory|ठगी|धोखाधड़ी|जागरूक\w*|सावधान|सतर्क|savdhan|jagruk|sachet|thagi|dhokhadhadi`),
);


const MONEY_WORDS = String.raw`rupees?|rupaye|rupay|inr|lakhs?|lacs?|hazaar|hajaar|thousand|paise|paisa|money|amount|funds?|fees?|fine|penalty|charges?|deposit|jurmana|bail|settlement|पैसे|पैसा|रुपये|रुपए|राशि|लाख|हज़ार|हजार|जुर्माना|फीस|शुल्क|जमानत`;
const MONEY_OBJ = String.raw`(?:${wb(MONEY_WORDS)}|₹\s?\d+|(?<![${LET}])rs\.?\s?\d+|\d{3,})`;
const MONEY_TARGET = wb(
  String.raw`account|a/c|upi|qr\s*code|qr|gpay|google\s*pay|phonepe|paytm|wallet|khata|khate|खाते|खाता|अकाउंट|यूपीआई`,
);
const MONEY_IMPER = wb(
  [
    String.raw`transfer\s*(?:kar|karo|kijiye|kariye|karein|karen|krdo)(?:\s+do)?`, String.raw`please\s+transfer`,
    String.raw`transfer\s+(?:the|this|that|your)`, String.raw`send\s+(?:the\s+)?(?:money|amount|funds|payment)`,
    String.raw`send\s+(?:me|us)`, String.raw`send\s+(?:₹|rs\.?\s?|inr\s?)?\d+`, String.raw`bhej(?:o|iye|iyie|na)`, String.raw`bhej\s+(?:do|dijiye|dena)`,
    String.raw`jama\s*(?:kar|karo|kijiye|karwa|karna)`, String.raw`deposit\s*(?:kar|karo|kijiye|the|this|karna)`,
    String.raw`pay\s+(?:the|a|an|this|that|your)`, String.raw`pay\s*(?:kar|karo|kijiye|karna)`,
    String.raw`make\s+(?:the\s+|a\s+)?payment`,
    String.raw`payment\s*(?:kar|karo|kijiye|karein)`, 'bharo', 'bhariye', 'bharna',
    'भेजो', 'भेजिए', String.raw`भेज\s+दो`, String.raw`ट्रांसफर\s*(?:कर|करो|कीजिए|करें|करना)`,
    String.raw`जमा\s*(?:कर|करो|कीजिए|करें|करवा|करना)`, 'भरो', 'भरिए', 'भरना', String.raw`भुगतान\s+करें`,
    // "you need to pay", "jama karne honge", "डालनी होगी": a payment put as an obligation
    String.raw`(?:need|needs|have|has|must|required|supposed|will\s+have)\s+(?:to\s+)?(?:pay|deposit|send|transfer|remit)`,
    String.raw`(?:jama\s+karn[aei]|jama\s+karwan[aei]|deposit\s+karn[aei]|bharn[aei]|bhejn[aei]|dena|deni|daaln[aei]|dalni|transfer\s+karn[aei]|pay\s+karn[aei])\s+(?:hoga|hogi|honge|padega|padegi|padenge)`,
    String.raw`(?:जमा\s+करन[ाेी]|भरन[ाेी]|भेजन[ाेी]|देन[ाेी]|डालन[ाेी]|ट्रांसफर\s+करन[ाेी])\s+(?:होगा|होगी|होंगे|पड़ेगा|पड़ेगी|पड़ेंगे)`,
  ].join('|'),
);
const MONEY_PHRASE = wb(
  [
    String.raw`safe\s+account`, String.raw`सुरक्षित\s+खाता`, String.raw`(?:processing|registration|clearance|release|customs)\s+(?:fee|duty|charges?)`,
    String.raw`pay\s+(?:₹\s?|rs\.?\s?|inr\s?)?\d[\d,]*(?:\s+(?:rupees?|rs|rupaye|lakhs?|hazaar|thousand))?`,
    String.raw`verification\s+(?:fee|amount)`, String.raw`(?:buy|purchase|get|kharid\w*)\s+(?:[^\s]+\s+){0,4}?(?:gift|google\s+play|itunes|amazon)\s+(?:gift\s+)?cards?`,
    String.raw`(?:gift|google\s+play|itunes)\s+cards?\s+(?:ke\s+|ka\s+|ki\s+|the\s+|of\s+the\s+)?codes?`,
    // "approve the collect request": receiving money never needs an approval or a PIN
    String.raw`(?:accept|approve|एक्सेप्ट)\s*(?:kar\w*\s+)?(?:[^\s]+\s+){0,3}?(?:request|रिक्वेस्ट)`,
    String.raw`(?:request|रिक्वेस्ट)(?:\s+[^\s]+){0,8}?\s+(?:accept|approve|एक्सेप्ट)`,
    String.raw`जुर्माना\s+(?:भरो|भरना|भरें|देना)`, String.raw`fine\s+(?:bharo|pay|jama)`,
    String.raw`(?:galti\s+se|by\s+mistake)(?:\s+[^\s]+){0,6}?\s+(?:wapas|return|back|वापस|लौटा\w*)`,
  ].join('|'),
);

const REMOTE_NAMED = wb(
  String.raw`any\s?desk|team\s?viewer|quick\s?support|rust\s?desk|ultra\s?viewer|ammyy|एनी\s?डेस्क|टीम\s?व्यूअर|क्विक\s?सपोर्ट`,
);
const REMOTE_GENERIC = [
  String.raw`screen\s*shar(?:e|ing)`, String.raw`share\s+your\s+screen`, String.raw`स्क्रीन\s*शेयर`,
  String.raw`(?<![${LET}])\w+\.apk(?![${LET}])`, String.raw`apk\s+file`,
  String.raw`install\s+(?:this|the|an?|our)?\s*(?:[^\s]+\s+){0,2}?(?:app|application|software|program|apk)`, String.raw`app\s+install\s*(?:kar|karo|kijiye)`,
  String.raw`download\s+(?:this|the|an?|our)?\s*(?:[^\s]+\s+){0,2}?(?:app|application|software|program|apk)`, String.raw`app\s+download\s*(?:kar|karo|kijiye)`,
  String.raw`(?:link|लिंक)\s*(?:par|pe|पर|पे)?\s*click`, String.raw`ऐप\s+(?:डाउनलोड|इंस्टॉल)\s*(?:कर|कीजिए|करें)`,
].join('|');

const ARREST_PHRASE = wb(
  [
    String.raw`arrest\s+warrant`, String.raw`you\s+(?:will\s+be|are)\s+(?:arrested|under\s+arrest)`, String.raw`giraft+ar\w*`,
    'गिरफ्तार\\w*', 'गिरफ़्तार\\w*', String.raw`(?:case|fir)\s+(?:darj|register(?:ed)?)`, String.raw`(?:केस|मामला|एफआईआर|FIR)\s+दर्ज`,
    String.raw`money\s+laundering`, String.raw`मनी\s+लॉन्ड्रिंग`, String.raw`drugs?\s+(?:parcel|package|mila|found|pakda)`,
    'narcotics', 'ड्रग्स', String.raw`(?:legal|police)\s+action`, String.raw`कानूनी\s+कार्रवाई`, String.raw`(?:court|legal)\s+(?:notice|summons?)`,
    'सम्मन', 'जेल', 'jail',
  ].join('|'),
);
const ARREST_NAME_A = wb(String.raw`case|fir|केस|एफआईआर|मामला|complaint|warrant|वारंट`) +
  gap(5) + wb(String.raw`aapke|aap\s*ke|your|against\s+you|tumhare|आपके|आप\s+के`) + String.raw`(?:\s+[^\s]+){0,2}?\s*` +
  wb(String.raw`naam|name|khilaf|khilaaf|नाम|खिलाफ|ख़िलाफ़|against`);
const ARREST_AGAINST = wb(String.raw`case|fir|complaint|warrant|एफआईआर|केस|वारंट`) + gap(6) + wb(String.raw`against\s+you`);
const ARREST_NAME_B = wb(String.raw`aapke|आपके`) + String.raw`\s+` + wb(String.raw`naam|नाम`) + String.raw`\s+` +
  wb(String.raw`par|pe|पर|पे`) + String.raw`\s+` + wb(String.raw`case|fir|केस|एफआईआर|वारंट|warrant`);
const DIGITAL_ARREST = wb(String.raw`digital\s+arrest|डिजिटल\s+अरेस्ट|डिजिटल\s+गिरफ्तार\w*`);

// Call merging: the caller asks you to merge/conference another call in, so that the bank's OTP call to you is heard by them.
const CALL_MERGE = wb(
  [
    String.raw`merge\s+(?:the\s+|this\s+|that\s+|my\s+|your\s+|ye\s+|is\s+|a\s+|an\s+|any\s+|another\s+)?(?:call|calls|number)`,
    String.raw`(?:call|calls|कॉल)\s+(?:ko\s+|को\s+)?(?:[^\s]+\s+){0,7}?merge`,
    String.raw`merge\s+(?:kar|karo|kijiye|kariye|karein|krdo|kardo)\w*`,
    String.raw`(?:कॉल|फोन)\s+(?:को\s+)?(?:[^\s]+\s+){0,7}?मर्ज`, String.raw`मर्ज\s+(?:कर|करो|कीजिए|करें)\w*`,
    String.raw`(?:add|join)\s+(?:this|that|the|my)\s+(?:call|number)\s+(?:to|in|with)\s+(?:your|this|the)\s+call`,
  ].join('|'),
);

const BLOCK_NOUN = String.raw`account|a/c|sim|card|number|kyc|aadhaar|aadhar|pan|khata|connection|bijli|electricity|power|खाता|अकाउंट|सिम|कार्ड|नंबर|आधार|पैन|केवाईसी|कनेक्शन|बिजली`;
const BLOCK_STATE = String.raw`blocked|block|band|suspended|suspend|freeze|frozen|deactivated|expire\w*|disconnect\w*|kat|cut|बंद|ब्लॉक|सस्पेंड|फ्रीज|एक्सपायर\w*|कट|कटेगा`;
const BLOCK_FUTURE = String.raw`will\s+be|ho\s+jayeg[ai]|ho\s+jaeg[ai]|jayeg[ai]|hoga|hogi|जाएगा|जाएगी|हो\s+जाएगा|हो\s+जाएगी|होगा|होगी|today|tonight|aaj`;
const BLOCK_A = wb(BLOCK_NOUN) + gap(5) + wb(BLOCK_STATE) + String.raw`(?:\s+[^\s]+){0,3}?\s+` + wb(BLOCK_FUTURE);
const BLOCK_B = wb(BLOCK_NOUN) + gap(5) + wb(BLOCK_FUTURE) + String.raw`(?:\s+[^\s]+){0,3}?\s+` + wb(BLOCK_STATE);

const SECRECY = [
  String.raw`(?:kisi|kisiko|किसी)\s*(?:ko|को)?\s*(?:(?:ye|yeh|ise|is|ये|यह|इस)\s+(?:baat|bat|बात)\s+)?(?:bhi\s+|भी\s+)?(?:mat|na|nahi|नहीं|मत|न)\s+(?:bata\w*|bol\w*|tell|बताना|बताएं|बताइए|बोलना)`,
  String.raw`(?:papa|mummy|mom|dad|pitaji|ghar\s+walon?|family|पापा|मम्मी|घर\s+वालों)\s+(?:ko|से)\s+(?:abhi\s+|अभी\s+)?(?:mat|na|मत)\s+(?:bata\w*|bol\w*|tell|बताना|बताएं|बोलना)`,
  String.raw`(?:call|कॉल|phone|फोन|video\s+call)\s+(?:par|pe|पर|पे)\s+(?:bane|bani|बने)\s+(?:rahiye|rahna|rahein|रहिए|रहें|रहना)`,
  String.raw`(?:don'?t|do\s+not|must\s+not|should\s+not|never)\s+(?:tell|inform|speak\s+to|talk\s+to)\s+(?:anyone|anybody|your\s+family|family|mom|mum|dad|mummy|papa|parents)`,
  String.raw`keep\s+(?:this|it)\s+(?:a\s+)?(?:secret|confidential)`, String.raw`tell\s+no\s+one`,
  String.raw`(?:video\s+)?call\s+(?:mat|na)\s+(?:kaat\w*|kato|katna|disconnect|cut)`,
  String.raw`don'?t\s+(?:hang\s+up|disconnect|cut\s+the\s+call)`, String.raw`stay\s+on\s+(?:the\s+)?(?:call|line|video\s+call)`,
  String.raw`(?:phone|फोन|कॉल|call)\s+(?:मत|mat)\s+(?:काटना|काटिए|kaatna)`,
  String.raw`video\s+call\s+(?:par|pe)\s+(?:rahiye|rahna|bane\s+rahiye|rahein)`, String.raw`लाइन\s+पर\s+बने\s+रहिए`,
].join('|');

const AUTHORITY = wb(
  [
    'cbi', String.raw`c\.b\.i`, String.raw`enforcement\s+directorate`, 'ncb', 'customs', 'trai', 'rbi', String.raw`reserve\s+bank`,
    String.raw`income\s*tax`, String.raw`cyber\s*(?:crime|cell|police)`, String.raw`crime\s*branch`, 'police', 'inspector',
    'officer', 'court', 'judge', String.raw`bank(?:\s+(?:manager|officer|executive|security))?`, 'sbi', 'hdfc', 'icici', 'axis',
    'कस्टम', 'सीबीआई', 'पुलिस', String.raw`क्राइम\s*ब्रांच`, 'साइबर', 'आयकर', String.raw`इनकम\s*टैक्स`, 'ट्राई', 'आरबीआई',
    'अधिकारी', 'इंस्पेक्टर', 'कोर्ट', 'बैंक',
  ].join('|'),
);
const URGENCY = wb(
  [
    'immediately', String.raw`right\s+now`, String.raw`right\s+away`, 'urgent(?:ly)?', String.raw`within\s+\d+\s*(?:hours?|minutes?|mins?)`,
    String.raw`today\s+itself`, 'abhi', 'turant', 'jaldi', 'foran', String.raw`aaj\s+hi`, 'अभी', 'तुरंत', 'फौरन', 'जल्दी',
    String.raw`आज\s+ही`, 'तत्काल', String.raw`इसी\s+वक्त`,
  ].join('|'),
);
const PRIZE = wb(
  String.raw`lottery|kbc|lucky\s+draw|you\s+(?:have\s+)?won|prize|inaam|लॉटरी|केबीसी|इनाम|guaranteed\s+returns?|double\s+(?:your\s+)?money|paisa\s+double|पैसा\s+दोगुना`,
);

// ---------- rule table ----------
// id: stable category. weight: contribution to the score (one per category, highest weight). kind: strong|note.
export const RULES = [
  {
    id: 'secret_request', kind: 'strong', weight: 1,
    patterns: [re(wb(SECRET_NOUN) + gap(4) + wb(DEMAND_AFTER)), re(wb(VERB_BEFORE) + gap(4) + wb(SECRET_NOUN))],
    suppress: ['advisory', 'doorstep', 'retelling'],
  },
  {
    id: 'money_request', kind: 'strong', weight: 1,
    patterns: [
      re(MONEY_IMPER + gap(6) + `(?:${MONEY_OBJ}|${MONEY_TARGET})`),
      re(`(?:${MONEY_OBJ}|${MONEY_TARGET})` + gap(6) + MONEY_IMPER),
      re(MONEY_PHRASE),
    ],
    suppress: ['official', 'retelling'],
  },
  { id: 'remote_app', kind: 'strong', weight: 2, firm: true, patterns: [re(REMOTE_NAMED)], suppress: ['advisory', 'retelling', 'meta'] },
  { id: 'remote_app', kind: 'strong', weight: 1, patterns: [re(REMOTE_GENERIC)], suppress: ['official', 'retelling'] },
  // firm: a signal that almost never appears in an honest call, so the AI's "no clear signs" cannot veto it.
  { id: 'digital_arrest', kind: 'strong', weight: 2, firm: true, patterns: [re(DIGITAL_ARREST)], suppress: ['advisory', 'retelling', 'meta'] },
  { id: 'call_merge', kind: 'strong', weight: 1, firm: true, patterns: [re(CALL_MERGE)], suppress: ['advisory', 'retelling', 'meta'] },
  { id: 'arrest_threat', kind: 'strong', weight: 1, patterns: [re(ARREST_PHRASE), re(ARREST_NAME_A), re(ARREST_NAME_B), re(ARREST_AGAINST)], suppress: ['retelling'] },
  { id: 'block_threat', kind: 'strong', weight: 1, patterns: [re(BLOCK_A), re(BLOCK_B)], suppress: ['retelling'] },
  { id: 'secrecy', kind: 'strong', weight: 1, patterns: [re(SECRECY)], suppress: ['secret_in_clause', 'retelling'] },
  { id: 'authority', kind: 'note', weight: 0, patterns: [re(AUTHORITY)], suppress: [] },
  { id: 'urgency', kind: 'note', weight: 0, patterns: [re(URGENCY)], suppress: [] },
  { id: 'prize', kind: 'note', weight: 0, patterns: [re(PRIZE)], suppress: [] },
];

// ---------- helpers ----------
const tokensBefore = (text, idx, n) => {
  const m = text.slice(0, idx).match(new RegExp(String.raw`(?:[^\s]+\s+){0,${n}}$`, 'u'));
  return m ? m[0] : '';
};
const tokensAfter = (text, idx, n) => {
  const m = text.slice(idx).match(new RegExp(String.raw`^(?:\s+[^\s]+){0,${n}}`, 'u'));
  return m ? m[0] : '';
};
const windowText = (text, s, e, before, after) => tokensBefore(text, s, before) + text.slice(s, e) + tokensAfter(text, e, after);
const test = (rx, s) => { rx.lastIndex = 0; return rx.test(s); };

export function normalize(text) {
  // Length-preserving: indices in the normalised text equal indices in the original.
  return String(text).replace(/[‘’ʼ]/g, "'").replace(/[ ​]/g, ' ');
}

/** True when the text is about someone at the door or in the cab (a delivery person, a driver): an OTP or PIN is normal there. */
export function hasDoorstepContext(rawText) {
  const t = normalize(rawText);
  return test(DELIVERY, t) && test(AT_DOOR, t);
}

export function wordCount(text) {
  return (String(text).trim().match(/[^\s]+/gu) || []).length;
}

/** Run all rules. Returns signals with exact spans in `text`. */
// A demand that sits next to "my OTP" / "mera OTP" (not "your OTP") inside a story about a past call.
const isRetelling = (text, s, e) => {
  const near = windowText(text, s, e, 3, 3);
  if (!test(FIRST_PERSON, near) || test(SECOND_PERSON, near)) return false;
  return test(RETELLING, windowText(text, s, e, 12, 12));
};

export function runRules(rawText) {
  const text = normalize(rawText);
  const raw = [];
  const flags = { advisory: false, doorstep: false, official: false, retelling: false, meta: false };

  for (const rule of RULES) {
    for (const rx of rule.patterns) {
      rx.lastIndex = 0;
      for (const m of text.matchAll(rx)) {
        const s = m.index;
        const e = s + m[0].length;
        let suppressed = false;
        if (rule.suppress.includes('advisory') && test(ADVISORY, windowText(text, s, e, 3, 2))) {
          suppressed = true; flags.advisory = true;
        }
        if (!suppressed && rule.suppress.includes('retelling') && isRetelling(text, s, e)) { suppressed = true; flags.retelling = true; }
        if (!suppressed && rule.suppress.includes('meta') && test(META_SCAM, windowText(text, s, e, 8, 8))) { suppressed = true; flags.meta = true; }
        if (!suppressed && rule.suppress.includes('doorstep')) {
          const w = windowText(text, s, e, 12, 12);
          if (test(DELIVERY, w) && test(AT_DOOR, w)) { suppressed = true; flags.doorstep = true; }
        }
        if (!suppressed && rule.suppress.includes('official') && test(OFFICIAL, windowText(text, s, e, 10, 10))) {
          suppressed = true; flags.official = true;
        }
        if (!suppressed && rule.suppress.includes('secret_in_clause')) {
          // "OTP kisi ko mat batana" is advice about the OTP, not secrecy about the call.
          const w = windowText(text, s, e, 4, 2);
          if (test(re(wb(SECRET_NOUN)), w)) suppressed = true;
        }
        if (!suppressed) raw.push({ id: rule.id, kind: rule.kind, weight: rule.weight, firm: !!rule.firm, start: s, end: e, text: rawText.slice(s, e) });
      }
    }
  }

  // De-duplicate overlaps: keep the longer span; same category keeps at most 2 spans.
  raw.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  const signals = [];
  for (const sig of raw) {
    const last = signals[signals.length - 1];
    if (last && sig.start < last.end) {
      if (sig.end - sig.start > last.end - last.start) signals[signals.length - 1] = sig;
      continue;
    }
    if (signals.filter((x) => x.id === sig.id).length >= 2) continue;
    signals.push(sig);
  }

  // Score: one contribution per strong category (highest weight), +1 when an authority is named AND
  // something is demanded (real police/banks do not ask for codes, money or app installs over a call).
  const best = new Map();
  for (const sig of signals) if (sig.kind === 'strong') best.set(sig.id, Math.max(best.get(sig.id) || 0, sig.weight));
  let score = [...best.values()].reduce((a, b) => a + b, 0);
  const hasAuthority = signals.some((s) => s.id === 'authority');
  const hasDemand = ['secret_request', 'money_request', 'remote_app'].some((id) => best.has(id));
  // A text that also gives advice or tells a story about a call is not a caller naming an office and demanding something.
  const authorityBonus = hasAuthority && hasDemand && !flags.advisory && !flags.retelling;
  if (authorityBonus) score += 1;
  const firmIds = [...new Set(signals.filter((s) => s.firm).map((s) => s.id))];

  return { signals, score, strongIds: [...best.keys()], firmIds, authorityBonus, flags };
}

/** Verdict from rules alone. Never "safe": the lowest tier is "no_clear_signs". */
export function rulesVerdict(result, text) {
  if (result.score >= 2) return 'likely_scam';
  if (result.score === 1) return 'warning_signs';
  return wordCount(text) < 5 ? 'not_enough_info' : 'no_clear_signs';
}
