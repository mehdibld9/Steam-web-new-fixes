import React from "react";
import { Layout } from "@/components/layout";

export default function FAQPage(): JSX.Element {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
          <h1 className="text-2xl font-bold">Frequently Asked Questions</h1>

          <section>
            <h2 className="text-lg font-semibold">1. How do I get points?</h2>
            <p className="text-muted-foreground">
              You can earn points by sharing accounts. Each valid shared account gives you <strong>5 points</strong>, and you can also earn through premium or paid account activity.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">2. Why did the account send a code to the email?</h2>
            <p className="text-muted-foreground">
              If the account asks for an email OTP or Steam authenticator, it usually means the account is no longer usable. In that case, please report the account for review and removal.
            </p>
            <p className="text-muted-foreground">Tip: the same applies to wrong-password or 2FA lockouts.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">3. What if the account asks for Rockstar, EA, or Ubisoft?</h2>
            <ol className="list-decimal ml-5 space-y-2 text-muted-foreground">
              <li>Open Steam Family and choose the launcher you need to bypass.</li>
              <li>Scroll down and select the relevant fix for your game or launcher.</li>
              <li>Install the software and choose the game you want to run.</li>
              <li>Apply the fix, then launch the game.</li>
            </ol>
            <div className="mt-4 overflow-hidden rounded-xl border border-border bg-muted/20">
              <img
                src="https://i.ibb.co/rRZ8brwK/image.png"
                alt="Launcher fix example"
                className="w-full max-w-[500px] mx-auto block object-cover"
              />
            </div>
            <p className="text-muted-foreground mt-3">Tip: not every game is supported.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">4. I get a Steam login error.</h2>
            <div className="mt-4 overflow-hidden rounded-xl border border-border bg-muted/20">
              <img
                src="https://cdn.appuals.com/wp-content/uploads/2025/03/Steam-error-code-e87.jpg"
                alt="Steam error code example"
                className="w-full max-w-[500px] mx-auto block object-cover"
              />
            </div>
            <p className="text-muted-foreground mt-4">
              This is usually caused by one of two issues: too many users trying to log into the same account at once, or your IP being temporarily blocked after too many failed attempts.
            </p>
            <p className="text-muted-foreground">
              If it is the second case, changing your IP with a VPN can help. The first issue cannot always be solved directly because it depends on the account owner’s restrictions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">5. Where can I get more help?</h2>
            <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
              <li><a href="https://t.me/Steam_Family" target="_blank" rel="noopener noreferrer" className="text-primary underline">Telegram</a></li>
              <li><a href="https://t.me/Steam_Family" target="_blank" rel="noopener noreferrer" className="text-primary underline">Community</a></li>
              <li><a href="mailto:contact@steamfamily.xyz" className="text-primary underline">contact@steamfamily.xyz</a></li>
            </ul>
          </section>
        </div>
      </div>
    </Layout>
  );
}
