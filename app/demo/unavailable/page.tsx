import { BrandNav } from "@/components/BrandNav";

export default function DemoUnavailablePage() {
  return (
    <main className="invite-hero">
      <BrandNav context="Session unavailable" />
      <section className="login-layout">
        <div className="motion-reveal">
          <h1 className="editorial-title">
            Demo session <span>ended</span>.
          </h1>
        </div>
        <div className="panel invite-card stack motion-reveal">
          <span className="eyebrow">Reconnect window closed</span>
          <p className="hero-copy">
            This voice-demo session can no longer reconnect. Please contact your BoroTech representative for a new
            invitation.
          </p>
        </div>
      </section>
    </main>
  );
}
