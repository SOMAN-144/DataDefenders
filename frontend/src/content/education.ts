/**
 * General public-safety guidance, written for this project.
 * `headId` links a topic to an NCRB crime head only where that head genuinely exists.
 * `headNote` says when the link is approximate, or why no official figure exists.
 */
export interface Topic {
  id: string;
  title: string;
  what: string;
  how: string[];
  signs: string[];
  prevent: string[];
  victim: string[];
  example?: string;
  headId?: string;
  headNote?: string;
  prevention: boolean;
}

const FINANCIAL_VICTIM = [
  "Call 1930 at once. The sooner you report, the better the chance of holding the money.",
  "Tell your bank through its official number and ask it to block the card, UPI or account.",
  "File a complaint at cybercrime.gov.in and note the acknowledgement number.",
  "Save transaction IDs, screenshots, phone numbers and links. Do not delete the messages.",
];

export const TOPICS: Topic[] = [
  {
    id: "online-fraud",
    title: "Online financial fraud",
    what: "Any scheme that uses phones, the internet or payment apps to trick people out of money. It includes fake investment schemes, fake job offers and loan app scams.",
    how: [
      "Contact starts through a call, SMS, WhatsApp, Telegram or an online advert.",
      "The criminal builds trust with small early payouts, fake dashboards or official-looking documents.",
      "The victim is pressured to send larger sums, often to accounts belonging to third parties.",
    ],
    signs: ["Guaranteed high returns", "Pressure to pay immediately", "Payment to a personal account or UPI ID", "Fees demanded before you can withdraw money"],
    prevent: ["Check investment platforms against SEBI's registers", "Never pay to receive money", "Pause and talk to someone you trust before a large transfer"],
    victim: FINANCIAL_VICTIM,
    example: "A Telegram group shows screenshots of big profits. Your first ₹1,000 appears to double on a website, but when you invest more, withdrawals are blocked until you pay a 'tax'.",
    headId: "fraud_total",
    prevention: false,
  },
  {
    id: "upi",
    title: "UPI fraud",
    what: "Fraud carried out through UPI apps, usually by tricking you into approving a payment or sharing your UPI PIN.",
    how: [
      "A 'buyer' on a classifieds site sends a collect request and says you will receive money.",
      "A QR code is sent with the claim that scanning it will credit your account.",
      "A fake customer care agent asks you to install a screen-sharing app or enter your PIN.",
    ],
    signs: ["You are asked to enter your PIN to receive money", "A QR code is offered for a refund", "An unexpected collect request", "Requests to install a remote-access app"],
    prevent: ["Remember that a UPI PIN is only needed to send money, never to receive it", "Read the screen before approving, and decline unknown collect requests", "Find customer care only inside the app or on the official website", "Set a daily UPI limit that suits you"],
    victim: FINANCIAL_VICTIM,
    example: "You sell a sofa online. The 'buyer' sends a request labelled 'Receive ₹5,000' and asks you to enter your PIN. Doing so sends ₹5,000 to them.",
    headId: "fraud_upi",
    headNote: "NCRB first reported E-wallet or UPI fraud as a separate head in 2024, so there is no earlier history.",
    prevention: true,
  },
  {
    id: "otp",
    title: "OTP scams",
    what: "Tricking someone into sharing a one-time password, which then authorises a transaction or an account takeover.",
    how: [
      "A caller claims to be from your bank and says your KYC or card is about to expire.",
      "They trigger a real OTP on your phone and ask you to read it out 'for verification'.",
      "The same trick is used for electricity bill, courier and SIM upgrade scams.",
    ],
    signs: ["Anyone asking for an OTP by phone", "Threats that your account or power will be cut today", "An OTP message for something you did not start"],
    prevent: ["Never share an OTP with anyone, including people who say they are bank staff", "Read the whole OTP message, because it says what you are approving", "Hang up and call the number on the back of your card"],
    victim: FINANCIAL_VICTIM,
    headId: "fraud_otp",
    prevention: true,
  },
  {
    id: "phishing",
    title: "Phishing",
    what: "Messages or emails that imitate a trusted organisation so that you hand over passwords, card numbers or personal details. Called smishing by SMS and vishing by voice call.",
    how: [
      "A message warns about a blocked account, a pending parcel or an unpaid challan.",
      "A link leads to a page that looks real and captures whatever you type.",
      "The stolen details are used immediately, or sold.",
    ],
    signs: ["Urgent or threatening language", "Links with misspelt or odd domains", "Requests for passwords, PINs or CVV", "Unexpected attachments or APK files"],
    prevent: ["Type important addresses yourself rather than following a link", "Turn on two-factor authentication", "Report suspected fraud messages through Chakshu on Sanchar Saathi"],
    victim: ["Change the password immediately, and anywhere else you reused it", "If you entered banking details, call your bank and 1930", "Report the message through Chakshu on sancharsaathi.gov.in", "Check connected devices and recovery details on the account"],
    example: "An SMS says 'Your India Post parcel is held. Update your address' with a link to a look-alike site that then asks for card details and a small fee.",
    headNote: "NCRB has no phishing head. Related cases fall under fraud, cheating by personation or other heads. We could not verify a CERT-In annual phishing count, so none is shown.",
    prevention: true,
  },
  {
    id: "fake-websites",
    title: "Fake websites",
    what: "Sites built to look like shops, banks, government services or customer care pages in order to collect payments or data.",
    how: [
      "Fake pages appear through adverts, search results or forwarded links.",
      "Prices look too good to be true, or a fake helpline number is displayed.",
      "Payment is taken, and nothing arrives.",
    ],
    signs: ["An address that is slightly different from the real one", "Only prepaid payment accepted, often to a personal UPI ID", "No verifiable address or returns policy", "Huge discounts with countdown timers"],
    prevent: ["Remember that the lock icon only means the connection is encrypted, not that the site is honest", "Use bookmarks for banks and government services", "Check Trusted Contact Details on Sanchar Saathi for official bank contacts"],
    victim: FINANCIAL_VICTIM,
    headNote: "No separate official category exists. Such cases fall under fraud or cheating.",
    prevention: true,
  },
  {
    id: "social-engineering",
    title: "Social engineering and 'digital arrest'",
    what: "Manipulating people through fear, authority or trust rather than by hacking any system. 'Digital arrest' is a widely reported form in India.",
    how: [
      "A caller poses as police, CBI, customs, RBI or a telecom official.",
      "They claim your Aadhaar or a parcel is linked to a crime, and may appear on video in uniform.",
      "You are told to stay on the call, tell no one and transfer money 'for verification'.",
    ],
    signs: ["Threats of immediate arrest over a call", "Instructions to stay on video and keep it secret", "Demands to move money to a 'safe' or 'RBI' account"],
    prevent: ["Disconnect and call a family member or your local police station directly", "Know that the government has warned that 'digital arrest' is a scam", "Report such calls to 1930 or cybercrime.gov.in"],
    victim: ["End the call. You are not legally obliged to stay on it", ...FINANCIAL_VICTIM],
    example: "A 'CBI officer' says drugs were found in a parcel in your name, keeps you on video for hours, and orders you to send your savings for checking.",
    headId: "fraud_vishing",
    headNote: "The closest official head is 'Fraud calls / vishing', first reported in 2024. There is no separate 'digital arrest' head.",
    prevention: true,
  },
  {
    id: "identity-theft",
    title: "Identity theft",
    what: "Using someone's personal details, such as Aadhaar, PAN, photographs or SIM, without permission to open accounts, take loans or commit fraud.",
    how: [
      "Documents are collected through fake loan apps, or copies are misused after being shared.",
      "Details from data leaks are combined to pass verification checks.",
      "Mule bank accounts or SIM cards are opened in the victim's name.",
    ],
    signs: ["Loan or credit enquiries you do not recognise", "SIM cards registered in your name that you did not take", "OTPs or bills for services you never used"],
    prevent: ["Mark photocopies with their purpose and date", "Check your connections on Sanchar Saathi's 'Know Mobile Connections In Your Name'", "Check your credit report regularly", "Lock your Aadhaar biometrics in the official mAadhaar app or on the UIDAI site"],
    victim: ["Report at cybercrime.gov.in and keep the acknowledgement", "Report unknown mobile connections on Sanchar Saathi", "Inform the bank or lender in writing and dispute the record", "Tell the credit bureau about accounts that are not yours"],
    headId: "identity_theft",
    prevention: true,
  },
  {
    id: "social-media",
    title: "Social media scams",
    what: "Fraud and harassment using fake or hacked profiles, including friend-in-need requests, romance scams and sextortion.",
    how: [
      "A cloned profile of a friend asks for urgent money.",
      "A new online relationship leads to requests for money or intimate images.",
      "Images are then used for blackmail.",
    ],
    signs: ["A second account for someone you already follow", "A contact who moves quickly to private chat", "Urgent requests for money from a friend's account", "Video calls from unknown numbers"],
    prevent: ["Confirm money requests by calling the person on their known number", "Keep your friends list and photos private", "Turn on two-factor authentication on every account"],
    victim: ["Do not pay a blackmailer, because payment rarely ends the demands", "Save screenshots, profile links and chat history", "Report at cybercrime.gov.in, which has a route for crimes against women and children", "Report the profile to the platform"],
    headId: "fake_profile",
    headNote: "There is no 'social media fraud' head. 'Fake profiles' is the closest official category and captures only a small part of this problem.",
    prevention: true,
  },
  {
    id: "card",
    title: "Credit and debit card fraud",
    what: "Unauthorised use of card details, through skimming at terminals, phishing, or stolen card numbers used online.",
    how: ["Card details are copied at a tampered terminal or on a fake site.", "A caller asks for the CVV or OTP to 'raise your limit'.", "Stolen details are used for online purchases."],
    signs: ["Alerts for payments you did not make", "A caller asking for your CVV", "A card reader that looks tampered with"],
    prevent: ["Turn off international and online use when you don't need them", "Keep SMS and email alerts on", "Cover the keypad and keep your card in sight"],
    victim: FINANCIAL_VICTIM,
    headId: "fraud_card",
    prevention: false,
  },
  {
    id: "banking",
    title: "Online banking fraud",
    what: "Taking over internet or mobile banking, or tricking account holders into authorising transfers.",
    how: [
      "Fake bank messages lead to credential-stealing pages.",
      "A malicious APK file posing as a bank or KYC app reads your SMS messages.",
      "Criminals change limits and payees and then drain the account quickly.",
    ],
    signs: ["A 'KYC update' link sent by SMS", "A prompt to install an app from outside the Play Store or App Store", "Payees added without your knowledge"],
    prevent: ["Use only the bank's official app and website", "Never install APK files sent through chat", "Set transaction limits and turn on alerts", "Use a unique password for banking"],
    victim: [...FINANCIAL_VICTIM, "If a bank does not resolve your complaint, you can escalate to the RBI Ombudsman at cms.rbi.org.in"],
    headId: "fraud_online_banking",
    prevention: true,
  },
  {
    id: "ransomware",
    title: "Ransomware",
    what: "Malicious software that locks or encrypts files and demands payment to restore them. It affects individuals, hospitals, businesses and government bodies.",
    how: ["Entry through an email attachment, cracked software or an unpatched server.", "Files are encrypted, and sometimes copied out first.", "A ransom note demands payment, usually in cryptocurrency."],
    signs: ["Files with unfamiliar extensions that won't open", "A ransom note on the screen", "Security software suddenly switched off"],
    prevent: ["Keep offline backups and test restoring them", "Update your operating system and software", "Avoid pirated software", "Use multi-factor authentication for remote access"],
    victim: ["Disconnect the device from the network immediately", "Do not delete files or the ransom note, because they are evidence", "Report at cybercrime.gov.in. Organisations should also report to CERT-In", "Restore from a clean backup. Paying does not guarantee recovery"],
    headId: "ransomware",
    prevention: true,
  },
  {
    id: "malware",
    title: "Malware",
    what: "Software designed to harm a device or steal from it, including trojans, spyware and banking malware. Fake APK apps are common on Android phones in India.",
    how: ["A fake wedding invitation, challan or bank APK is sent on WhatsApp.", "Infected software downloads or malicious adverts.", "The app gains permissions to read SMS and overlay banking screens."],
    signs: ["New apps you do not remember installing", "Rapid battery drain and unexplained data use", "Apps demanding accessibility or SMS permissions"],
    prevent: ["Install apps only from official stores", "Review app permissions regularly", "Use the free cleaning tools from the Cyber Swachhta Kendra (CERT-In)"],
    victim: ["Turn on flight mode and remove the suspicious app", "From a clean device, change your banking and email passwords", "If money was taken, call 1930"],
    headNote: "NCRB has no general malware head, only ransomware. CERT-In does not publish a comparable national annual malware count that we could verify.",
    prevention: true,
  },
  {
    id: "stalking",
    title: "Cyberstalking",
    what: "Repeatedly following, monitoring or harassing someone online. It falls especially on women and children, and is a crime under Indian law.",
    how: ["Repeated unwanted messages or new accounts created after being blocked.", "Tracking location or activity through shared devices or apps.", "Threats to share private information."],
    signs: ["Someone knows your location or plans without being told", "Repeated contact from new accounts", "Unknown apps or trackers on your device"],
    prevent: ["Review privacy settings and location sharing", "Log out of shared devices and change passwords", "Block and report, after saving evidence"],
    victim: ["Save screenshots with dates and profile links", "Report at cybercrime.gov.in. Complaints about crimes against women and children have a dedicated route", "Tell someone you trust, and contact local police if you feel unsafe"],
    headId: "cyber_stalking",
    prevention: false,
  },
  {
    id: "impersonation",
    title: "Online impersonation",
    what: "Cheating by pretending to be someone else using a computer resource: a company, an official or a relative. It is the largest IT Act sub-head NCRB reports.",
    how: ["A fake customer care number appears in search results.", "A message or call from a 'relative abroad' or 'your boss' asks for urgent money.", "AI voice or video may be used to make it convincing."],
    signs: ["A familiar name with an unfamiliar number", "Requests to keep things secret", "Urgency that leaves no time to check"],
    prevent: ["Call the person back on a number you already have", "Agree a family code word for emergencies", "Check official contacts on the organisation's website"],
    victim: FINANCIAL_VICTIM,
    headId: "personation",
    prevention: false,
  },
  {
    id: "other",
    title: "Other reported cyber crimes",
    what: "Offences NCRB groups as 'other', recorded where a case does not fit a specific head. A large share of cases falls here, which limits how precisely trends can be read.",
    how: ["The method varies, since this is a statistical grouping rather than one type of crime."],
    signs: ["Use the warning signs in the other topics"],
    prevent: ["Use the general safety steps in the Prevention section"],
    victim: ["Report at cybercrime.gov.in, or call 1930 if money was involved"],
    headId: "other_ipc",
    prevention: false,
  },
];

export const GENERAL_TIPS = [
  { title: "Pause first", text: "Scams rely on panic. Hang up, wait, and check through a number you found yourself." },
  { title: "Keep secrets secret", text: "Nobody genuine needs your OTP, UPI PIN, CVV or password. Not your bank, and not the police." },
  { title: "Lock accounts", text: "Use unique passwords, a password manager and two-factor authentication on email and banking." },
  { title: "Update and back up", text: "Install updates promptly and keep an offline copy of what you can't afford to lose." },
];
