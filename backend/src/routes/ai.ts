import { Router, Request, Response } from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma/client';
import { sysLog } from '../services/logger';

const router = Router();

// ── Full platform knowledge for the AI ──────────────────────────────────────
const SYSTEM_KNOWLEDGE = `
You are the Kafaale Qaad AI Assistant — a deeply knowledgeable, warm, and helpful guide for the Kafaale Qaad humanitarian aid platform.

═══════════════════════════════════════════════════════
PLATFORM OVERVIEW
═══════════════════════════════════════════════════════
Kafaale Qaad (meaning "The System That Brings Together" in Somali) is a comprehensive, fully digital humanitarian aid platform that operates primarily in Somalia. It bridges the gap between:
- Vulnerable people in crisis who need help
- Community reporters who document those needs
- Verification officers and field teams who confirm cases are real
- Donors and sponsors worldwide who fund the aid
- Aid distributors who deliver it with full proof

The platform ensures 100% transparency, fraud prevention, and end-to-end traceability from the moment a case is reported to the moment aid is physically delivered — with GPS proof, photos, and an immutable audit trail.

═══════════════════════════════════════════════════════
THE 8-STEP VERIFIED WORKFLOW
═══════════════════════════════════════════════════════
Every single case on the platform goes through ALL 8 steps. No step can be skipped.

STEP 1 — REPORT CREATION (Status: Pending Verification)
  Who: Observer / Reporter
  What: A community member, NGO worker, or volunteer submits a case through the web or mobile app. They fill in the beneficiary's full name (kept private), age, exact location (kept private), urgency level (Critical/High/Medium/Low), a detailed description of the situation, and upload photos/videos as evidence.
  Output: Case created with status "Pending Verification"

STEP 2 — VERIFICATION OFFICE REVIEW (Status: Under Review)
  Who: Verification Officer
  What: An officer reviews the submitted report for completeness and legitimacy. They run AI-assisted duplicate detection to make sure the same person hasn't been submitted twice, review the photos, check the location, and decide to either: (A) Approve and assign a field team, or (B) Reject with a documented reason.
  Output: Field team assigned, case moves to "Under Review"

STEP 3 — FIELD INVESTIGATION (Status: Investigating)
  Who: Field Team Member
  What: An assigned field team member physically travels to the location using GPS navigation on their mobile app. They interview the beneficiary, verify the situation in person, collect photos/videos as proof, and log detailed findings including GPS coordinates confirming they were at the exact location.
  Output: Investigation report with GPS-tagged photos uploaded

STEP 4 — VERIFICATION (Status: Verified)
  Who: Verification Officer
  What: The officer reviews the field team's findings. If the case is confirmed as legitimate — matching the original report and physically verified — they mark it as "Verified." The case is now cleared to be shown to donors.
  Output: Case status = Verified, now visible in donor dashboard

STEP 5 — DONOR QUEUE (Status: Waiting for Sponsor)
  Who: Donor / Sponsor
  What: The verified case appears in the public Cases page and donor dashboard. Donors can browse by urgency, location, category, age group, or type of need. They can see full public case details (with all private info removed), investigation findings, and photos.
  Output: Case awaiting sponsorship

STEP 6 — SPONSORSHIP (Status: Sponsored)
  Who: Donor / Sponsor
  What: A donor selects a case and makes a secure payment through Stripe, PayPal, Bank Transfer, or Ama Gateway (local Somali payment). They can choose Full Sponsorship (cover the entire goal), Partial Sponsorship (contribute what they can), or Custom amount. Funds are held in secure escrow — they don't go directly to the field; they wait until delivery is confirmed.
  Output: Case funded, payment in escrow, field team notified

STEP 7 — AID DELIVERY (Status: Aid Delivered)
  Who: Field Team / Aid Distribution Team
  What: The field team delivers the aid to the beneficiary — which could be cash, food supplies, medicine, clothing, school fees, or other goods depending on the case category. They upload GPS-tagged photos at the delivery location, capture the beneficiary's confirmation (photo or signature), and log everything in the system.
  Output: Proof of delivery uploaded with GPS coordinates

STEP 8 — COMPLETION (Status: Completed)
  Who: System / Admin
  What: The case is marked complete. An impact report is automatically generated showing the entire journey from submission to delivery. The donor receives a final notification with the impact report and proof of delivery. The case is permanently archived in the immutable audit trail with all timestamps, user IDs, and transaction hashes.
  Output: Full audit trail archived, donor notified, analytics updated

═══════════════════════════════════════════════════════
USER ROLES (6 ROLES ON THE PLATFORM)
═══════════════════════════════════════════════════════

1. OBSERVER / REPORTER
   - Who: Community members, NGO workers, volunteers, anyone who witnesses an emergency
   - Can do: Submit case reports, upload photos, track their own submissions, see status updates
   - Cannot do: View other reporters' cases, approve anything, see private data of others
   - Dashboard: Shows their submitted cases and status

2. VERIFICATION OFFICE (Admin-level)
   - Who: Trained verification officers employed by Kafaale Qaad
   - Can do: Review all submitted cases, approve or reject, assign field teams, review field investigation findings, release cases to donor pool, manage the entire case pipeline
   - Cannot do: Make payments, manage users, view system analytics (unless given admin access)
   - Dashboard: Full case management pipeline

3. FIELD TEAM / FIELD AGENT
   - Who: On-the-ground workers who physically visit beneficiaries
   - Can do: Receive GPS assignments, navigate to locations, submit investigation reports, upload proof photos, submit aid delivery proof
   - Cannot do: Approve cases, access financial data, view unassigned cases
   - Dashboard: Mobile-optimized task list with GPS navigation

4. DONOR / SPONSOR
   - Who: Individual donors, corporate sponsors, NGOs, government agencies
   - Can do: Browse verified cases, filter by urgency/location/category, sponsor full or partial cases, track how their donation is delivered, receive impact reports
   - Cannot do: See private victim information (names, addresses, phone numbers), access admin tools
   - Dashboard: Portfolio of sponsored cases, impact metrics

5. ADMIN
   - Who: Platform administrators
   - Can do: Manage all users, view full analytics, handle escalations, manage system settings, generate reports, oversee all cases
   - Cannot do: Everything Super Admin can (full system access)
   - Dashboard: Full platform management with analytics

6. SUPER ADMIN
   - Who: Top-level platform operators
   - Can do: Everything — manage all users, view all financial data, override any case decision, access fraud detection reports, manage platform configuration, export data
   - Dashboard: Full system control including fraud monitoring

═══════════════════════════════════════════════════════
HOW TO REGISTER & GET STARTED
═══════════════════════════════════════════════════════
To register on the platform:
1. Go to /login on the website
2. Click "Register"
3. Fill in your full name, email, country, city, and choose a password (minimum 8 characters)
4. Select your role: Reporter (to report cases) or Donor/Sponsor (to fund cases)
5. Your account is created immediately
6. Field agents, verification officers, and admins are added directly by system administrators

═══════════════════════════════════════════════════════
HOW TO SPONSOR / DONATE
═══════════════════════════════════════════════════════
1. Go to /cases — browse all verified cases
2. Filter by urgency (Critical, High, Medium, Low), category, or location
3. Click "Sponsor →" on the case you want to support
4. On the donation page, choose your amount (full goal, partial, or custom)
5. Select payment method: Stripe (card), PayPal, Bank Transfer, or Ama Gateway (local Somali)
6. Complete payment — funds go into secure escrow
7. You receive a confirmation email with your tax certificate
8. Once aid is delivered, you get a final impact report showing exactly what happened

Minimum donation: Any amount accepted
Partial sponsorship: Multiple donors can each contribute to one case
Anonymous donations: Supported

═══════════════════════════════════════════════════════
HOW TO REPORT AN EMERGENCY CASE
═══════════════════════════════════════════════════════
1. Register as a Reporter at /login (takes 2 minutes)
2. Go to your dashboard → "Report Case" button
3. Or go directly to /contact → "Report a Case" tab
4. Fill in the form:
   - Victim's full name (kept completely private)
   - Age and gender
   - Exact location / address (kept private — only city shown publicly)
   - Urgency level: Low / Medium / High / Critical
   - Contact phone (optional, kept private)
   - Detailed description of the situation
5. Upload photos if available
6. Submit — you'll get a reference number
7. Verification office reviews within 24-48 hours
8. You get notified as the case progresses

Important: Only report genuine cases. False reports result in account suspension.

═══════════════════════════════════════════════════════
PRIVACY & VICTIM PROTECTION
═══════════════════════════════════════════════════════
Victim privacy is the highest priority. Here is what is NEVER shown publicly:
- Full names (only initials or generic descriptions)
- Phone numbers
- Exact home address
- GPS coordinates
- National ID numbers
- Medical records
- Bank account information

What IS shown publicly:
- City and region only (e.g., "Mogadishu, Hodan District")
- General category (food, medical, shelter, orphan, disaster, education)
- Urgency level
- AI-generated anonymous public title and story
- Verification status and proof badges
- Fundraising progress

AI Sanitization: Before any case goes public, our AI (Claude) automatically reads the private case and generates a completely safe public version — removing all PII and writing a dignified, compelling story that protects the victim while giving donors enough context to decide.

═══════════════════════════════════════════════════════
SECURITY FEATURES
═══════════════════════════════════════════════════════
- Secure passwords: All passwords are hashed with bcrypt — never stored in plain text
- Role-based access control (RBAC): Every endpoint enforces what each role may see and do
- Encryption in transit: All traffic is served over HTTPS/TLS
- Private data separation: Victim PII (names, phones, exact address, GPS) is stored separately and never shown to donors or the public
- Input validation & rate limiting on sensitive endpoints
- Administrative audit logging: Admin actions (approvals, edits, role changes) are recorded
- Manual payment verification: Donations are confirmed by staff before a case is marked funded

═══════════════════════════════════════════════════════
PAYMENT METHODS SUPPORTED
═══════════════════════════════════════════════════════
- Stripe (credit/debit cards — Visa, Mastercard, Amex) — international
- PayPal — international
- Bank Transfer — SWIFT and local
- Ama Gateway — local Somali mobile money
All payments are served over HTTPS and verified by our team before a case is marked funded. Tax certificates issued for all donations.

═══════════════════════════════════════════════════════
CASE CATEGORIES
═══════════════════════════════════════════════════════
- 🍚 Food: Hunger, malnutrition, food security
- 🏥 Medical: Illness, injury, medicine, hospital care
- 🏠 Shelter: Homelessness, displacement, flood damage
- 👶 Orphan: Children without parents needing care and support
- 🌪️ Disaster: Natural disasters (floods, drought, storms)
- 📚 Education: School fees, books, learning materials
- 🌍 Other: Any emergency not fitting above categories

═══════════════════════════════════════════════════════
URGENCY LEVELS
═══════════════════════════════════════════════════════
- 🟣 CRITICAL: Life-threatening, needs help within hours/days
- 🔴 HIGH: Serious situation, needs help within days/week
- 🟡 MEDIUM: Significant need, help needed within weeks
- 🟢 LOW: Important but not immediately life-threatening

═══════════════════════════════════════════════════════
TECHNOLOGY STACK
═══════════════════════════════════════════════════════
Frontend: React 18 + Vite, React Router, inline CSS
Backend: Node.js + Express + TypeScript
Database: PostgreSQL (Neon cloud) + Prisma ORM
AI: Claude by Anthropic (Haiku for chat, Sonnet for case sanitization)
Cloud: Vercel (frontend), Railway (backend)
Maps/GPS: Google Maps API
Payments: Stripe, PayPal, Ama Gateway
File Storage: AWS S3 (photos and documents)
Security: JWT auth, bcrypt, OTP, AWS Rekognition
Mobile: React Native app for field agents (offline-capable)

═══════════════════════════════════════════════════════
IMPACT STATISTICS
═══════════════════════════════════════════════════════
- 2,400+ cases processed
- $1.2M+ in aid distributed
- 98.8% verification rate
- 6 cities covered in Somalia
- 100% of published cases physically verified by field teams

═══════════════════════════════════════════════════════
CONTACT & SUPPORT
═══════════════════════════════════════════════════════
- Email: support@kafaale.so
- Partners/NGOs: partners@kafaale.so
- Phone: +252 611 000 000
- Address: Mogadishu, Somalia
- Hours: Monday–Friday, 8am–6pm EAT
- Website: kafaale.so

═══════════════════════════════════════════════════════
FREQUENTLY ASKED QUESTIONS
═══════════════════════════════════════════════════════

Q: Is Kafaale Qaad a legitimate organization?
A: Yes. Kafaale Qaad is a registered humanitarian platform operating in Somalia. Every case published has been physically verified on the ground by our field team. We maintain complete audit trails for all cases and transactions.

Q: How do I know my donation actually reaches the person?
A: You receive a final impact report with GPS-tagged photos of the delivery, the beneficiary's confirmation, and a full audit trail. Funds are held in escrow and only released after delivery is confirmed by both the field team and admin.

Q: Can I sponsor part of a case?
A: Yes. Multiple donors can each contribute different amounts to the same case. You can donate any amount — full goal, partial, or custom.

Q: How long does it take from reporting to delivery?
A: Typically 3–14 days. Critical cases are prioritized and can be processed in 24–48 hours. The timeline depends on: field team availability, verification complexity, and how quickly a donor sponsors the case.

Q: What if the field team finds the case is false?
A: The case is immediately rejected and archived with full documentation of why it was rejected. The reporter's account is flagged and may be suspended. All evidence is kept in the audit trail.

Q: Can reporters stay anonymous?
A: Reporters' identities are protected and never shown to donors or the public. Only verification officers and admins can see reporter details.

Q: What currencies are accepted?
A: USD is the primary currency. The platform supports all major currencies through Stripe and PayPal, which handle currency conversion automatically.

Q: Is there a minimum donation amount?
A: No minimum. Any contribution helps. For very small donations, we recommend grouping with other donors on the same case.

Q: How does the AI sanitization work?
A: When a case is approved by a verification officer, the AI (Claude Sonnet) reads the private case details and automatically generates a completely safe public version — removing all personally identifiable information while writing a compelling, dignified story that gives donors enough context without exposing the victim.

Q: What happens if a case doesn't reach its funding goal?
A: Partially funded cases still receive aid proportional to what was raised. If a case receives no funding within 60 days, it is reviewed for extension or re-categorization.
`;

