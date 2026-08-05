import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createInviteAction, replaceInviteAction, revokeInviteAction } from "@/app/sales/invites/actions";
import { BrandNav } from "@/components/BrandNav";
import { CopyLink } from "@/components/CopyLink";
import { IndustrySkillAutocomplete } from "@/components/IndustrySkillAutocomplete";
import { PendingLink } from "@/components/PendingLink";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { StatsCard } from "@/components/StatsCard";
import { config } from "@/lib/config";
import { listIndustrySkillOptions } from "@/lib/industry-skills";
import { InviteWithLatestSession, listInvites } from "@/lib/invites";
import { LATEST_INVITE_COOKIE } from "@/lib/sales-flash";
import { getSalesAccount } from "@/lib/sales-auth";

function displayStatus(invite: InviteWithLatestSession) {
  const latest = invite.demo_sessions?.[0];
  if (invite.status === "revoked") return "revoked";
  if (new Date(invite.expires_at).getTime() <= Date.now()) return "expired";
  if (latest?.status) return latest.status;
  return invite.status;
}

export default async function SalesInvites({ searchParams }: { searchParams: Promise<{ created?: string; page?: string }> }) {
  const salesAccount = await getSalesAccount();
  if (!salesAccount) redirect("/sales/login");

  const resolvedSearchParams = await searchParams;
  const cookieStore = await cookies();
  const latestInviteUrl = cookieStore.get(LATEST_INVITE_COOKIE)?.value || "";
  const currentPage = Math.max(1, Number(resolvedSearchParams.page || 1));
  const industrySkills = await listIndustrySkillOptions();
  const inviteResult = await listInvites(salesAccount.id, currentPage).catch((error: unknown) => {
    console.error("Failed to load sales invites", error);
    return {
      invites: [],
      page: currentPage,
      pageSize: 5,
      totalCount: 0,
      loadError: "Could not connect to Supabase from this computer. Check VPN, firewall, proxy, or internet access."
    };
  });
  const { invites, page, pageSize, totalCount } = inviteResult;
  const loadError = "loadError" in inviteResult ? inviteResult.loadError : null;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const previousHref = `/sales/invites?page=${Math.max(1, page - 1)}`;
  const nextHref = `/sales/invites?page=${Math.min(totalPages, page + 1)}`;
  const activeCount = invites.filter((invite) => displayStatus(invite) === "active").length;
  const usedCount = invites.filter((invite) => ["started", "completed", "redeemed"].includes(displayStatus(invite))).length;

  return (
    <main className="page-shell crm-shell">
      <div className="crm-topbar">
        <BrandNav context="Internal sales CRM" />
      </div>
      <div className="crm-dashboard">
        <div className="crm-main">
          <header className="crm-hero motion-reveal">
            <span className="eyebrow">BoroTech internal</span>
            <h1 className="dashboard-title">
              Voice demo <span>invites</span>.
            </h1>
            <p>
              Private invite list for {salesAccount.display_name}. Generate single-use URLs, revoke access, replace
              links, and read prospect status without exposing provider credentials.
            </p>
          </header>

          <section className="stats-grid">
            <StatsCard
              title="Total visible"
              mainValue={String(totalCount)}
              note="Tracked"
              icon="visibility"
              visual="sparkline"
            />
            <StatsCard
              title="Active on page"
              mainValue={String(activeCount)}
              note="Stable"
              icon="sensors"
              tone="green"
              visual="radar"
            />
            <StatsCard
              title="Used on page"
              mainValue={String(usedCount)}
              note="Pending"
              icon="task"
              tone="amber"
              visual="dots"
            />
            <StatsCard
              title="Page size"
              mainValue="5"
              note="Max limit"
              icon="bars"
              visual="bars"
            />
          </section>

          <section className="crm-card crm-table-card motion-reveal">
            <div className="crm-card-head">
              <div>
                <h2>Invitation status</h2>
                <p>Newest invitations first.</p>
              </div>
              <div className="tracking-note">
                <span>CRM tracking</span>
                <strong>5 records per page</strong>
              </div>
            </div>
            <div className="table-wrap premium-scrollbar">
              {loadError ? <div className="crm-load-error">{loadError}</div> : null}
              <table>
                <thead>
                  <tr>
                    <th>Prospect</th>
                    <th>Company</th>
                    <th>Status</th>
                    <th>Usage</th>
                    <th>Expires</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((invite) => {
                    const status = displayStatus(invite);
                    return (
                      <tr className="premium-row" key={invite.id}>
                        <td>
                          <strong>{invite.prospect_name}</strong>
                          <br />
                          {invite.prospect_email || "No email"}
                        </td>
                        <td>
                          {invite.company_name}
                          <br />
                          <span className="industry-tag">{invite.industry}</span>
                        </td>
                        <td>
                          <span className={`status ${status}`}>{status}</span>
                        </td>
                        <td>
                          {invite.sessions_used}/{invite.max_sessions}
                        </td>
                        <td>{new Date(invite.expires_at).toLocaleString()}</td>
                        <td className="actions-cell">
                          <div className="invite-action-group">
                            {invite.invite_url && status === "active" ? (
                              <CopyLink
                                value={invite.invite_url}
                                label="Copy"
                                copiedLabel="Copied"
                                className="action-button action-copy"
                              />
                            ) : status === "active" ? (
                              <span className="action-button action-legacy" title="This older invite was created before link copy storage was available. Use Replace once to create a copyable link.">
                                Legacy
                              </span>
                            ) : null}
                            {status === "active" ? (
                              <form action={revokeInviteAction}>
                                <input type="hidden" name="id" value={invite.id} />
                                <PendingSubmitButton className="action-button action-danger" pendingChildren="Revoking...">
                                  Revoke
                                </PendingSubmitButton>
                              </form>
                            ) : null}
                            <form action={replaceInviteAction}>
                              <input type="hidden" name="id" value={invite.id} />
                              <PendingSubmitButton className="action-button action-secondary" pendingChildren="Replacing...">
                                Replace
                              </PendingSubmitButton>
                            </form>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="pagination-row table-pagination">
              <p>
                Showing {invites.length ? (page - 1) * pageSize + 1 : 0}-{Math.min(page * pageSize, totalCount)} of{" "}
                {totalCount} invitations
              </p>
              <div className="row-actions">
                <PendingLink className="pager-button" disabled={page <= 1} href={previousHref}>
                  Previous
                </PendingLink>
                <span className="status">Page {page} of {totalPages}</span>
                <PendingLink className="pager-button" disabled={page >= totalPages} href={nextHref}>
                  Next
                </PendingLink>
              </div>
            </div>
          </section>
        </div>

        <aside className="crm-sidebar motion-reveal">
          <div className="crm-card invite-generator">
            <div className="crm-card-head">
              <div>
                <h2>Generate invitation</h2>
                <p>Max 3 sessions / 72h</p>
              </div>
            </div>
            {latestInviteUrl ? (
              <div className="url-preview">
                <span>Latest invitation URL</span>
                <p>Copy this link now. If you clicked Replace, the old invite was revoked and this is the fresh link.</p>
                <code>{latestInviteUrl}</code>
                <CopyLink value={latestInviteUrl} />
              </div>
            ) : null}
            <form action={createInviteAction} className="sidebar-form">
              <label>
                Prospect name
                <input name="prospectName" placeholder="e.g. John Doe" required />
              </label>
              <label>
                Company name
                <input name="companyName" placeholder="e.g. Acme Corp" required />
              </label>
              <IndustrySkillAutocomplete skills={industrySkills} />
              <label>
                Prospect email
                <input name="prospectEmail" placeholder="john@example.com" type="email" />
              </label>
              <label>
                Expiration period
                <select name="expiryHours" defaultValue={config.defaultExpiryHours}>
                  <option value="1">1 hour</option>
                  <option value="6">6 hours</option>
                  <option value="24">24 hours</option>
                  <option value="72">3 days</option>
                </select>
              </label>
              <label>
                Max allowed demo sessions
                <input name="maxSessions" type="number" min="1" max="3" defaultValue={config.defaultMaxSessions} />
              </label>
              <PendingSubmitButton className="button xl-button" pendingChildren="Generating...">
                Generate link
              </PendingSubmitButton>
            </form>
          </div>
        </aside>
      </div>
    </main>
  );
}
