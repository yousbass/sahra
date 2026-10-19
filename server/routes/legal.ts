import { Router, IRouter } from "express";

const router: IRouter = Router();

const BRAND = "MUKHYMAT";
const SUPPORT_EMAIL = "support@mukhymat.com";
const LAST_UPDATED = "10 August 2026";

const pageShell = (title: string, body: string) => `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — ${BRAND}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0A1128;
      color: #E8E4DC;
      min-height: 100vh;
      padding: 0 0 80px;
    }
    .header {
      background: linear-gradient(135deg, #0A1128 0%, #111d3d 100%);
      border-bottom: 1px solid rgba(240,160,60,0.2);
      padding: 32px 24px 28px;
      position: sticky; top: 0; z-index: 10;
    }
    .header-inner { max-width: 760px; margin: 0 auto; }
    .brand { color: #F0A03C; font-size: 13px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px; }
    .page-title { font-size: clamp(22px, 5vw, 32px); font-weight: 800; color: #fff; line-height: 1.2; }
    .updated { font-size: 12px; color: rgba(232,228,220,0.5); margin-top: 6px; }
    .content { max-width: 760px; margin: 0 auto; padding: 40px 24px 0; }
    .toc { background: rgba(255,255,255,0.04); border: 1px solid rgba(240,160,60,0.15); border-radius: 16px; padding: 24px; margin-bottom: 40px; }
    .toc-title { color: #F0A03C; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 14px; }
    .toc ol { padding-left: 18px; }
    .toc li { margin-bottom: 8px; }
    .toc a { color: rgba(232,228,220,0.75); text-decoration: none; font-size: 14px; }
    .toc a:hover { color: #F0A03C; }
    section { margin-bottom: 40px; scroll-margin-top: 100px; }
    h2 { font-size: 20px; font-weight: 700; color: #F0A03C; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid rgba(240,160,60,0.2); display: flex; align-items: center; gap: 10px; }
    h2 .num { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; background: rgba(240,160,60,0.15); font-size: 13px; font-weight: 800; color: #F0A03C; flex-shrink: 0; }
    h3 { font-size: 15px; font-weight: 700; color: #fff; margin: 20px 0 8px; }
    p { font-size: 15px; line-height: 1.75; color: rgba(232,228,220,0.85); margin-bottom: 14px; }
    ul, ol { padding-left: 22px; margin-bottom: 14px; }
    li { font-size: 15px; line-height: 1.75; color: rgba(232,228,220,0.85); margin-bottom: 6px; }
    strong { color: #E8E4DC; font-weight: 700; }
    a { color: #F0A03C; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .highlight { background: rgba(240,160,60,0.08); border-left: 3px solid #F0A03C; border-radius: 0 8px 8px 0; padding: 14px 18px; margin: 16px 0; }
    .highlight p { margin: 0; }
    .table-wrap { overflow-x: auto; margin: 16px 0; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { background: rgba(240,160,60,0.12); color: #F0A03C; font-weight: 700; padding: 12px 16px; text-align: left; }
    td { padding: 11px 16px; border-top: 1px solid rgba(255,255,255,0.06); color: rgba(232,228,220,0.85); vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .contact-box { background: rgba(240,160,60,0.08); border: 1px solid rgba(240,160,60,0.25); border-radius: 16px; padding: 24px; margin-top: 40px; }
    .contact-box h3 { margin-top: 0; color: #F0A03C; }
    .footer { text-align: center; color: rgba(232,228,220,0.35); font-size: 12px; margin-top: 60px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.06); }
    .badge { display: inline-block; background: rgba(240,160,60,0.15); color: #F0A03C; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 2px 8px; border-radius: 6px; margin-left: 6px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-inner">
      <div class="brand">${BRAND}</div>
      <div class="page-title">${title}</div>
      <div class="updated">Last updated: ${LAST_UPDATED}</div>
    </div>
  </div>
  <div class="content">
    ${body}
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${BRAND}. All rights reserved. Kingdom of Bahrain.</p>
      <p style="margin-top:8px"><a href="/api/legal/privacy">Privacy Policy</a> &nbsp;·&nbsp; <a href="/api/legal/terms">Terms of Service</a> &nbsp;·&nbsp; <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
    </div>
  </div>
</body>
</html>`;

