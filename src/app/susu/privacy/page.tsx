import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Susu — Privacy Policy",
  description: "How the Susu app collects, uses, and protects your data.",
};

// Public privacy policy for the Susu app (required for App Store submission).
// Susu shares Dola's backend, which is why this lives on the Dola domain.
export default function SusuPrivacyPolicy() {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "48px 20px 80px",
        lineHeight: 1.6,
        fontSize: 16,
      }}
    >
      <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 4 }}>
        Susu — Privacy Policy
      </h1>
      <p style={{ opacity: 0.7, marginBottom: 28 }}>
        Last updated: 20 July 2026
      </p>

      <p>
        Susu is a mobile app that helps you organise a susu (a rotating group
        savings arrangement) and track personal savings goals. This policy
        explains what we collect, why, and your choices. Susu is a
        record-keeping tool — it does not move, hold, or process money.
      </p>

      <Section title="Information we collect">
        <ul>
          <li>
            <strong>Account details</strong> you provide: your name, email
            address, and a password. Passwords are stored only as a secure
            one-way hash — we never store or see your actual password.
          </li>
          <li>
            <strong>Content you create</strong>: the circles you set up
            (their name, contribution amount, schedule, and the member names
            you type in), which members you mark as paid, and any savings goals
            and entries you add.
          </li>
          <li>
            <strong>Circle descriptions you choose to type</strong>: if you use
            the optional &ldquo;describe it instead&rdquo; shortcut when
            creating a circle, the sentence you write is sent to an AI provider
            to be turned into form fields. Using it is entirely up to
            you — the ordinary form does the same job without it.
          </li>
        </ul>
        <p>
          We do not collect payment card numbers, bank details, or precise
          location, and the app contains no third-party advertising or tracking
          SDKs.
        </p>
      </Section>

      <Section title="How we use your information">
        <ul>
          <li>To provide the app and sync your data across your devices.</li>
          <li>
            To let people you invite to a circle see that shared circle — the
            circle&apos;s name, members, and who has paid each round.
          </li>
          <li>To secure your account and prevent abuse.</li>
        </ul>
      </Section>

      <Section title="What we share">
        <p>
          We do not sell your data or share it with advertisers. The only
          sharing is functional: when you invite someone to a circle, the
          members of that circle can see the circle&apos;s shared details. Your
          email and password are never shown to other members.
        </p>
        <p>
          Your data is stored on secure managed database infrastructure
          (hosted with Neon and Vercel) on our behalf. We may disclose
          information if required by law.
        </p>
        <p>
          If you use the optional &ldquo;describe it instead&rdquo; shortcut,
          that one sentence is sent through OpenRouter to the AI model that
          reads it, solely to turn it into circle fields and return them to
          you. Nothing else about your account — not your email, your circles,
          your payments, or your goals — is sent there, and if you never use
          that shortcut nothing is sent at all.
        </p>
      </Section>

      <Section title="Data retention and deletion">
        <p>
          We keep your data while your account is active. You can request
          deletion of your account and associated data at any time by emailing
          the address below, and we will remove it.
        </p>
      </Section>

      <Section title="Children">
        <p>
          Susu is not directed to children under 13, and we do not knowingly
          collect information from them.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We may update this policy; material changes will be reflected by the
          date at the top of this page.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions or deletion requests:{" "}
          <a href="mailto:augustskumah@gmail.com">augustskumah@gmail.com</a>.
        </p>
      </Section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{title}</h2>
      {children}
    </section>
  );
}
