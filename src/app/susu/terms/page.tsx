import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Susu — Terms of Service",
  description: "The terms for using the Susu app.",
};

// Public terms of service for the Susu app. Plain-language and deliberately
// modest in scope: Susu is a record-keeping tool, so the terms mostly make
// clear what it is *not* (a bank, a susu collector, a party to anyone's
// savings arrangement). Lives on the Dola domain because Susu shares its
// backend, alongside /susu/privacy.
export default function SusuTerms() {
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
        Susu — Terms of Service
      </h1>
      <p style={{ opacity: 0.7, marginBottom: 28 }}>Last updated: 21 July 2026</p>

      <p>
        These terms are an agreement between you and Susu (&ldquo;we&rdquo;,
        &ldquo;us&rdquo;). By creating an account or using the app, you agree to
        them. If you don&apos;t agree, please don&apos;t use Susu.
      </p>

      <Section title="What Susu is">
        <p>
          Susu is a record-keeping app for organising a susu (a rotating group
          savings arrangement) and tracking personal savings goals. It keeps
          track of who has contributed and whose turn it is to collect, and lets
          you invite others to see the same circle.
        </p>
      </Section>

      <Section title="What Susu is not">
        <p>
          This is the most important thing to understand:
        </p>
        <ul>
          <li>
            Susu is <strong>not a bank, a financial institution, or a susu
            collector.</strong> We are not licensed to take deposits or handle
            money, and we do not.
          </li>
          <li>
            Susu <strong>does not hold, move, process, or guarantee any
            money.</strong> The app only records what you and your group tell
            it. No funds ever pass through Susu.
          </li>
          <li>
            The circles you create are <strong>private arrangements between you
            and the people in them.</strong> Susu is not a party to those
            arrangements, does not collect contributions, and does not pay out
            the pot. We simply keep the record.
          </li>
        </ul>
      </Section>

      <Section title="Your circles are your responsibility">
        <p>
          Because Susu only keeps the record, the trust and the money are
          between you and your members. You are responsible for who you invite,
          for the terms you agree with them, and for collecting and paying out
          among yourselves.
        </p>
        <p>
          If a member does not contribute, collects and then stops paying, or
          otherwise breaks the arrangement, that is a matter between the members
          of that circle. <strong>Susu cannot recover money, enforce payment, or
          settle disputes,</strong> and is not responsible for any loss that
          results. We strongly recommend running circles with people you know
          and trust.
        </p>
      </Section>

      <Section title="Your account">
        <ul>
          <li>Provide accurate information and keep your password to yourself.</li>
          <li>You are responsible for activity that happens under your account.</li>
          <li>
            You must be old enough to enter an agreement where you live, and at
            least 13.
          </li>
        </ul>
      </Section>

      <Section title="Acceptable use">
        <p>You agree not to use Susu to:</p>
        <ul>
          <li>Defraud, deceive, or take advantage of other people.</li>
          <li>
            Impersonate someone else, or enter members who have not agreed to
            take part.
          </li>
          <li>
            Break the law, or attempt to disrupt, overload, or reverse-engineer
            the service.
          </li>
        </ul>
        <p>
          We may suspend or remove accounts that misuse the app or put other
          users at risk.
        </p>
      </Section>

      <Section title="Describe-your-circle feature">
        <p>
          When creating a circle you can optionally type a description and have
          it turned into the circle&apos;s fields for you. This is a
          convenience: the result is generated automatically, may be imperfect,
          and you review and confirm every field before anything is created. See
          our{" "}
          <a href="/susu/privacy">Privacy Policy</a> for how that text is
          handled.
        </p>
      </Section>

      <Section title="The service is provided “as is”">
        <p>
          We work to keep Susu running and accurate, but we provide it as is,
          without warranties. We don&apos;t guarantee it will always be
          available, error-free, or that records will never be wrong. To the
          fullest extent the law allows, we are not liable for losses arising
          from your use of the app or from arrangements between members —
          including money lost within a susu circle.
        </p>
      </Section>

      <Section title="Ending your use">
        <p>
          You can stop using Susu at any time and request deletion of your
          account (see the Privacy Policy). We may suspend or end access if
          these terms are broken.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We may update these terms; material changes will be reflected by the
          date at the top of this page. Continuing to use Susu after a change
          means you accept the updated terms.
        </p>
      </Section>

      <Section title="Governing law">
        <p>
          These terms are governed by the laws of Ghana.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about these terms:{" "}
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