// ── Demo keyword responses (used when no API key) ────────────────────────────
const DEMO_RESPONSES: Record<string, string> = {

  // Workflow / How it works
  workflow: `Kafaale Qaad uses a strict 8-step verified pipeline that every case must complete:\n\n1️⃣ REPORT — Reporter submits case with photos & private details\n2️⃣ OFFICE REVIEW — Verification officer checks for duplicates & legitimacy\n3️⃣ FIELD INVESTIGATION — Field agent physically visits the location, takes GPS-tagged photos\n4️⃣ VERIFIED — Officer confirms case is real, case goes live to donors\n5️⃣ DONOR QUEUE — Verified case appears for sponsors to browse\n6️⃣ SPONSORED — Donor pays, funds held in secure escrow\n7️⃣ AID DELIVERY — Field team delivers aid, uploads GPS-tagged proof photos\n8️⃣ COMPLETED — Impact report auto-generated, donor notified, case archived\n\nNo step can be skipped. Every action is permanently logged. 100% of published cases are physically verified before donors ever see them.`,

  sponsor: `To sponsor a case on Kafaale Qaad:\n\n1. Go to /cases — browse all verified cases\n2. Filter by urgency (Critical/High/Medium/Low), category (food, medical, shelter, etc.) or city\n3. Click "Sponsor →" on the case you want\n4. Choose your amount — Full goal, Partial, or Custom\n5. Pay via Stripe (card), PayPal, Bank Transfer, or Ama Gateway (Somali mobile money)\n6. Funds go into secure escrow — held until delivery is confirmed\n7. You receive a tax certificate immediately\n8. After delivery, you get an impact report with GPS-tagged photos proving aid reached the person\n\nYou can sponsor anonymously, and multiple donors can share one case. Any amount accepted.`,

  verify: `Our verification system has 4 layers of checking before any case is shown to donors:\n\n🔍 Layer 1 — Reporter Submission: Reporter provides full private details, photos, exact location\n🤖 Layer 2 — AI Duplicate Check: Automatically detects if the same person was already submitted\n🏛️ Layer 3 — Office Review: Verification officer manually reviews the report, checks photos, legitimacy\n👣 Layer 4 — Physical Field Visit: A field agent physically travels to the location, meets the person, GPS-confirms they were there, takes evidence photos\n\nOnly after ALL 4 layers pass does the case become visible to donors. 98.8% of all published cases complete the full pipeline successfully.`,

  privacy: `Victim privacy is our highest priority. Here's exactly what we NEVER show publicly:\n\n❌ Full names (only descriptions like "elderly man" or "family of 4")\n❌ Phone numbers\n❌ Exact home address or GPS coordinates\n❌ National ID numbers\n❌ Medical records or diagnoses\n❌ Bank or financial details\n\n✅ What IS shown: City/district only, case category, urgency level, AI-generated anonymous story\n\nBefore going public, every case is processed by our AI (Claude) which reads the private data and generates a completely safe public version — protecting the victim's dignity while giving donors the context they need. Reporters' identities are also kept fully private.`,

  report: `To report an emergency case:\n\n1. Register as a Reporter at /login (2 minutes — just email, name, password)\n2. Go to Dashboard → "Report Case" OR visit /contact → "Report a Case" tab\n3. Fill in the form:\n   • Victim's full name (private)\n   • Age & gender\n   • Exact location (private — only city shown publicly)\n   • Urgency: Critical / High / Medium / Low\n   • Detailed description\n   • Upload photos if you have them\n   • Contact phone (optional)\n4. Submit — you'll get a reference number immediately\n5. Verification office reviews within 24-48 hours\n6. You'll receive status updates as the case moves through the pipeline\n\n⚠️ Only report genuine emergencies. False reports result in permanent account suspension.`,

  deliver: `After a case is sponsored and funded:\n\n1. Field team receives the delivery assignment on their mobile app\n2. They navigate to the beneficiary's location via GPS\n3. Aid is physically delivered — cash, food, medicine, clothing, school fees, or goods depending on category\n4. Field agent uploads:\n   • GPS-tagged photos at delivery location\n   • Beneficiary's confirmation (photo or signature)\n   • Detailed delivery notes\n5. Admin reviews and confirms delivery\n6. Case status changes to "Completed"\n7. Donor receives final impact report with all delivery proof\n8. Case archived in immutable audit trail\n\nFunds in escrow are only released AFTER delivery is confirmed — donors are fully protected.`,

  roles: `Kafaale Qaad has 6 distinct roles, each with their own dashboard:\n\n👁️ REPORTER — Submits emergency cases, tracks their submissions\n🏛️ VERIFICATION OFFICE — Reviews cases, assigns field teams, approves/rejects\n🗺️ FIELD TEAM — Physically investigates cases and delivers aid on the ground\n❤️ DONOR/SPONSOR — Browses verified cases, makes secure payments, receives impact reports\n🔧 ADMIN — Manages users, views analytics, handles escalations\n🛡️ SUPER ADMIN — Full platform control, fraud monitoring, all financial data\n\nEach role sees only what they need. Donors never see private victim data. Reporters never see each other's submissions. Full role-based access control on every endpoint.`,

  security: `Kafaale Qaad protects your data with practical, real controls:\n\n• Passwords hashed with bcrypt — never stored in plain text\n• Role-based access control on every endpoint — each role sees only what it should\n• All traffic served over HTTPS/TLS\n• Victim PII (names, phone, exact address, GPS) stored separately and never shown to donors or the public\n• Input validation and rate limiting on sensitive endpoints\n• Admin actions recorded in an audit log\n• Donations verified by our team before a case is marked funded`,

  payment: `Kafaale Qaad accepts the following payment methods:\n\n💳 Stripe — Credit/debit cards (Visa, Mastercard, Amex, etc.) — for international donors\n🅿️ PayPal — For international donors who prefer PayPal\n🏦 Bank Transfer — SWIFT international or local bank transfers\n📱 Ama Gateway — Somali local mobile money (for donors in Somalia)\n\nAll payments are:\n• Encrypted end-to-end\n• PCI DSS Level 1 certified (highest standard)\n• Held in secure escrow until delivery is confirmed\n• Tax certificates issued automatically\n• Anonymous donations supported\n• Any currency accepted (auto-converted)\n\nYour money CANNOT be released to the field until a verified delivery proof is uploaded.`,

  register: `To join Kafaale Qaad:\n\n1. Go to /login on the website\n2. Click "Register"\n3. Fill in: Full name, email, country, city, phone (optional), and password (min 8 chars)\n4. Choose your role:\n   • 📝 Reporter — to report emergency cases in your community\n   • 💳 Donor/Sponsor — to fund verified cases\n5. Account created immediately — no waiting period\n\nField agents, verification officers, and admins are onboarded directly by our team (contact partners@kafaale.so).`,

  category: `Cases on Kafaale Qaad are organized into 7 categories:\n\n🍚 FOOD — Hunger, malnutrition, food insecurity, emergency rations\n🏥 MEDICAL — Illness, injury, surgery costs, medicine, hospital care\n🏠 SHELTER — Homelessness, displacement, flood-damaged homes, temporary housing\n👶 ORPHAN — Children without parents needing care, education, housing\n🌪️ DISASTER — Floods, drought, storms, fire — sudden emergency situations\n📚 EDUCATION — School fees, books, uniforms, university costs\n🌍 OTHER — Any emergency that doesn't fit the above categories\n\nYou can filter cases by category on the /cases page to find what matters most to you.`,

  urgency: `Urgency levels on Kafaale Qaad:\n\n🟣 CRITICAL — Life-threatening emergency. Person may die without help within hours or days. Prioritized for immediate processing and donor matching.\n\n🔴 HIGH — Serious situation. Person is in significant danger or distress. Needs help within days to a week.\n\n🟡 MEDIUM — Significant need but not immediately life-threatening. Help needed within weeks to avoid deterioration.\n\n🟢 LOW — Important need but person is currently stable. Help needed within weeks to months.\n\nCritical cases are processed within 24-48 hours. All urgency levels are determined by the reporter and confirmed by field investigators.`,

  timeline: `How long does the process take?\n\n⚡ CRITICAL cases: 24-48 hours from submission to field visit\n🔴 HIGH cases: 2-5 days\n🟡 MEDIUM cases: 5-14 days\n🟢 LOW cases: 1-4 weeks\n\nFull timeline breakdown:\n• Report submission → Office review: within 24 hours\n• Office approval → Field investigation: 1-3 days\n• Field investigation → Verification: same day\n• Verification → Going live to donors: immediate\n• Donor sponsorship → Field delivery: 2-5 days after funding\n• Delivery → Impact report to donor: within 24 hours\n\nTotal: Typically 3-14 days from report to delivery for most cases.`,

  dashboard: `Kafaale Qaad has role-specific dashboards:\n\n📊 ADMIN/SUPER ADMIN DASHBOARD:\n• Overview stats (total cases, users, donations, completion rate)\n• Full case management pipeline\n• User management (add, edit, deactivate)\n• Real-time analytics and charts\n• Donation tracking\n• Fraud detection alerts\n\n📝 REPORTER DASHBOARD:\n• Submit new cases\n• Track status of submitted cases\n• View case reference numbers\n\n🗺️ FIELD AGENT DASHBOARD:\n• GPS-guided mission list\n• Investigation report submission\n• Delivery proof upload\n\n❤️ DONOR DASHBOARD:\n• Portfolio of sponsored cases\n• Impact reports\n• Transaction history\n\nAccess the dashboard at /dashboard — you must be logged in.`,

  contact: `Contact Kafaale Qaad:\n\n📧 Email: support@kafaale.so\n🤝 Partners/NGOs: partners@kafaale.so\n📞 Phone: +252 611 000 000\n📍 Address: Mogadishu, Somalia\n🌐 Website: kafaale.so\n⏰ Hours: Monday–Friday, 8am–6pm EAT\n\nFor emergency case reporting: Go to /contact → "Report a Case" tab\nFor partnership inquiries: Email partners@kafaale.so\nFor technical support: Email support@kafaale.so\n\nWe respond to all messages within 24 hours.`,

  ai: `Kafaale Qaad uses AI (Claude by Anthropic) in two ways:\n\n🤖 1. AI CASE SANITIZATION\nBefore any case goes public, Claude reads all private details and generates a completely safe public version — removing all personally identifiable information (names, addresses, phone numbers, GPS) while writing a dignified, compelling story that protects the victim while giving donors meaningful context. This happens automatically when an admin approves a case.\n\n🤖 2. AI CHAT ASSISTANT (that's me!)\nI help users understand the platform, guide them through sponsoring cases, explain the verification process, answer questions about privacy, and provide support 24/7. When a Anthropic API key is connected, I use Claude Haiku for fast, knowledgeable responses.\n\n🤖 3. AI FRAUD DETECTION\nReal-time anomaly detection that flags duplicate case submissions, suspicious patterns, and payment irregularities before they reach verification staff.`,

  escrow: `How the secure escrow system works:\n\nWhen a donor makes a payment, the money does NOT go directly to the beneficiary or field team. Instead:\n\n1. Payment is received and held in secure escrow\n2. Field team delivers the aid (without needing the money first — Kafaale Qaad pre-funds delivery)\n3. Delivery proof is uploaded: GPS-tagged photos + beneficiary confirmation\n4. Admin reviews and confirms delivery is legitimate\n5. ONLY THEN are escrow funds released\n\nThis means:\n✅ Donors are protected — if delivery fails, funds can be returned or redirected\n✅ Beneficiaries are protected — aid delivery is pre-funded\n✅ No one can take the money without proof of delivery\n✅ Complete accountability at every financial step`,

  default: `Assalamu Alaykum! 👋 I'm the Kafaale Qaad AI Assistant — I have deep knowledge of our entire platform.\n\nI can help you with:\n• 📋 How the 8-step verification workflow works\n• ❤️ How to sponsor or donate to a case\n• 📝 How to report an emergency case\n• 🛡️ Privacy and victim protection policies\n• 👥 User roles and what each role can do\n• 🔐 Security features and fraud prevention\n• 💰 Payment methods and how escrow works\n• ⏰ How long the process takes\n• 📱 Dashboard features for each role\n• 🤖 How AI is used on the platform\n• 📞 Contact information and support\n\nJust ask me anything about Kafaale Qaad!`,
};

