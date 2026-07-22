import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Susu — Save together, in turns",
  description:
    "Susu helps you run a group savings circle: track every round, see who's paid, invite your group, and reach savings goals.",
};

// Public landing / support page for the Susu app — doubles as the App Store
// marketing and support URL.
export default function SusuLanding() {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "56px 20px 80px",
        lineHeight: 1.6,
      }}
    >
      <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>Susu</h1>
      <p style={{ fontSize: 19, opacity: 0.85, marginTop: 8 }}>
        Save together, in turns — the trusted way your group already saves, now
        on your phone.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
        <a
          href="https://susu-app-theta.vercel.app"
          style={{
            display: "inline-block",
            padding: "12px 22px",
            borderRadius: 999,
            background: "#7C5CFF",
            color: "#fff",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Open the app
        </a>
        <a
          href="/susu/privacy"
          style={{
            display: "inline-block",
            padding: "12px 22px",
            borderRadius: 999,
            border: "1px solid currentColor",
            color: "inherit",
            fontWeight: 700,
            textDecoration: "none",
            opacity: 0.85,
          }}
        >
          Privacy policy
        </a>
        <a
          href="/susu/terms"
          style={{
            display: "inline-block",
            padding: "12px 22px",
            borderRadius: 999,
            border: "1px solid currentColor",
            color: "inherit",
            fontWeight: 700,
            textDecoration: "none",
            opacity: 0.85,
          }}
        >
          Terms
        </a>
      </div>

      <section style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>What it does</h2>
        <ul style={{ marginTop: 8 }}>
          <li>Run your susu circle and track who has paid each round.</li>
          <li>Invite your whole group so everyone sees the same circle.</li>
          <li>Set savings goals and watch them grow.</li>
        </ul>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Support</h2>
        <p style={{ marginTop: 8 }}>
          Need help or want your account deleted? Email{" "}
          <a href="mailto:augustskumah@gmail.com">augustskumah@gmail.com</a> and
          we&apos;ll get back to you.
        </p>
      </section>
    </main>
  );
}
