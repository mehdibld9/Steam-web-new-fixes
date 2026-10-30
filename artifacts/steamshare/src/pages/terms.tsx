import React from "react";
import { Layout } from "@/components/layout";

export default function TermsPage(): JSX.Element {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
          <h1 className="text-2xl font-bold">Terms & Rules</h1>

          <section>
            <h2 className="text-lg font-semibold">1. General Community Conduct</h2>
            <p className="text-muted-foreground">All members are expected to maintain respectful communication across comments, profile customizations, messages, and uploaded content. Harassment, abusive language, hate speech, and spam are strictly prohibited.</p>
            <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
              <li>Do not spam comments, reports, or messages.</li>
              <li>Do not impersonate administrators, moderators, or other community members.</li>
              <li>Keep community interactions civil, helpful, and constructive.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold">2. Account Sharing &amp; Accuracy</h2>
            <p className="text-muted-foreground">When submitting shared Steam accounts or libraries, you agree to provide authentic, valid information without deceptive credentials.</p>
            <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
              <li>Links to external websites are not allowed. Only Discord and Telegram links may be shared, and any post containing one must be free.</li>
              <li>Do not submit deliberately non-working accounts to farm points.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold">3. Premium Subscriptions &amp; Store</h2>
            <p className="text-muted-foreground">Premium and Pro perks (such as custom badges, animated name colors, elevated privileges, and priority tools) are granted per active subscription period.</p>
            <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
              <li>Digital purchases and points redemption are subject to active platform availability.</li>
              <li>Attempts to exploit, glitch, or bypass transaction safeguards will lead to termination of service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold">4. Privacy Policy &amp; Data Handling</h2>
            <p className="text-muted-foreground">We value your privacy. We collect minimal information required to operate account authentication and community features:</p>
            <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
              <li><strong>Authentication:</strong> Your email address and hashed passwords are stored securely to verify ownership and deliver security codes.</li>
              <li><strong>Usage &amp; Safety:</strong> We monitor abusive IP patterns, multi-accounting, and bot submissions to protect community accounts.</li>
              <li><strong>Third-Party Services:</strong> We do not sell or trade your personal information to third parties.</li>
              <li><strong>Account Deletion:</strong> You can permanently delete your account and all associated data at any time in Edit Profile &gt; Security.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold">5. Reporting &amp; Contact</h2>
            <p className="text-muted-foreground">If you encounter non-working accounts, inappropriate profiles, or suspicious activity, please utilize the built-in report tools or message support directly.</p>
            <p className="text-muted-foreground">Have questions or inquiries? Contact us directly at <a href="mailto:contact@steamfamily.xyz" className="text-primary underline">contact@steamfamily.xyz</a></p>
          </section>

          <p className="text-xs text-muted-foreground">Last updated: {new Date().getFullYear()}</p>
        </div>
      </div>
    </Layout>
  );
}