// ─────────────────────────────────────────────────────────
// PRIVACY POLICY
// ─────────────────────────────────────────────────────────
router.get("/legal/privacy", (_req, res) => {
  const body = `
    <div class="toc">
      <div class="toc-title">Contents</div>
      <ol>
        <li><a href="#s1">Who We Are</a></li>
        <li><a href="#s2">Information We Collect</a></li>
        <li><a href="#s3">How We Use Your Information</a></li>
        <li><a href="#s4">How We Share Your Information</a></li>
        <li><a href="#s5">Data Retention</a></li>
        <li><a href="#s6">Your Rights</a></li>
        <li><a href="#s7">Cookies & Local Storage</a></li>
        <li><a href="#s8">Children's Privacy</a></li>
        <li><a href="#s9">Security</a></li>
        <li><a href="#s10">International Transfers</a></li>
        <li><a href="#s11">Changes to This Policy</a></li>
        <li><a href="#s12">Contact Us</a></li>
      </ol>
    </div>

    <div class="highlight">
      <p><strong>Summary:</strong> MUKHYMAT collects the personal information you provide when you register, book, or use our platform — and the minimum usage data needed to operate the service. We do not sell your data. We share it only with the service providers named in this policy and as required by Bahraini law. You have the right to access, correct, and delete your data at any time by contacting us.</p>
    </div>

    <section id="s1">
      <h2><span class="num">1</span> Who We Are</h2>
      <p>MUKHYMAT ("we", "us", "our") is a digital marketplace operating in the Kingdom of Bahrain that connects guests with hosts offering desert camp and beach kashta experiences. Our platform is accessible via mobile application and website.</p>
      <p>We act as a <strong>data controller</strong> under Bahrain's Personal Data Protection Law (Legislative Decree No. 30 of 2018, "PDPL") for personal data collected through our platform.</p>
      <p><strong>Registered address:</strong> Kingdom of Bahrain<br/>
      <strong>Contact:</strong> <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
    </section>

    <section id="s2">
      <h2><span class="num">2</span> Information We Collect</h2>

      <h3>2.1 Information You Provide Directly</h3>
      <ul>
        <li><strong>Account registration:</strong> Full name, email address, password (stored in hashed form by Firebase Authentication), phone number.</li>
        <li><strong>Profile:</strong> Profile photo, display name, preferred language.</li>
        <li><strong>Booking:</strong> Check-in date, number of guests, estimated arrival time, phone number for host coordination, special requests.</li>
        <li><strong>Payment:</strong> Payment card details (processed and stored exclusively by Tap Payments — we never store card numbers on our servers).</li>
        <li><strong>Host / seller applications:</strong> Business information, listing descriptions, photographs of the property, pricing, and availability data.</li>
        <li><strong>Communications:</strong> Messages, support requests, and reviews you submit.</li>
      </ul>

      <h3>2.2 Information Collected Automatically</h3>
      <ul>
        <li><strong>Usage data:</strong> Pages viewed, features used, search queries, filter selections, and time spent on screens.</li>
        <li><strong>Device information:</strong> Device type, operating system version, app version, and unique device identifiers.</li>
        <li><strong>Log data:</strong> IP address, browser type, referring URL, and timestamps of server requests.</li>
        <li><strong>Crash reports:</strong> Stack traces and error logs used to diagnose technical problems (contain no payment or password data).</li>
      </ul>

      <h3>2.3 Information From Third Parties</h3>
      <ul>
        <li><strong>Google Sign-In:</strong> If you choose to sign in with Google, we receive your name, email address, and profile photo from Google's OAuth service.</li>
        <li><strong>Tap Payments:</strong> We receive a payment confirmation reference and transaction status — not your card details.</li>
      </ul>
    </section>

    <section id="s3">
      <h2><span class="num">3</span> How We Use Your Information</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Purpose</th><th>Legal Basis (PDPL)</th></tr></thead>
          <tbody>
            <tr><td>Create and manage your account</td><td>Contract performance</td></tr>
            <tr><td>Process bookings and payments</td><td>Contract performance</td></tr>
            <tr><td>Send booking confirmation, reminder, and cancellation emails</td><td>Contract performance</td></tr>
            <tr><td>Connect you with the host for coordination (sharing phone number)</td><td>Contract performance / Legitimate interest</td></tr>
            <tr><td>Detect fraud, prevent double-booking, and enforce our policies</td><td>Legitimate interest / Legal obligation</td></tr>
            <tr><td>Improve the platform, fix bugs, and analyse usage patterns</td><td>Legitimate interest</td></tr>
            <tr><td>Respond to support requests</td><td>Legitimate interest / Contract</td></tr>
            <tr><td>Comply with Bahraini law (tax, anti-money laundering, judicial orders)</td><td>Legal obligation</td></tr>
            <tr><td>Send service announcements and important policy updates</td><td>Legitimate interest</td></tr>
            <tr><td>Send optional promotional communications (only with your consent)</td><td>Consent (you may withdraw at any time)</td></tr>
          </tbody>
        </table>
      </div>
      <p>We do <strong>not</strong> use your personal data to train artificial-intelligence models, and we do not sell, rent, or trade your personal information to third parties for their own marketing.</p>
    </section>

    <section id="s4">
      <h2><span class="num">4</span> How We Share Your Information</h2>

      <h3>4.1 With Hosts</h3>
      <p>When you complete a booking, we share your name and phone number with the host to enable check-in coordination. We share your review (if you write one) publicly on the listing page.</p>

      <h3>4.2 With Guests (for Hosts)</h3>
      <p>Host names and listing details (including photos submitted by hosts) are visible to all users, including unauthenticated visitors. Hosts' private contact details are not displayed publicly.</p>

      <h3>4.3 Service Providers</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Provider</th><th>Purpose</th><th>Location</th></tr></thead>
          <tbody>
            <tr><td><strong>Google Firebase</strong></td><td>Authentication, real-time database (Firestore), and file storage for profile and listing photos</td><td>Global (Google LLC, USA)</td></tr>
            <tr><td><strong>Tap Payments</strong></td><td>Payment card processing and authorisation</td><td>Kingdom of Bahrain / UAE</td></tr>
            <tr><td><strong>Resend</strong></td><td>Transactional email delivery (booking confirmations, reminders)</td><td>USA</td></tr>
          </tbody>
        </table>
      </div>
      <p>All service providers are contractually required to process your data only as instructed by us and to implement appropriate security measures.</p>

      <h3>4.4 Legal Obligations</h3>
      <p>We may disclose your information to government authorities, courts, or law enforcement agencies if required to do so by Bahraini law, judicial order, or to protect the rights, property, or safety of our users and the public.</p>

      <h3>4.5 Business Transfers</h3>
      <p>In the event of a merger, acquisition, or sale of all or part of our business, your data may be transferred to the acquiring entity. We will notify you by email and/or prominent in-app notice at least 30 days before any such transfer and give you the opportunity to delete your account.</p>
    </section>

    <section id="s5">
      <h2><span class="num">5</span> Data Retention</h2>
      <p>We retain your personal data for as long as necessary to provide the service and comply with our legal obligations:</p>
      <ul>
        <li><strong>Account data:</strong> Retained until you delete your account, plus 90 days for backup purposes.</li>
        <li><strong>Booking records:</strong> Retained for 7 years after the booking date to comply with Bahraini commercial record-keeping requirements.</li>
        <li><strong>Payment transaction records:</strong> Retained for 7 years in accordance with financial regulation requirements.</li>
        <li><strong>Profile photos:</strong> Deleted from storage within 30 days after you remove them or delete your account.</li>
        <li><strong>Server logs:</strong> Retained for 90 days, then automatically purged.</li>
        <li><strong>Inactive accounts:</strong> We will notify you by email after 24 months of inactivity and delete the account 60 days later if no action is taken.</li>
      </ul>
    </section>

    <section id="s6">
      <h2><span class="num">6</span> Your Rights</h2>
      <p>Under Bahrain's Personal Data Protection Law (PDPL), you have the following rights:</p>
      <ul>
        <li><strong>Right of access:</strong> Request a copy of the personal data we hold about you.</li>
        <li><strong>Right to rectification:</strong> Correct inaccurate or incomplete data — you can update most profile data directly in the app.</li>
        <li><strong>Right to erasure ("right to be forgotten"):</strong> Request deletion of your personal data, subject to legal retention obligations.</li>
        <li><strong>Right to restriction:</strong> Request that we limit how we process your data in certain circumstances.</li>
        <li><strong>Right to data portability:</strong> Receive your data in a structured, machine-readable format.</li>
        <li><strong>Right to object:</strong> Object to processing based on legitimate interests, including direct marketing.</li>
        <li><strong>Right to withdraw consent:</strong> Where processing is based on consent, you may withdraw it at any time without affecting the lawfulness of prior processing.</li>
      </ul>
      <p>To exercise any of these rights, contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>. We will respond within <strong>30 days</strong>. If you are dissatisfied with our response, you have the right to lodge a complaint with Bahrain's relevant data protection authority.</p>
    </section>

    <section id="s7">
      <h2><span class="num">7</span> Cookies &amp; Local Storage</h2>
      <p>Our mobile application does not use traditional browser cookies. We use <strong>device local storage</strong> and <strong>Firebase authentication tokens</strong> to keep you signed in between sessions.</p>
      <p>Our web interface may use the following:</p>
      <ul>
        <li><strong>Strictly necessary tokens:</strong> Firebase authentication session tokens. These are required for the service to function and cannot be disabled.</li>
        <li><strong>Preference storage:</strong> Language preference (Arabic/English) stored locally on your device.</li>
        <li><strong>Favourites storage:</strong> Your saved favourite listings, stored locally on your device.</li>
      </ul>
      <p>We do not use advertising cookies, tracking pixels, or third-party analytics cookies.</p>
    </section>

    <section id="s8">
      <h2><span class="num">8</span> Children's Privacy</h2>
      <p>Our platform is intended for users aged <strong>18 years and older</strong>. We do not knowingly collect personal data from anyone under the age of 18. If you believe a child has provided us with personal data, please contact us immediately at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a> and we will delete it promptly.</p>
    </section>

    <section id="s9">
      <h2><span class="num">9</span> Security</h2>
      <p>We take the security of your personal data seriously and implement measures appropriate to the sensitivity of the data, including:</p>
      <ul>
        <li>All data transmitted between your device and our servers is encrypted using <strong>TLS 1.2 or higher</strong>.</li>
        <li>Passwords are never stored — authentication is handled by <strong>Firebase Authentication</strong> using industry-standard hashing.</li>
        <li>Payment data is processed by <strong>Tap Payments</strong>, which is PCI-DSS compliant. We never receive or store raw card numbers.</li>
        <li>Access to production databases and servers is restricted to authorised personnel only, using multi-factor authentication.</li>
        <li>We conduct periodic security reviews of our infrastructure and code.</li>
      </ul>
      <p>While we implement robust safeguards, no system is completely immune to breaches. If we become aware of a data breach that is likely to result in a high risk to your rights and freedoms, we will notify you without undue delay in accordance with PDPL requirements.</p>
    </section>

    <section id="s10">
      <h2><span class="num">10</span> International Data Transfers</h2>
      <p>Some of our service providers (Google Firebase, Resend) operate servers outside the Kingdom of Bahrain, including in the United States. When we transfer your data internationally, we ensure adequate protections are in place through:</p>
      <ul>
        <li>Standard contractual clauses approved by relevant data protection authorities.</li>
        <li>Using providers that maintain internationally recognised security certifications (SOC 2, ISO 27001).</li>
      </ul>
    </section>

    <section id="s11">
      <h2><span class="num">11</span> Changes to This Policy</h2>
      <p>We may update this Privacy Policy from time to time. When we make material changes, we will:</p>
      <ul>
        <li>Update the "Last updated" date at the top of this page.</li>
        <li>Send you an email notification to the address associated with your account.</li>
        <li>Display a prominent notice in the app for at least 14 days after the update.</li>
      </ul>
      <p>Your continued use of the platform after the effective date of any changes constitutes your acceptance of the revised policy. If you disagree with the changes, you may delete your account at any time.</p>
    </section>

    <section id="s12">
      <h2><span class="num">12</span> Contact Us</h2>
      <div class="contact-box">
        <h3>Privacy Enquiries</h3>
        <p>For any questions, concerns, or requests relating to your personal data or this Privacy Policy, please contact our data privacy team:</p>
        <p>
          <strong>Email:</strong> <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a><br/>
          <strong>Subject line:</strong> "Privacy Request — [Your Name]"<br/>
          <strong>Response time:</strong> Within 30 calendar days
        </p>
        <p style="margin-bottom:0">We are committed to resolving your concerns. If you are not satisfied with our response, you have the right to escalate to the relevant Bahraini supervisory authority.</p>
      </div>
    </section>
  `;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(pageShell("Privacy Policy", body));
});

