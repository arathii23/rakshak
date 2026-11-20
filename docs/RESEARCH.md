# Research notes behind the accuracy work

Written 2026-11-21 before any detector change. Purpose: ground the accuracy work in what is publicly documented about scam calls in India and about LLM-based scam detection, and record which decisions each finding led to.

This is background reading, **not** a measurement of Rakshak. Nothing here is a claim that the app is accurate on real calls. Items I could not read or confirm are listed in section 7.

## 1. Scam types and what the caller typically asks for

The caller's *request* (a code, money, an install, secrecy, a threat) is what the sources describe, not particular words. Phrases below are paraphrased from the cited pages, not quoted.

| Type | What the caller typically says or asks | Where documented |
|---|---|---|
| "Digital arrest" / fake police, CBI, customs, NCB | Accuses the person of a crime (a parcel with drugs, money laundering, misuse of Aadhaar), threatens arrest, keeps the person on a video call, demands secrecy, asks for money to a "safe" or "verification" account. Official position: CBI, ED and police do not arrest anyone over a video call | I4C advisory as reported by [The Tribune](https://www.tribuneindia.com/news/india/cbi-ed-police-dont-arrest-people-through-video-calls-indian-cyber-crime-coordination-centre/amp) and [Deccan Herald](https://deccanherald.com/india/amid-rise-in-digital-arrest-cases-indian-cyber-crime-coordination-centre-issues-advisory-for-citizens-3221509); [NPCI via Free Press Journal](https://www.freepressjournal.in/tech/npci-alerts-public-on-digital-arrest-scams-urges-vigilance-documentation) |
| Courier / parcel | Starts as a courier company (FedEx is the usual name), says a parcel in the person's name holds drugs or a passport, passes the call to a "customs" or "cyber crime" officer, then a video call, then a payment | [CyberPeace](https://www.cyberpeace.org/resources/blogs/your-parcel-contains-drugs-inside-the-fake-fedex-scam-terrorising-indian-cities), [Deccan Herald](https://www.deccanherald.com/amp/story/india%2Ffedex-courier-scam-a-tale-of-terror-trickery-and-deceit-2804802), [Moneylife](https://moneylife.in/article/fraud-alert-how-not-to-become-a-victim-of-the-courier-or-delivery-scams/72410.html) |
| SIM block / "TRAI" | Says the SIM will be disconnected, or that the person's Aadhaar was used for illegal SIMs, pushes a video call. TRAI says it does not block numbers or call about disconnection | [TRAI press release 2025](https://trai.gov.in/sites/default/files/2025-04/PR_No.22of2025.pdf), [TRAI press release 2023](https://cms.trai.gov.in/sites/default/files/2024-11/PR_No.123of2023.pdf), [DoT notice](https://www.sancharsaathi.gov.in/SancharSaathiDocuments/ImportantDocuments/Threatening%20fake%20call%20for%20disconnection%20of%20mobile%20connections.pdf) |
| Electricity bill / KYC | Power will be cut tonight because the bill or KYC is "not updated"; call this number or install this app | [DoT press release](https://www.sancharsaathi.gov.in/SancharSaathiDocuments/ImportantDocuments/Press%20Release-DoT%20takes%20action%20against%20Electricity%20KYC%20Update%20Scam.pdf), [Moneylife](https://moneylife.in/article/electricity-bill-scam-392-mobiles-blocked-dot-orders-reverification-of-31740-mobile-connections-linked-with-fraud/74426.html), [SBI warning via Outlook Money](https://www.outlookmoney.com/news/sbi-warns-of-new-electricity-bill-scam-key-things-consumers-should-never-do) |
| Bank / card / KYC | Unexpected call about a card or account problem; asks for card details, a code, a link or an app install; "impersonating bank officials"; asks to act outside the bank's own app | Sanchar Saathi credit-card poster (read, dated 29.04.2026); [Paytm guide](https://paytm.com/blog/fraud-safety/never-share-your-otp-understanding-one-time-password-fraud/); [HDFC Bank page](https://www.hdfcbank.com/personal/resources/learning-centre/vigil-aunty/how-to-secure-yourself-from-fraud-bank-calls) |
| OTP / UPI PIN | Asks the person to read out an OTP, PIN or CVV. Banks never ask for these on a call. A UPI PIN is only needed to *pay*, never to *receive* money | RBI press release ([prid=53185](https://rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=53185)), [Paytm UPI guide](https://paytm.com/blog/payments/upi/how-scammers-exploit-upi-vpa-fraud-protection-guide) |
| Call merging | A stranger says a friend gave them the number (an event, a job interview) and asks the person to merge two calls, so that the bank's OTP call is heard | NPCI warning as reported by [Business Standard](https://business-standard.com/technology/tech-news/npci-warns-users-against-call-merging-scams-here-s-how-to-protect-yourself-nc-125021800803_1.html) and [Quick Heal](https://www.quickheal.co.in/knowledge-centre/the-merge-call-scam-deconstructed-how-social-engineering-hijacks-otps/) |
| APK / link ("RTO challan", PM Kisan, PM Awas, "5G update") | Sends a file or link, often on WhatsApp, and says to install it to see a challan or update a scheme. Police say no government department sends APK files | [The Tribune](https://www.tribuneindia.com/news/himachal/challan-scam-alert-fraudsters-use-whatsapp-apk-links-to-loot-money), [The Quint](https://www.thequint.com/news/webqoof/apk-scam-on-whatsapp-where-scammers-send-malicious-apps-and-files-under-pm-kisan-yojna), [Free Press Journal](https://www.freepressjournal.in/bhopal/mp-news-cyber-alert-fake-pm-awas-pm-kisan-apk-files-are-new-fraud-bait) |
| Task / part-time job | Unsolicited WhatsApp or Telegram job offer; small early payouts for easy tasks (videos, reviews); then a deposit to "unlock" bigger earnings. Genuine employers do not charge candidates | [UCO Bank advisory](https://ucobank.com/documents/d/guest/security-advisory-beware-of-task-based-job-scams), [Free Press Journal](https://www.freepressjournal.in/mumbai/cyber-police-warn-citizens-against-task-based-earning-scams-promising-easy-money), Sanchar Saathi fake-jobs poster ("request for money or bank details", "too good to be true") |
| Loan with a fee | Very low interest, no credit check, pressure; asks for an upfront processing, insurance or GST fee. Genuine lenders deduct fees from the loan | Sanchar Saathi loan poster, [Razorpay](https://razorpay.com/learn/what-is-loan-fraud/), [BoomLive](https://www.boomlive.in/decode/scamcheck/unsolicited-loan-how-fake-loan-apps-trap-you-into-fraud-30010) |
| Lottery / prize (KBC) | The person "won"; must pay a fee or tax first to release it | [Bajaj Finserv](https://www.bajajfinserv.in/lottery-scams) |
| Relative in trouble | Says a son, daughter or grandchild (often abroad) has had an accident or been arrested and money is needed now; asks for secrecy | [The420.in (Hyderabad case)](https://the420.in/hyderabad-woman-cyber-fraud-fake-london-accident-scam/), [The Tribune (Kapurthala case)](https://www.tribuneindia.com/news/jalandhar/kapurthala-farmer-loses-rs-11-75-lakh-in-cyber-fraud/amp); general pattern and "family code word" advice from [AARP](https://www.aarp.org/money/scams-fraud/grandparent.html) (US source) |

Common to almost all of them: an unexpected contact, an authority or a bank, a threat or an urgent deadline, a request to *do* something (read a code, pay, install, stay on the line), and secrecy.

## 2. Genuine calls that look like scams (false-positive traps)

- **Delivery and ride OTPs.** A delivery or cab OTP is shared with the person in front of you, for an action you started (Ola's own help page and [Bajaj Finserv's guide](https://www.bajajfinserv.in/do-not-share-otp-guide) say so). The same OTP read out to someone on the *phone* is the scam (the [Hyderabad Swiggy case](https://thelogicalindian.com/i-feel-foolish-hyderabad-man-loses-swiggy-order-after-sharing-otp-with-fake-pista-house-caller/)). A transcript cannot show who is at the door, so Rakshak can only be uncertain here.
- **Bank fraud checks** that ask "did you make this payment?" are normal; a code, PIN, CVV, a transfer or an install is not.
- **Advice** ("never share your OTP", a bank SMS, a news retelling) contains scam words but is not a request.
- **In-person requests** (a police station or tax office asking the person to visit with ID) are normal when there is no demand and no threat.
- **Bill, EMI and appointment reminders** that point to the official app or office.
- **Family and friends** asking for money are common and legitimate, but also how the "relative in trouble" scam works. The right label for such texts is *ambiguous*: the app can only say to call back on a known number.
- NPCI notes that scammers can connect the victim to a **genuine** OTP call (call merging), so a real OTP message can occur inside a scam.

## 3. What the LLM scam-call papers say (read 2026-11-21)

| Paper | What it did | Findings relevant here |
|---|---|---|
| [Sim & Kim, arXiv 2506.06180](https://arxiv.org/html/2506.06180v1) (fine-tuned Llama-3 8B, Korean voice phishing) | 219 real scam transcripts, 35 human-written ones, about 1,100 benign ones and 58 hand-written hard negatives that reuse scam vocabulary | Putting **explicit expert criteria** in the prompt beat chain-of-thought for small models (94.6% vs 81.3% on the hard negatives). A keyword model (KoBERT) fell to 56% on the hard negatives. The hard-negative set is only 58 items, so one error is about 1.7 points |
| [Shen et al., arXiv 2502.03964](https://arxiv.org/html/2502.03964v1) (real-time, turn by turn) | Real calls from YouTube plus synthetic dialogues built around suspicious keywords | **False positives on benign calls that mention payment, identity checks or urgent decisions.** Adding an "uncertain" output improved precision but delayed or missed some real scams |
| [Shen et al., arXiv 2409.11643](https://arxiv.org/html/2409.11643v2) | Public synthetic sets plus real calls plus an adversarial set made by Claude with the top-50 scam terms placed in both scam and genuine samples | A TF-IDF random forest scored about 1.0 on easy sets and **collapsed on the adversarial one** (accuracy 0.53, recall 0.16). LLM recall was as low as 0.72 on real calls. Labels **flipped between repeated runs** |

None of the papers uses real calls on the scale needed for a field false-positive rate, and none evaluates a rules-plus-LLM hybrid. Their numbers are not Rakshak's numbers.

## 4. Pricing, and the budget guard

Three Sarvam pages (docs pricing, API-reference pricing, Token Factory pricing; read 2026-11-21) agree: `sarvam-105b` and `sarvam-105b-conversations` cost ₹10 per million input tokens, ₹0.25 cached input and ₹25 output, marked as introductory pricing through the end of 2026. Reasoning tokens are billed as output. Speech to text is ₹0.49 per minute, billed per second. Pages: [docs](https://docs.sarvam.ai/api/getting-started/pricing), [API reference](https://docs.sarvam.ai/api-reference-docs/pricing), [Token Factory](https://www.sarvam.ai/token-factory/pricing). None says in so many words that one credit equals one rupee.

Search-result snippets earlier the same day showed higher numbers for the same model (up to ₹29.28 in and ₹73.2 out per million). So the evaluation runner budgets at **₹29.28 in / ₹73.2 out per million tokens and ₹0.60 per minute of audio**, whatever the page says, and stops at its cap. Real spend is expected to be well below the capped estimate; compare it with the Sarvam dashboard.

## 5. Decisions this research led to

1. **Independent, labelled test sets with three tiers** (scam, genuine, ambiguous), including many hard negatives in every set, because every paper shows false positives and keyword collapse are the main risks.
2. **Dev / test discipline.** The detector is tuned on a development set only. Two test sets (one hand-written, one written by the Sarvam model, which has never seen the rules) are frozen first and scored once at the end.
3. **Keep an "uncertain" outcome** (`not_enough_info`, `no_clear_signs`, `warning_signs`) rather than forcing scam / not scam.
4. **Put the expert criteria and the hard-negative list in the prompt**, and ask for signals with exact quotes, not a free verdict.
5. **Rules stay as a recall floor** (an LLM can miss a scam, or answer differently on a rerun), and the AI alone still cannot declare a scam without evidence.
6. **Cache every model answer** so a change to the merge logic can be re-scored for free and runs can be compared on identical answers.
7. **Report false positives as prominently as recall**, with confidence intervals, and never claim real-world accuracy.

## 6. Where to report (already shown in the app)

Call 1930 or use cybercrime.gov.in when money is lost or a code was shared; report a suspicious call, SMS or WhatsApp message on Sanchar Saathi (Chakshu).

## 7. Not read, not confirmed

- The RBI "BE(A)WARE" booklet could not be fetched (the server redirected to the RBI home page), so no claim here depends on it.
- The Sanchar Saathi investment-scam poster exceeded the fetch size limit. The "investment / double your money" type in the test sets comes from general knowledge, not from a source I read.
- The Sanchar Saathi file named `FakeJobCalls.pdf` carries the title text of a digital-arrest poster in its metadata, so its name may not match its content; only its visible warning signs are cited above.
- No source I found documents a "press 9" or "two hours" script for SIM-block calls, so test cases do not rely on those details.
- The claim that malware from fake challan APKs steals OTPs is not confirmed by the sources I read (they describe data theft and device access); the test cases only use the *install this file* request.
- All scripts used in the test sets are written from these descriptions. None is a recording of a real call.
