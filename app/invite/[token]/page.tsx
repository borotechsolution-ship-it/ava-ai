import { headers } from "next/headers";
import { BrandNav } from "@/components/BrandNav";
import { StartVoiceDemoButton } from "@/components/StartVoiceDemoButton";
import { config } from "@/lib/config";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import { validateInviteToken } from "@/lib/invites";

export default async function InvitePage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const requestHeaders = await headers();
  const allowed = rateLimit(`validate:${requestIp(requestHeaders)}:${resolvedParams.token}`, 30, 60_000);
  const invite = allowed ? await validateInviteToken(resolvedParams.token).catch(() => null) : null;

  if (!invite) {
    return <InvalidInvite />;
  }

  const sessionMinutes = Math.floor(config.demoSessionSeconds / 60);
  const sessionSeconds = config.demoSessionSeconds % 60;
  const sessionDuration =
    sessionSeconds > 0 ? `${sessionMinutes} min ${sessionSeconds} sec` : `${sessionMinutes} minutes`;

  return (
    <main className="invite-hero">
      <BrandNav context="Single-use private invitation" />
      <section className="invite-layout call-invite-layout">
        <div className="panel invite-card call-copy-card stack motion-reveal">
          <div className="invite-kicker">
            <span>Private AI voice demo</span>
            <strong>Reserved access</strong>
          </div>
          <div className="invite-headline-block">
            <h1 className="editorial-title call-title">
              Ava is ready to take your call.
            </h1>
            <p className="hero-copy">
              This private demo is reserved for <strong>{invite.prospect_name}</strong> at{" "}
              <strong>{invite.company_name}</strong>. The invite stays untouched until you tap the green call button.
            </p>
          </div>
          <div className="process-rail">
            <article className="process-item">
              <span>01</span>
              <div>
                <strong>Verified invite</strong>
                <p>Server-checked and bound to this private access link.</p>
              </div>
            </article>
            <article className="process-item">
              <span>02</span>
              <div>
                <strong>Tap to call Ava</strong>
                <p>The session is redeemed only after an intentional call start.</p>
              </div>
            </article>
            <article className="process-item">
              <span>03</span>
              <div>
                <strong>{sessionDuration} live window</strong>
                <p>A countdown appears once the secure voice room is connected.</p>
              </div>
            </article>
          </div>
          <div className="call-meta-strip">
            <span>
              Industry <strong>{invite.industry}</strong>
            </span>
            <span>
              Expires <strong>{new Date(invite.expires_at).toLocaleString()}</strong>
            </span>
            <span>
              Access <strong>Server verified</strong>
            </span>
          </div>
          {resolvedSearchParams.error ? <p className="message error">{inviteErrorMessage(resolvedSearchParams.error)}</p> : null}
        </div>
        <aside className="phone-panel">
          <div className="phone-shell">
            <div className="phone-speaker" aria-hidden="true" />
            <div className="smartphone-status">
              <span>9:41</span>
              <i />
            </div>
            <div className="phone-status-row">
              <span>Incoming secure call</span>
              <strong>{sessionDuration}</strong>
            </div>
            <div className="caller-orb" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <strong>A</strong>
            </div>
            <div className="caller-copy">
              <span>Your receptionist</span>
              <h2>Ava</h2>
              <p>Built by BoroTech Solution</p>
            </div>
            <div className="phone-wave" aria-hidden="true">
              {Array.from({ length: 18 }).map((_, index) => (
                <span key={index} />
              ))}
            </div>
            <StartVoiceDemoButton token={resolvedParams.token} />
            <div className="phone-home-indicator" aria-hidden="true" />
          </div>
        </aside>
      </section>
      <section className="marquee motion-reveal" aria-hidden="true">
        <div className="marquee-track">
          <span>AI Automation</span>
          <span>Custom Software</span>
          <span>Voice Systems</span>
          <span>Business Growth</span>
          <span>AI Automation</span>
          <span>Custom Software</span>
          <span>Voice Systems</span>
          <span>Business Growth</span>
        </div>
      </section>
    </main>
  );
}

function InvalidInvite() {
  return (
    <main className="invite-hero">
      <BrandNav context="Invitation unavailable" />
      <section className="login-layout">
        <div className="motion-reveal">
          <h1 className="editorial-title">
            This link is no longer <span>active</span>.
          </h1>
        </div>
        <div className="panel invite-card stack motion-reveal">
          <span className="eyebrow">Secure access</span>
          <p className="hero-copy">
            This voice-demo invitation has expired or has already been used. Please contact your BoroTech representative
            for a new invitation.
          </p>
        </div>
      </section>
    </main>
  );
}

function inviteErrorMessage(error: string) {
  if (error === "rate") return "Too many start attempts. Wait one minute, then try again.";
  if (error === "limit") {
    return "The daily demo limit has been reached from testing. Raise DEMO_GLOBAL_DAILY_LIMIT locally or try again after the limit resets.";
  }
  if (error === "active") {
    return "This invite cannot start another session right now. Open /demo if it already started, or replace the invite from the CRM.";
  }
  if (error === "used") return "This invite was already used. Replace it from the CRM to create a new private link.";
  if (error === "invalid") return "This invite is no longer active. Replace it from the CRM to create a new private link.";

  return "We could not start this invitation.";
}