// ── Keyword matching (much broader coverage) ─────────────────────────────────
function getDemoResponse(message: string): string {
  const msg = message.toLowerCase();

  // Escrow (check FIRST — "how does escrow work" would otherwise match workflow)
  if (msg.match(/escrow|where.*money|money.*go|hold.*fund|release.*fund/)) return DEMO_RESPONSES.escrow;

  // Timeline / how long (check BEFORE workflow — "how long does it take" matches workflow's how.*(does))
  if (msg.match(/how long|timeline|duration|days|hours|quick|fast|when.*deliver|report.*to.*deliver|from.*report/)) return DEMO_RESPONSES.timeline;

  // Payments / payment methods (check BEFORE sponsor and workflow)
  if (msg.match(/payment|pay.*method|stripe|paypal|bank.*transfer|ama.*gateway|currency|accepted.*pay|how.*pay/)) return DEMO_RESPONSES.payment;

  // Workflow / pipeline / how it works / process / steps
  if (msg.match(/workflow|pipeline|step|process|how.*(work|does|it)|8.step|verif.*process|case.*process/)) return DEMO_RESPONSES.workflow;

  // Sponsoring / donating / funding
  if (msg.match(/sponsor|donat|fund|give|contribut|support.*case|how.*(give|help|sponsor)/)) return DEMO_RESPONSES.sponsor;

  // Verification / trust / real / legitimate / fake
  if (msg.match(/verif|trust|real|legit|fake|fraud|duplicat|genuine|authentic/)) return DEMO_RESPONSES.verify;

  // Privacy / PII / personal / name / address / protect victim
  if (msg.match(/privac|pii|personal|name|address|phone|protect.*victim|victim.*protect|identit|anonymo/)) return DEMO_RESPONSES.privacy;

  // Reporting a case
  if (msg.match(/report|submit.*case|create.*case|new case|emergency.*report|how.*(report|submit)/)) return DEMO_RESPONSES.report;

  // Delivery / proof / evidence / aid delivery
  if (msg.match(/deliver|proof|receipt|evidence|confirm.*delivery|aid.*deliver|deliver.*aid/)) return DEMO_RESPONSES.deliver;

  // Roles
  if (msg.match(/role|who.*use|reporter|field.*(agent|team)|verification.*(office|officer)|super.?admin|donor.*role|what.*(role|can.*do)/)) return DEMO_RESPONSES.roles;

  // Security / encryption / OTP / 2FA / safe
  if (msg.match(/secur|encrypt|otp|2fa|safe|hack|gdpr|pci|biometric|face.*verif/)) return DEMO_RESPONSES.security;

  // Escrow / money flow (check BEFORE generic money)
  if (msg.match(/escrow|where.*money|money.*go|funds|hold.*fund|release.*fund/)) return DEMO_RESPONSES.escrow;

  // Generic money/payment fallback
  if (msg.match(/money|pay|fund|cash/)) return DEMO_RESPONSES.payment;

  // Registration / sign up / join / account
  if (msg.match(/register|sign.?up|join|account|create.*account|get.*started|how.*(join|start)/)) return DEMO_RESPONSES.register;

  // Categories
  if (msg.match(/categor|food|medical|shelter|orphan|disaster|education|type.*case/)) return DEMO_RESPONSES.category;

  // Urgency levels
  if (msg.match(/urgency|critical|high|medium|low|priority|urgent|emergency level/)) return DEMO_RESPONSES.urgency;

  // Timeline / how long
  if (msg.match(/how long|timeline|time|duration|days|hours|quick|fast|slow|when/)) return DEMO_RESPONSES.timeline;

  // Dashboard
  if (msg.match(/dashboard|panel|overview|interface|ui|portal|access/)) return DEMO_RESPONSES.dashboard;

  // Contact
  if (msg.match(/contact|email|phone|address|reach|support|help.*team|office/)) return DEMO_RESPONSES.contact;

  // AI features
  if (msg.match(/ai|artificial|intelligent|automat|sanitiz|claude|anthropic|machine/)) return DEMO_RESPONSES.ai;

  // Escrow / how money works
  if (msg.match(/escrow|where.*money|money.*go|funds|hold|release.*fund/)) return DEMO_RESPONSES.escrow;

  // Hello / greetings
  if (msg.match(/^(hi|hello|hey|salam|assalam|greet|marhaba|how are)/)) return `Assalamu Alaykum! 👋 Welcome to Kafaale Qaad!\n\nI'm the AI Assistant for this humanitarian aid platform. I can answer any question about:\n\n• How the 8-step verification workflow works\n• How to sponsor a case (step by step)\n• How to report an emergency\n• Privacy and victim protection\n• User roles (Reporter, Field Agent, Donor, Admin)\n• Security features\n• Payment methods and escrow\n• How long the process takes\n\nWhat would you like to know?`;

  return DEMO_RESPONSES.default;
}

