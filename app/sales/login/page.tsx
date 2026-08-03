import { redirect } from "next/navigation";
import { BrandNav } from "@/components/BrandNav";
import { PasswordInput } from "@/components/PasswordInput";
import { authenticateSalesAccount, setSalesCookie } from "@/lib/sales-auth";

async function login(formData: FormData) {
  "use server";

  const loginSlug = String(formData.get("loginSlug") || "");
  const password = String(formData.get("password") || "");
  const account = await authenticateSalesAccount(loginSlug, password);
  if (!account) {
    redirect("/sales/login?error=1");
  }

  await setSalesCookie(account);
  redirect("/sales/invites");
}

export default async function SalesLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const resolvedSearchParams = await searchParams;

  return (
    <main className="invite-hero">
      <BrandNav context="Internal sales access" />
      <section className="login-layout">
        <div className="motion-reveal">
          <h1 className="editorial-title">
            Private demo <span>control</span> room.
          </h1>
          <p className="hero-copy">
            Generate single-use voice-demo links, monitor every invitation, and keep prospect access locked to the
            server.
          </p>
        </div>
        <form action={login} className="login-form-card motion-reveal">
          <div className="stack">
            <span className="eyebrow">Authorized team only</span>
            <h2>Sign in</h2>
            <p>Use your assigned sales account credentials.</p>
          </div>
          {resolvedSearchParams.error ? <p className="message error">Invalid password.</p> : null}
          <div className="minimal-field">
            <label htmlFor="sales-login">Sales account</label>
            <div className="minimal-input">
              <span className="field-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                  <path
                    d="M12 3.7 5.2 6.6v5.1c0 4.2 2.8 7.8 6.8 8.9 4-1.1 6.8-4.7 6.8-8.9V6.6L12 3.7Z"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9.2 12.3h5.6M9.2 9.6h5.6M9.2 15h3.3"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <input
                id="sales-login"
                name="loginSlug"
                type="text"
                autoComplete="username"
                placeholder="e.g. sales-a"
                required
              />
            </div>
          </div>
          <div className="minimal-field">
            <label htmlFor="sales-password">Password</label>
            <PasswordInput />
          </div>
          <button className="minimal-submit" type="submit">
            Continue
          </button>
        </form>
      </section>
    </main>
  );
}
