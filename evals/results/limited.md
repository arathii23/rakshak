# Eval results: LIMITED (rules only, no AI)

Run: 2026-11-20T20:03:38.678Z · Cases: 68 · **Passed: 68/68**

All case texts are synthetic (written by Claude for testing), not real calls.

| ID | Group | Expected | Actual | Highlights | Result |
|---|---|---|---|---|---|
| S01 | scam-english | likely_scam | likely_scam | “SBI”, “KYC has expired and your account will be blocked”, “share the OTP”, “immediately” | pass |
| S02 | scam-english | likely_scam | likely_scam | “Pay a customs fee”, “police action” | pass |
| S03 | scam-english | likely_scam | likely_scam | “bank”, “AnyDesk” | pass |
| S04 | scam-english | likely_scam | likely_scam | “bank security”, “tell me your card number” | pass |
| S05 | scam-english | likely_scam / warning_signs | warning_signs | “you won”, “KBC”, “processing fee” | pass |
| S06 | scam-hinglish | likely_scam | likely_scam | “crime branch”, “drugs parcel”, “digital arrest”, “kisi ko mat batana”, “video call par bane rahiye” | pass |
| S07 | scam-hinglish | likely_scam | likely_scam | “police”, “Abhi”, “50000 rupaye is account mein transfer kar do”, “kisi ko mat batana” | pass |
| S08 | scam-hinglish | likely_scam / warning_signs | likely_scam | “TRAI”, “number band ho jayega”, “Abhi”, “Aadhaar number bataiye” | pass |
| S09 | scam-hinglish | likely_scam / warning_signs | likely_scam | “bijli ka connection aaj raat 9:30 baje kat”, “Turant”, “UPI se payment kijiye” | pass |
| S10 | scam-hinglish | likely_scam / warning_signs | likely_scam | “Bank”, “OTP aaya hai wo bata dijiye”, “abhi” | pass |
| S11 | scam-hinglish | likely_scam / warning_signs | warning_signs | “Guaranteed returns”, “paisa double”, “Aaj hi”, “10000 rupaye jama kijiye” | pass |
| S12 | scam-hindi | likely_scam | likely_scam | “सीबीआई”, “आपके नाम पर केस”, “अभी”, “ओटीपी बताइए” | pass |
| S13 | scam-hindi | likely_scam | likely_scam | “एनीडेस्क”, “ऐप डाउनलोड कीजिए” | pass |
| S14 | scam-hindi | likely_scam | likely_scam | “बैंक”, “खाता आज बंद हो जाएगा”, “कार्ड नंबर और सीवीवी बताइए” | pass |
| S15 | scam-hindi | likely_scam / warning_signs | likely_scam | “अभी”, “डिजिटल अरेस्ट” | pass |
| G01 | genuine-advisory | no_clear_signs | no_clear_signs | “Bank” | pass |
| G02 | genuine-advisory | no_clear_signs | no_clear_signs | “bank” | pass |
| G03 | genuine-advisory | no_clear_signs | no_clear_signs | “बैंक” | pass |
| G04 | genuine-advisory | no_clear_signs | no_clear_signs | “bank” | pass |
| G05 | genuine-delivery | no_clear_signs | no_clear_signs | — | pass |
| G06 | genuine-delivery | no_clear_signs | no_clear_signs | — | pass |
| G07 | genuine-service | no_clear_signs | no_clear_signs | — | pass |
| G08 | genuine-service | no_clear_signs | no_clear_signs | — | pass |
| G09 | genuine-service | no_clear_signs | no_clear_signs | “bank” | pass |
| G10 | genuine-service | no_clear_signs | no_clear_signs | “police” | pass |
| G11 | genuine-service | no_clear_signs | no_clear_signs | — | pass |
| G12 | genuine-service | no_clear_signs / warning_signs | no_clear_signs | — | pass |
| G13 | genuine-service | no_clear_signs | no_clear_signs | “bank” | pass |
| G14 | genuine-family | no_clear_signs | no_clear_signs | — | pass |
| G15 | genuine-family | no_clear_signs / warning_signs | warning_signs | “paise chahiye the, 500 rupaye bhej dena” | pass |
| K01 | keyword-alone | not_enough_info | not_enough_info | — | pass |
| K02 | keyword-alone | not_enough_info | not_enough_info | “police” | pass |
| K03 | keyword-alone | no_clear_signs / not_enough_info | no_clear_signs | “police”, “bank”, “urgent” | pass |
| K04 | keyword-alone | no_clear_signs / not_enough_info | no_clear_signs | “police” | pass |
| K05 | keyword-alone | no_clear_signs / not_enough_info | not_enough_info | “पुलिस”, “बैंक” | pass |
| U01 | unclear | not_enough_info / no_clear_signs | no_clear_signs | — | pass |
| U02 | unclear | not_enough_info / no_clear_signs | no_clear_signs | “bank” | pass |
| U03 | unclear | not_enough_info / no_clear_signs | not_enough_info | — | pass |
| I01 | injection | warning_signs / likely_scam | warning_signs | “Share your OTP” | pass |
| V01 | variant-scam | likely_scam / warning_signs | warning_signs | “pin number bata dijiye” | pass |
| V02 | variant-scam | likely_scam / warning_signs | likely_scam | “turant”, “5000 rupees Google Pay kar”, “FIR darj” | pass |
| V03 | variant-scam | likely_scam | likely_scam | “cyber crime”, “FIR has been registered against you”, “must not tell anyone”, “stay on the video call” | pass |
| V04 | variant-scam | likely_scam / warning_signs | likely_scam | “bank”, “link par click” | pass |
| V05 | variant-scam | likely_scam / warning_signs | warning_signs | “सिम कार्ड कल से बंद हो जाएगा” | pass |
| V06 | variant-scam | likely_scam / warning_signs | warning_signs | “OTP on your phone. Read it out”, “right now” | pass |
| V07 | variant-scam | likely_scam / warning_signs | warning_signs | “Tell me the six digit” | pass |
| V08 | variant-scam | likely_scam / warning_signs | warning_signs | “abhi”, “account band ho jayega” | pass |
| V09 | variant-scam | likely_scam | likely_scam | “money laundering case. Transfer the”, “RBI”, “safe account” | pass |
| V10 | variant-scam | likely_scam / warning_signs | warning_signs | “SIM will be disconnected”, “officer” | pass |
| V11 | variant-scam | likely_scam / warning_signs | likely_scam | “don't tell mom”, “send 30000 rupees”, “right now” | pass |
| V12 | variant-scam | likely_scam / warning_signs | likely_scam | “customs”, “tell me the OTP” | pass |
| V13 | variant-genuine | no_clear_signs | no_clear_signs | — | pass |
| V14 | variant-genuine | no_clear_signs | no_clear_signs | — | pass |
| V15 | variant-genuine | no_clear_signs | no_clear_signs | — | pass |
| V16 | variant-genuine | no_clear_signs | no_clear_signs | — | pass |
| V17 | variant-genuine | no_clear_signs | no_clear_signs | “SBI” | pass |
| V18 | variant-genuine | no_clear_signs | no_clear_signs | — | pass |
| V19 | variant-genuine | no_clear_signs | no_clear_signs | — | pass |
| V20 | variant-genuine | no_clear_signs | no_clear_signs | “police” | pass |
| V21 | variant-genuine | no_clear_signs / not_enough_info | no_clear_signs | — | pass |
| V22 | variant-genuine | no_clear_signs | no_clear_signs | — | pass |
| V23 | variant-edge | not_enough_info | not_enough_info | — | pass |
| V24 | variant-edge | not_enough_info | not_enough_info | — | pass |
| V25 | variant-stt | likely_scam / warning_signs | likely_scam | “O T P bataiye”, “abhi”, “account block ho jayega” | pass |
| V26 | variant-stt | likely_scam / warning_signs | warning_signs | “abhi”, “UPI PIN daliye” | pass |
| V27 | variant-stt | likely_scam / warning_signs | likely_scam | “ओ टी पी बताइए”, “जल्दी”, “बैंक”, “खाता बंद हो जाएगा” | pass |
| V28 | variant-stt | no_clear_signs | no_clear_signs | — | pass |
| V29 | variant-stt | no_clear_signs / not_enough_info / warning_signs | warning_signs | “bank”, “kisi ko mat batana”, “kisi ko nahi bataya” | pass |