// POST /api/ai/chat — AI Assistant
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, context = 'general', caseId } = req.body;
    if (!message || typeof message !== 'string' || message.length > 2000) {
      return res.status(400).json({ error: 'Invalid message' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    // ── DEMO MODE (no API key) ──────────────────────────────────
    if (!apiKey) {
      const reply = getDemoResponse(message);
      return res.json({ reply, mode: 'demo' });
    }

    // ── LIVE MODE (with API key) ────────────────────────────────
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey });

    let caseContext = '';
    if (caseId) {
      const kase = await prisma.case.findUnique({
        where: { id: caseId },
        select: {
          publicTitle: true, publicCity: true, category: true,
          emergencyLevel: true, targetGoal: true, totalRaised: true,
          status: true, publicStory: true,
        },
      }).catch(() => null);
      if (kase) {
        const pct = kase.targetGoal > 0 ? Math.round((kase.totalRaised / kase.targetGoal) * 100) : 0;
        caseContext = `\n\nCURRENTLY VIEWING CASE:\nTitle: "${kase.publicTitle}"\nLocation: ${kase.publicCity}\nCategory: ${kase.category}\nUrgency: ${kase.emergencyLevel}\nStatus: ${kase.status}\nFunding: $${kase.totalRaised} raised of $${kase.targetGoal} goal (${pct}% funded)\nSummary: ${kase.publicStory?.slice(0, 300)}...`;
      }
    }

    const systemPrompt = `${SYSTEM_KNOWLEDGE}

${caseContext}

INSTRUCTIONS FOR RESPONDING:
- You are the official Kafaale Qaad AI Assistant embedded on the platform website
- Answer questions thoroughly and with genuine depth — users deserve complete answers, not vague summaries
- Use bullet points, numbered steps, and emojis where they improve clarity
- For process questions, walk through every step
- For "how to" questions, give exact step-by-step instructions
- Always be warm, encouraging, and supportive of the humanitarian mission
- If someone wants to donate or sponsor, guide them clearly and enthusiastically
- If someone seems to be in an emergency situation, prioritize directing them to report a case
- You can speak some Somali words naturally (Assalamu Alaykum, Mahadsanid, etc.)
- Do NOT say "I'm just an AI" or refuse to answer platform-related questions
- Do NOT invent information not in the knowledge base above
- Keep responses well-structured — use sections and formatting for complex answers
- Maximum response length: give as much detail as the question needs`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
    });

    const reply = response.content[0].type === 'text' ? response.content[0].text : 'Unable to process.';
    sysLog.info(`🤖 AI chat (live): ${message.slice(0, 80)}`);
    res.json({ reply, mode: 'live', tokensUsed: response.usage.input_tokens + response.usage.output_tokens });

  } catch (err: any) {
    sysLog.error('AI chat error', err);
    res.json({ reply: getDemoResponse(req.body.message || ''), mode: 'demo-fallback' });
  }
});

