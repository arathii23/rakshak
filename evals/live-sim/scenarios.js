// Scripted phone calls for the Live Guard simulation. Each entry is what the speech recogniser would hand back for
// consecutive 8-second chunks of a call heard on speaker (both sides mixed, no speaker labels, little punctuation).
// All calls are invented. "genuine" calls must never raise an alert; "ambiguous" ones may raise a warning but never
// "very likely a scam"; "scam" calls should raise an alert as early as possible.
export const SCENARIOS = [
  { id: 'L01', label: 'genuine', lang: 'en', title: 'son calls father after landing', chunks: [
    'hello papa how are you i am calling to tell you that we reached delhi safely the flight was on time',
    'oh good beta did you eat anything on the way yes papa we had lunch at the airport mummy is asking about your medicines',
    'tell her i have taken them today also the doctor said the next check up is on the fifteenth i will go with your uncle',
    'okay good then i will call you again in the evening take care of your health bye papa bye beta',
  ] },
  { id: 'L02', label: 'genuine', lang: 'en', title: 'bank branch appointment', chunks: [
    'hello sir main hdfc bank branch se bol rahi hoon aapne kal home loan ke baare mein enquiry ki thi',
    'haan ji bataiye mujhe documents ke baare mein puchna tha ji aap branch aa jaiye saath mein aadhaar aur pan laana',
    'kal subah das baje se pehle aa jaiye manager sahab milenge koi charge nahi hai sirf documents dikhane hain',
    'theek hai main kal aa jaunga dhanyavaad aapka din shubh ho',
  ] },
  { id: 'L03', label: 'genuine', lang: 'en', title: 'class teacher (Hindi)', chunks: [
    'नमस्ते मैं आपके बेटे की क्लास टीचर बोल रही हूँ आज उसने मैथ्स की परीक्षा में बहुत अच्छे नंबर लिए हैं',
    'अरे वाह यह तो बहुत अच्छी खबर है मैम उसे और मेहनत करने को कहिए जी बिल्कुल',
    'और हाँ शुक्रवार को अभिभावक बैठक है आप ग्यारह बजे तक स्कूल आ जाइएगा ठीक है मैं ज़रूर आऊँगा धन्यवाद',
  ] },
  { id: 'L04', label: 'genuine', lang: 'en', title: 'clinic confirms appointment', chunks: [
    'hello main dr sharma ke clinic se bol raha hoon aapka kal ka appointment confirm karna tha shaam paanch baje ka',
    'haan ji confirm hai mujhe saath mein kuch lana hai kya purani reports le aaiye aur khaali pet aana hai',
    'theek hai main subah kuch nahi khaunga ji bahut dhanyavaad',
  ] },
  { id: 'L05', label: 'genuine', lang: 'en', title: 'bank fraud team blocks a card the customer did not use', chunks: [
    'hello sir this is a call from axis bank fraud monitoring team we noticed a transaction of four thousand rupees at a store in pune',
    'no i did not make that payment i am in delhi right now okay sir we have blocked the card for your safety',
    'you will receive a new card at your address in seven days and we will never ask for your pin or otp thank you sir',
  ] },
  { id: 'L06', label: 'genuine', lang: 'en', title: 'electricity board maintenance notice (Hindi)', chunks: [
    'नमस्ते यह बिजली विभाग से सूचना है कल सुबह दस बजे से दोपहर दो बजे तक आपके इलाके में रखरखाव का काम होगा',
    'इस वजह से बिजली बंद रहेगी असुविधा के लिए खेद है अधिक जानकारी के लिए आप हमारी वेबसाइट देख सकते हैं',
  ] },
  { id: 'L07', label: 'ambiguous', lang: 'en', title: 'delivery partner at the door', chunks: [
    'hello sir this is the delivery partner from amazon i am at your gate with your package',
    'oh yes i am coming down one minute please share the delivery code when you hand over the parcel i have it here',
    'okay sir here you go the code on the message is fine thanks have a good day sir',
  ] },
  { id: 'L08', label: 'ambiguous', lang: 'en', title: 'aunt asks for money for repairs', chunks: [
    'beta main teri maasi bol rahi hoon tere papa ne bola tha tu paise bhej dega mere ghar ki marammat ke liye',
    'haan maasi papa ne bataya tha kitne bhejne hain paanch hazaar bhej dena abhi tere papa ke account se hi aaya tha na',
    'ji maasi main aaj shaam ko aapke account mein bhej dunga aap number message kar dijiye theek hai beta khush raho',
  ] },
  { id: 'L09', label: 'scam', lang: 'en', title: 'digital arrest', chunks: [
    'hello main mumbai cyber crime branch se inspector verma bol raha hoon kya aap rajesh kumar bol rahe hain',
    'ji haan boliye aapke naam se ek parcel pakda gaya hai jisme drugs aur fake passport mile hain aapke aadhaar se booking hui hai',
    'sir main to koi parcel nahi bheja ye galti hai ye ek serious case hai aap abhi video call par aaiye aur kisi ko mat batana',
    'aapko digital arrest mein rakha ja raha hai call mat kaatna aur jaanch ke liye paanch lakh rupaye is safe account mein transfer kijiye',
  ] },
  { id: 'L10', label: 'scam', lang: 'en', title: 'credit card limit and a code', chunks: [
    'good afternoon sir i am calling from sbi credit card department your card limit has been increased',
    'oh okay thank you what do i need to do nothing sir just verify your identity we have sent a code to your phone',
    'please read out the six digit code you just received so that we can activate the new limit it will take only a minute',
  ] },
  { id: 'L11', label: 'scam', lang: 'en', title: 'SIM KYC (Hindi)', chunks: [
    'नमस्ते मैं ट्राई से बोल रहा हूँ आपके नंबर की केवाईसी पूरी नहीं है आज रात बारह बजे आपका सिम बंद हो जाएगा',
    'अरे यह तो गलत है मैंने तो केवाईसी करवाई थी जी हमारे रिकॉर्ड में नहीं है आप अभी एक ऐप डाउनलोड कीजिए जो मैं भेज रहा हूँ',
    'उसमें अपना आधार नंबर और जो ओटीपी आएगा वो डालिए वरना सिम बंद और केस भी दर्ज होगा',
  ] },
  { id: 'L12', label: 'scam', lang: 'en', title: 'refund and call merging', chunks: [
    'hello sir main flipkart customer care se bol raha hoon aapka refund process hona hai',
    'achha ji haan aapko ek verification call aayegi aap mere call ko us call ke saath merge kar dijiye',
    'bas merge kar dijiye aur jo code aaye wo bata dijiye refund turant aa jayega',
  ] },
  { id: 'L13', label: 'scam', lang: 'en', title: 'son in trouble', chunks: [
    'hello papa it is me rohan i am in trouble my phone fell so this is a friend number',
    'what happened beta i had an accident and the police are asking for money i need fifty thousand rupees right now please send to this number',
    'please do not tell mummy she will get worried i will explain everything later just send it quickly',
  ] },
];