// ─────────────────────────────────────────────────────────
// TERMS OF SERVICE
// ─────────────────────────────────────────────────────────
router.get("/legal/terms", (_req, res) => {
  const body = `
    <div class="toc">
      <div class="toc-title">Contents</div>
      <ol>
        <li><a href="#t1">Definitions</a></li>
        <li><a href="#t2">Eligibility & Account</a></li>
        <li><a href="#t3">The MUKHYMAT Platform</a></li>
        <li><a href="#t4">Bookings & Payments</a></li>
        <li><a href="#t5">Cancellation & Refund Policy</a></li>
        <li><a href="#t6">Guest Responsibilities</a></li>
        <li><a href="#t7">Host Responsibilities</a></li>
        <li><a href="#t8">Marketplace</a></li>
        <li><a href="#t9">Ratings & Reviews</a></li>
        <li><a href="#t10">Prohibited Conduct</a></li>
        <li><a href="#t11">Intellectual Property</a></li>
        <li><a href="#t12">Disclaimers & Limitation of Liability</a></li>
        <li><a href="#t13">Indemnification</a></li>
        <li><a href="#t14">Dispute Resolution</a></li>
        <li><a href="#t15">Governing Law</a></li>
        <li><a href="#t16">General Provisions</a></li>
        <li><a href="#t17">Contact</a></li>
      </ol>
    </div>

    <div class="highlight">
      <p><strong>Please read these Terms carefully.</strong> By accessing or using MUKHYMAT, you agree to be bound by these Terms of Service. If you do not agree, do not use the platform. These Terms form a legally binding agreement between you and MUKHYMAT.</p>
    </div>

    <section id="t1">
      <h2><span class="num">1</span> Definitions</h2>
      <p>Throughout these Terms, the following words have the meanings given:</p>
      <ul>
        <li><strong>"Platform"</strong> means the MUKHYMAT mobile application, website, and any related services.</li>
        <li><strong>"We / Us / MUKHYMAT"</strong> means the operator of the MUKHYMAT platform, based in the Kingdom of Bahrain.</li>
        <li><strong>"Guest"</strong> means any registered user who browses, searches for, or books a listing.</li>
        <li><strong>"Host"</strong> means any registered user who lists a desert camp, beach kashta, or other accommodation on the platform.</li>
        <li><strong>"Listing"</strong> means any camp, kashta, or accommodation offered by a Host through the Platform.</li>
        <li><strong>"Booking"</strong> means a confirmed reservation of a Listing by a Guest.</li>
        <li><strong>"Marketplace"</strong> means the in-platform catalogue of food, equipment, and supplies offered alongside accommodation experiences.</li>
        <li><strong>"BHD"</strong> means Bahraini Dinar, the currency of all transactions on the Platform.</li>
        <li><strong>"Service Fee"</strong> means the platform commission deducted from the total booking price before remittance to the Host.</li>
      </ul>
    </section>

    <section id="t2">
      <h2><span class="num">2</span> Eligibility &amp; Account</h2>

      <h3>2.1 Age Requirement</h3>
      <p>You must be at least <strong>18 years of age</strong> to create an account or make a booking. By using the Platform, you represent and warrant that you meet this requirement. MUKHYMAT reserves the right to close accounts found to belong to minors.</p>

      <h3>2.2 Account Accuracy</h3>
      <p>You must provide accurate, current, and complete information when creating your account and keep it updated. You are responsible for all activity that occurs under your account credentials. Do not share your password.</p>

      <h3>2.3 One Account Per Person</h3>
      <p>Each individual may hold only one personal account. Creating multiple accounts to circumvent suspensions, restrictions, or platform policies is a material breach of these Terms and will result in permanent removal from the Platform.</p>

      <h3>2.4 Account Suspension & Termination</h3>
      <p>MUKHYMAT may suspend or terminate your account at any time, with or without notice, if you violate these Terms, if your account shows signs of fraud or abuse, or if required by law. Upon termination, any pending bookings you have made as a Guest will be cancelled in accordance with the applicable cancellation policy.</p>
    </section>

    <section id="t3">
      <h2><span class="num">3</span> The MUKHYMAT Platform</h2>

      <h3>3.1 Role of MUKHYMAT</h3>
      <p>MUKHYMAT is a <strong>marketplace platform</strong>. We connect Guests with Hosts, but we are not a party to the booking contract between Guest and Host. We do not own, operate, inspect, or control any Listing. MUKHYMAT is not responsible for the condition, safety, or accuracy of any Listing, or the conduct of any Host or Guest.</p>

      <h3>3.2 Verification</h3>
      <p>MUKHYMAT reviews Host applications and may request identity or business documents. However, MUKHYMAT does not independently verify all information provided by Hosts or Guests. You rely on Listings at your own discretion.</p>

      <h3>3.3 Service Availability</h3>
      <p>Camp and kashta bookings are subject to seasonal availability. MUKHYMAT operates primarily during the cooler desert-camping season (approximately October 15 to April 15 each year). Listings outside this window may have limited or no availability. We reserve the right to adjust seasonal dates based on conditions.</p>

      <h3>3.4 Platform Changes</h3>
      <p>We reserve the right to modify, suspend, or discontinue any feature of the Platform at any time. We will provide reasonable advance notice for material changes that affect existing confirmed bookings.</p>
    </section>

    <section id="t4">
      <h2><span class="num">4</span> Bookings &amp; Payments</h2>

      <h3>4.1 Booking Process</h3>
      <p>To book a Listing, you must: (i) be signed in with a verified account, (ii) select your check-in date, (iii) specify the number of guests (within the Listing's stated capacity), (iv) provide a valid phone number for host coordination, and (v) complete payment. A Booking is confirmed only upon successful payment authorisation and in-app confirmation.</p>

      <h3>4.2 Price Display</h3>
      <p>All prices shown on Listings are in <strong>Bahraini Dinar (BHD)</strong> and represent the cost for the full camp or kashta per night — not per person. A detailed price breakdown (base price + service fee + total) is shown before you confirm payment.</p>

      <h3>4.3 Service Fee</h3>
      <p>MUKHYMAT charges a service fee on each booking. The service fee is shown transparently in the price breakdown before you confirm. The fee covers platform operation, payment processing, customer support, and host verification.</p>

      <h3>4.4 Payment Methods</h3>
      <p>Online card payment is processed securely by <strong>Tap Payments</strong>, a licensed payment service provider. Depending on the Listing, the Host may also offer a "Cash on Arrival" option, in which the full amount is payable to the Host at check-in. MUKHYMAT is not responsible for cash transactions between Guests and Hosts.</p>

      <h3>4.5 Payment Authorisation</h3>
      <p>By providing your payment details, you authorise MUKHYMAT (via Tap Payments) to charge the total booking amount. Charges are made at the time of booking. For cash-on-arrival bookings, your reservation is held without charge; the Host records payment at check-in.</p>

      <h3>4.6 VAT</h3>
      <p>All prices displayed are inclusive of any applicable Value Added Tax (VAT) at the prevailing Bahraini rate. MUKHYMAT will issue an electronic receipt upon request.</p>

      <h3>4.7 Booking Confirmation</h3>
      <p>A booking confirmation will be sent to your registered email address. If you do not receive a confirmation within 15 minutes of payment, check your spam folder and contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
    </section>

    <section id="t5">
      <h2><span class="num">5</span> Cancellation &amp; Refund Policy</h2>

      <h3>5.1 Guest Cancellations</h3>
      <p>Each Listing has a cancellation policy set by the Host. The applicable policy is shown on the Listing page and on your booking confirmation. The three standard policies are:</p>

      <div class="table-wrap">
        <table>
          <thead><tr><th>Policy Type</th><th>Cancelled 72+ hours before check-in</th><th>Cancelled 24–72 hours before check-in</th><th>Cancelled less than 24 hours before / no-show</th></tr></thead>
          <tbody>
            <tr><td><strong>Flexible</strong></td><td>Full refund of the base price (service fee non-refundable)</td><td>50% refund of the base price</td><td>No refund</td></tr>
            <tr><td><strong>Moderate</strong></td><td>Full refund of the base price (service fee non-refundable)</td><td>No refund</td><td>No refund</td></tr>
            <tr><td><strong>Non-Refundable</strong></td><td>No refund</td><td>No refund</td><td>No refund</td></tr>
          </tbody>
        </table>
      </div>
      <p>The MUKHYMAT service fee is non-refundable in all cases, as it covers platform costs already incurred at the time of booking.</p>

      <h3>5.2 Host Cancellations</h3>
      <p>If a Host cancels a confirmed booking, the Guest will receive a <strong>full refund</strong> of the entire booking amount, including the service fee. Hosts who cancel confirmed bookings without a valid reason may face penalties including listing suspension.</p>

      <h3>5.3 Force Majeure</h3>
      <p>In extraordinary circumstances beyond either party's control (including but not limited to: declared public health emergencies, government-ordered closures, acts of God, or armed conflict), MUKHYMAT may offer a full or partial refund or credit at its discretion, regardless of the Listing's stated cancellation policy.</p>

      <h3>5.4 Refund Processing</h3>
      <p>Approved refunds are processed within <strong>5–10 business days</strong> to the original payment method. Refunds for cash-on-arrival bookings are the Host's responsibility to settle directly with the Guest.</p>

      <h3>5.5 How to Cancel</h3>
      <p>To cancel a booking, open the booking in your MUKHYMAT app (Bookings tab → select booking → Cancel). Cancellations must be made through the Platform to trigger the applicable refund. Cancellations requested by WhatsApp or phone call are not valid and will not generate a refund.</p>
    </section>

    <section id="t6">
      <h2><span class="num">6</span> Guest Responsibilities</h2>
      <ul>
        <li>Arrive at the agreed time and communicate any delays to the Host in advance.</li>
        <li>Respect the Host's property, equipment, and the natural environment of the camp site.</li>
        <li>Do not bring more guests than the number stated in your Booking.</li>
        <li>Leave the site in the same condition as it was found. Guests may be charged for excessive cleaning, damage, or removal of waste.</li>
        <li>Do not engage in any illegal activity on the premises, including the consumption of alcohol in violation of Bahraini law.</li>
        <li>Follow any house rules communicated by the Host before or at check-in.</li>
        <li>Report any safety concerns or property damage to the Host and to MUKHYMAT immediately.</li>
      </ul>
      <p>MUKHYMAT reserves the right to charge your payment method on file for damage caused by you or your group, up to the amount evidenced by the Host's submitted documentation, following a dispute resolution process.</p>
    </section>

    <section id="t7">
      <h2><span class="num">7</span> Host Responsibilities</h2>
      <ul>
        <li>Ensure all information in your Listing is <strong>accurate, current, and not misleading</strong>, including photos, capacity, amenities, and pricing.</li>
        <li>Maintain the Listing in a safe, clean, and hospitable condition as described.</li>
        <li>Respond to booking enquiries and guest messages within a reasonable time.</li>
        <li>Honor all confirmed bookings. Cancelling bookings without valid cause harms Guests and the Platform's reputation.</li>
        <li>Comply with all applicable Bahraini laws and regulations, including any licensing or permit requirements for operating a camp or tourism accommodation.</li>
        <li>Not discriminate against Guests on the basis of nationality, religion, gender, or any other protected characteristic.</li>
        <li>Update your availability calendar promptly to avoid accepting bookings on unavailable dates.</li>
      </ul>

      <h3>7.1 Host Payouts</h3>
      <p>After a successful booking and check-in, MUKHYMAT will release the payout (booking amount minus the service fee) to the Host's registered payout method within the timeframe stated in the Host's dashboard. Payouts may be withheld if there is a pending dispute, a policy violation investigation, or a refund in progress.</p>
    </section>

    <section id="t8">
      <h2><span class="num">8</span> Marketplace</h2>
      <p>The MUKHYMAT Marketplace offers food, firewood, camping gear, and related items to enhance your experience. Currently, the Marketplace operates in <strong>browse mode</strong> — items are displayed for reference, and ordering is available through coordination with your Host.</p>
      <p>Marketplace pricing is in BHD and indicative. Final pricing at the time of ordering may vary. MUKHYMAT is not the seller of marketplace items; Hosts or third-party vendors fulfil these orders directly. MUKHYMAT facilitates discovery only and does not guarantee availability of any Marketplace item.</p>
    </section>

    <section id="t9">
      <h2><span class="num">9</span> Ratings &amp; Reviews</h2>
      <p>After completing a stay, Guests may leave a star rating and written review. Hosts may respond to reviews. Reviews must be:</p>
      <ul>
        <li>Based on a genuine, first-hand experience of the Listing.</li>
        <li>Honest, respectful, and not contain defamatory, threatening, or discriminatory content.</li>
        <li>Not contain personal information of other individuals (full names, phone numbers, addresses).</li>
        <li>Not be incentivised (Hosts must not offer discounts or gifts in exchange for positive reviews).</li>
      </ul>
      <p>MUKHYMAT reserves the right to remove reviews that violate these guidelines. Ratings are aggregated and displayed publicly on Listing pages. We do not alter, curate, or suppress reviews for commercial reasons.</p>
    </section>

    <section id="t10">
      <h2><span class="num">10</span> Prohibited Conduct</h2>
      <p>The following are strictly prohibited on the MUKHYMAT Platform:</p>
      <ul>
        <li>Providing false or misleading information in your profile, Listing, or booking.</li>
        <li>Circumventing the Platform to book or pay for accommodation directly (off-platform transactions to avoid service fees).</li>
        <li>Scraping, crawling, or systematically extracting data from the Platform.</li>
        <li>Attempting to reverse-engineer, decompile, or otherwise access source code or proprietary systems.</li>
        <li>Using the Platform to transmit spam, malware, or unsolicited communications.</li>
        <li>Creating fake reviews, ratings, or accounts.</li>
        <li>Harassing, threatening, or discriminating against other users or MUKHYMAT staff.</li>
        <li>Using the Platform for any purpose that violates applicable Bahraini law.</li>
        <li>Engaging in any form of payment fraud, including chargebacks filed in bad faith.</li>
      </ul>
      <p>Violations may result in immediate account termination, forfeiture of pending payouts (for Hosts), and referral to law enforcement authorities where appropriate.</p>
    </section>

    <section id="t11">
      <h2><span class="num">11</span> Intellectual Property</h2>
      <p>All content on the Platform — including the MUKHYMAT name, logo, design, software, text, and graphics — is owned by or licensed to MUKHYMAT and is protected by intellectual property laws.</p>
      <p>By submitting content to the Platform (including Listing photos, descriptions, and reviews), you grant MUKHYMAT a <strong>non-exclusive, royalty-free, worldwide licence</strong> to use, display, reproduce, and distribute that content for the purpose of operating and promoting the Platform. You retain ownership of your content and may delete it at any time by removing the Listing or contacting us.</p>
      <p>You represent that any content you submit does not infringe third-party intellectual property rights and that you have the right to grant the above licence.</p>
    </section>

    <section id="t12">
      <h2><span class="num">12</span> Disclaimers &amp; Limitation of Liability</h2>

      <h3>12.1 Platform "As Is"</h3>
      <p>The Platform is provided <strong>"as is" and "as available"</strong> without warranties of any kind, express or implied. MUKHYMAT does not warrant that the Platform will be uninterrupted, error-free, or free of viruses or harmful components.</p>

      <h3>12.2 Third-Party Listings</h3>
      <p>MUKHYMAT does not own, operate, or control any Listing. We make no representation or warranty regarding the accuracy of Listing descriptions, the quality or safety of any accommodation, or the conduct of any Host or Guest.</p>

      <h3>12.3 Limitation of Liability</h3>
      <p>To the fullest extent permitted by applicable Bahraini law, MUKHYMAT's total liability to you for any claim arising out of or relating to these Terms or your use of the Platform shall not exceed the <strong>greater of: (a) the total service fees paid by you to MUKHYMAT in the 12 months preceding the claim, or (b) BHD 100</strong>.</p>
      <p>MUKHYMAT shall not be liable for any indirect, incidental, consequential, special, or punitive damages, including loss of profits, loss of data, or personal injury, even if we have been advised of the possibility of such damages.</p>

      <h3>12.4 Guest–Host Disputes</h3>
      <p>MUKHYMAT is not a party to disputes between Guests and Hosts and has no obligation to mediate or resolve them. We may, at our sole discretion, facilitate communication between the parties. Final responsibility for the booking experience rests with the Host; final responsibility for conduct rests with the Guest.</p>
    </section>

    <section id="t13">
      <h2><span class="num">13</span> Indemnification</h2>
      <p>You agree to indemnify, defend, and hold harmless MUKHYMAT and its officers, directors, employees, and agents from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable legal fees) arising out of or related to:</p>
      <ul>
        <li>Your use of the Platform.</li>
        <li>Your violation of these Terms.</li>
        <li>Your violation of any applicable law or regulation.</li>
        <li>Your Listing or booking, including any property damage, personal injury, or dispute arising therefrom.</li>
        <li>Any content you submit to the Platform that infringes a third party's rights.</li>
      </ul>
    </section>

    <section id="t14">
      <h2><span class="num">14</span> Dispute Resolution</h2>

      <h3>14.1 Informal Resolution</h3>
      <p>Before filing any formal legal claim against MUKHYMAT, you agree to first contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a> and give us 30 days to resolve the issue informally. We will make every reasonable effort to do so.</p>

      <h3>14.2 Formal Disputes</h3>
      <p>If a dispute cannot be resolved informally, it shall be submitted to and resolved by the competent courts of the <strong>Kingdom of Bahrain</strong>, applying Bahraini law.</p>

      <h3>14.3 Class Action Waiver</h3>
      <p>To the extent permitted by law, all disputes must be brought in your individual capacity and not as a plaintiff or class member in any purported class or representative proceeding.</p>
    </section>

    <section id="t15">
      <h2><span class="num">15</span> Governing Law</h2>
      <p>These Terms of Service are governed by and construed in accordance with the laws of the <strong>Kingdom of Bahrain</strong>, including the Electronic Transactions Law (Legislative Decree No. 54 of 2018), the Consumer Protection Law, and any applicable commercial regulations, without regard to conflict-of-law principles.</p>
    </section>

    <section id="t16">
      <h2><span class="num">16</span> General Provisions</h2>

      <h3>16.1 Entire Agreement</h3>
      <p>These Terms, together with our Privacy Policy, constitute the entire agreement between you and MUKHYMAT regarding the Platform and supersede all prior agreements.</p>

      <h3>16.2 Severability</h3>
      <p>If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.</p>

      <h3>16.3 Waiver</h3>
      <p>MUKHYMAT's failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.</p>

      <h3>16.4 Assignment</h3>
      <p>You may not assign or transfer your rights or obligations under these Terms without our prior written consent. MUKHYMAT may assign its rights without restriction.</p>

      <h3>16.5 Updates to These Terms</h3>
      <p>We may update these Terms at any time. We will notify you of material changes by email and in-app notice at least <strong>14 days before</strong> the changes take effect. Continued use of the Platform after that date constitutes acceptance of the revised Terms.</p>
    </section>

    <section id="t17">
      <h2><span class="num">17</span> Contact</h2>
      <div class="contact-box">
        <h3>Questions About These Terms</h3>
        <p>If you have any questions about these Terms of Service, your rights, or how we handle disputes, please contact us:</p>
        <p>
          <strong>Email:</strong> <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a><br/>
          <strong>Subject:</strong> "Terms Question — [Your Name]"<br/>
          <strong>Response time:</strong> Within 5 business days
        </p>
        <p style="margin-bottom:0">For urgent booking issues or emergencies, please include "URGENT" in your subject line.</p>
      </div>
    </section>
  `;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(pageShell("Terms of Service", body));
});

export default router;