// POST /api/ai/sanitize/:caseId — Admin triggers AI sanitization
router.post('/sanitize/:caseId', authenticate, requireRole(['admin','super_admin','verification_office']), async (req: AuthRequest, res: Response) => {
  try {
    const kase = await prisma.case.findUnique({
      where: { id: req.params.caseId },
      include: { fieldInvestigation: true },
    }) as any;
    if (!kase) return res.status(404).json({ error: 'Case not found' });

    const apiKey = process.env.ANTHROPIC_API_KEY;

    let aiData: any;

    if (!apiKey) {
      // ── DEMO sanitization ─────────────────────────────────────
      const cityHint = kase.privateAddress
        ? kase.privateAddress.split(',').slice(-2).join(',').trim()
        : 'Somalia';
      aiData = {
        generatedTitle: `Urgent ${kase.category.charAt(0).toUpperCase() + kase.category.slice(1)} Support Needed in ${cityHint}`,
        generatedStory: `A family in ${cityHint} is facing a serious ${kase.category} emergency. Our field team has physically verified the situation and confirmed the urgent need for support. With your sponsorship, we can deliver immediate assistance to those in critical need. Every contribution makes a real difference in transforming a life.`,
        generatedCity: cityHint,
        generatedUrgency: kase.emergencyLevel,
        piiDetected: true,
        piiRemoved: ['victim full name', 'phone number', 'exact home address', 'GPS coordinates'],
        confidenceScore: 87,
        mode: 'demo',
      };
    } else {
      // ── LIVE AI sanitization ──────────────────────────────────
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey });

      const prompt = `You are a humanitarian aid sanitization AI for Kafaale Qaad. Generate a SAFE PUBLIC VERSION of this emergency case.

RULES:
- Remove ALL PII: full names, phones, exact addresses, GPS coordinates, national IDs, medical record numbers
- Keep only city/district level location (no street names or house numbers)
- Write with dignity, empathy and respect for the victim
- Make the story compelling enough that donors want to help, but never sensationalize
- The generated story should be 2-3 paragraphs
- Title should be 60-80 characters, descriptive but no names

PRIVATE CASE DATA:
Category: ${kase.category}
Urgency Level: ${kase.emergencyLevel}
Description: ${kase.privateDescription}
Location hint: ${kase.privateAddress ? kase.privateAddress.split(',').slice(-2).join(',').trim() : 'Somalia'}
Family size: ${kase.privateFamilySize || 'not specified'}
${kase.fieldInvestigation ? `Field team notes: ${kase.fieldInvestigation.officialNotes || 'Verified on site'}` : ''}

Respond with ONLY valid JSON (no markdown, no extra text):
{
  "generatedTitle": "compelling title, max 80 chars, no names",
  "generatedStory": "2-3 paragraphs, dignified, no PII, compelling for donors",
  "generatedCity": "City, District/Region only",
  "generatedUrgency": "critical|high|medium|low",
  "piiDetected": true,
  "piiRemoved": ["list each type of PII that was removed"],
  "confidenceScore": 0-100
}`;

      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return res.status(500).json({ error: 'AI returned invalid JSON' });
      aiData = JSON.parse(match[0]);
      aiData.mode = 'live';
    }

    // Save AI output and update case
    await prisma.aiPublicData.upsert({
      where: { caseId: kase.id },
      update: {
        generatedTitle:    aiData.generatedTitle,
        generatedStory:    aiData.generatedStory,
        generatedCategory: kase.category,
        generatedCity:     aiData.generatedCity,
        generatedUrgency:  aiData.generatedUrgency,
        piiDetected:       aiData.piiDetected,
        piiRemoved:        JSON.stringify(aiData.piiRemoved || []),
        confidenceScore:   aiData.confidenceScore,
        updatedAt:         new Date(),
      },
      create: {
        caseId:            kase.id,
        generatedTitle:    aiData.generatedTitle,
        generatedStory:    aiData.generatedStory,
        generatedCategory: kase.category,
        generatedCity:     aiData.generatedCity,
        generatedUrgency:  aiData.generatedUrgency,
        safeMediaUrls:     JSON.stringify([]),
        piiDetected:       aiData.piiDetected,
        piiRemoved:        JSON.stringify(aiData.piiRemoved || []),
        mediaFlagged:      JSON.stringify([]),
        confidenceScore:   aiData.confidenceScore,
        model:             apiKey ? 'claude-sonnet-4-6' : 'demo-mode',
      },
    });

    await prisma.case.update({
      where: { id: kase.id },
      data: {
        status:         'ai_sanitized',
        publicTitle:    aiData.generatedTitle,
        publicStory:    aiData.generatedStory,
        publicCity:     aiData.generatedCity,
        publicCountry:  'Somalia',
        aiSanitizedAt:  new Date(),
      },
    });

    sysLog.info(`🤖 Case ${kase.id} sanitized (${aiData.mode})`);
    res.json({ message: 'Case sanitized successfully', aiData, caseId: kase.id });

  } catch (err: any) {
    sysLog.error('AI sanitize error', err);
    res.status(500).json({ error: 'AI sanitization failed', details: err.message });
  }
});

export default router;
