import { redirect } from "next/navigation";
import { BrandNav } from "@/components/BrandNav";
import { CallCountdown } from "@/components/CallCountdown";
import { CallStatusText } from "@/components/CallStatusText";
import { EndCallButton } from "@/components/EndCallButton";
import { LiveKitVoiceSession } from "@/components/LiveKitVoiceSession";
import { config } from "@/lib/config";
import { getDemoCookie } from "@/lib/demo-cookie";
import { reconnectDemo } from "@/lib/invites";

export default async function DemoPage() {
  const session = await reconnectDemo(await getDemoCookie()).catch(() => null);
  if (!session) {
    redirect("/demo/unavailable");
    return null;
  }

  return (
    <main className="invite-hero">
      <BrandNav context="Authorized voice session" />
      <section className="invite-layout live-call-layout">
        <div className="panel invite-card call-copy-card stack motion-reveal">
          <div className="invite-kicker">
            <span>Live AI voice demo</span>
            <strong>Starting secure call</strong>
          </div>
          <div className="invite-headline-block">
            <h1 className="editorial-title call-title">Ava is joining your call.</h1>
            <p className="hero-copy">
              We are preparing the secure voice room. Your demo timer starts only when Ava voice is connected.
            </p>
          </div>
          <div className="process-rail">
            <article className="process-item">
              <span>01</span>
              <div>
                <strong>Speak naturally</strong>
                <p>Use your microphone and talk like you are on a normal receptionist call.</p>
              </div>
            </article>
            <article className="process-item">
              <span>02</span>
              <div>
                <strong>Timer starts after Ava</strong>
                <p>The countdown begins only once Ava voice stream is actually playing.</p>
              </div>
            </article>
            <article className="process-item">
              <span>03</span>
              <div>
                <strong>No extension on refresh</strong>
                <p>Refreshing reconnects only within the original secure room deadline.</p>
              </div>
            </article>
          </div>
          <div className="call-meta-strip live-meta-strip">
            <span>
              Status <strong>Connected</strong>
            </span>
            <span>
              Window <strong>{config.demoSessionSeconds} seconds</strong>
            </span>
            <span>
              Access <strong>Secure session</strong>
            </span>
          </div>
          <LiveKitVoiceSession livekitUrl={session.livekitUrl} token={session.token} totalSeconds={config.demoSessionSeconds} />
        </div>
        <aside className="phone-panel active-phone-panel">
          <div className="phone-shell phone-shell-live">
            <div className="phone-speaker" aria-hidden="true" />
            <div className="smartphone-status">
              <span>9:41</span>
              <i />
            </div>
            <div className="phone-status-row">
              <span>Secure call</span>
              <CallStatusText />
            </div>
            <div className="caller-orb live" aria-hidden="true">
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
            <CallCountdown expiresAt={session.expiresAt} totalSeconds={config.demoSessionSeconds} />
            <EndCallButton />
            <div className="phone-wave live-wave" aria-hidden="true">
              {Array.from({ length: 22 }).map((_, index) => (
                <span key={index} />
              ))}
            </div>
            <div className="phone-home-indicator" aria-hidden="true" />
          </div>
        </aside>
      </section>
    </main>
  );
}
