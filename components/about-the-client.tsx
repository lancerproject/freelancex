import { LocalTime } from "@/components/local-time";

// Shared "About the client" panel — rendered identically whether the CLIENT is
// viewing their own job posting or a FREELANCER is viewing it, so the two
// never disagree. Both callers feed it the SAME getClientInfo() result.
export type AboutClientInfo = {
  paymentVerified: boolean;
  country: string | null;
  totalSpent: number;
  hires: number;
  hireRate: number;
  jobsPosted: number;
  openJobs: number;
  reviewCount: number;
  avgRating: number;
  createdAt: string | null;
};

export function AboutTheClient({
  ci,
  phone,
  timezone,
  activeContracts = 0,
}: {
  ci: AboutClientInfo | null;
  phone?: string | null;
  timezone?: string | null;
  activeContracts?: number;
}) {
  const memberSince = ci?.createdAt
    ? new Date(ci.createdAt).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : null;
  const compactMoney = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n}`;

  return (
    <div>
      <h3 className="font-semibold text-foreground mb-4">About the client</h3>
      <div className="space-y-3 text-sm">
        <p className="flex items-center gap-2 text-foreground">
          <span
            className={
              ci?.paymentVerified ? "text-primary" : "text-muted-foreground"
            }
          >
            {ci?.paymentVerified ? "✓" : "○"}
          </span>
          Payment method {ci?.paymentVerified ? "verified" : "not verified"}
        </p>
        <p className="flex items-center gap-2 text-foreground">
          <span className={phone ? "text-primary" : "text-muted-foreground"}>
            {phone ? "✓" : "○"}
          </span>
          Phone number {phone ? "verified" : "not verified"}
        </p>
        {ci && ci.reviewCount > 0 && (
          <p className="text-foreground">
            ★ {ci.avgRating.toFixed(1)}{" "}
            <span className="text-muted-foreground">
              ({ci.reviewCount} review{ci.reviewCount === 1 ? "" : "s"})
            </span>
          </p>
        )}
        {ci?.country && (
          <p className="text-muted-foreground">
            📍 {ci.country}
            {timezone && (
              <span>
                {" · "}
                <LocalTime timezone={timezone} /> local time
              </span>
            )}
          </p>
        )}
        {ci && ci.totalSpent > 0 ? (
          <p className="text-muted-foreground">
            {compactMoney(ci.totalSpent)} total spent
            {ci.hires > 0 && ` · ${ci.hires} hire${ci.hires === 1 ? "" : "s"}`}
            {activeContracts > 0 && `, ${activeContracts} active`}
          </p>
        ) : (
          <span className="inline-block text-xs bg-secondary text-foreground rounded-full px-2.5 py-1">
            New client
          </span>
        )}
        <p className="text-muted-foreground">
          {ci?.jobsPosted ?? 0} job{(ci?.jobsPosted ?? 0) === 1 ? "" : "s"}{" "}
          posted
          {typeof ci?.hireRate === "number" &&
            (ci?.jobsPosted ?? 0) > 0 &&
            ` · ${ci.hireRate}% hire rate`}
        </p>
        {ci && ci.openJobs > 0 && (
          <p className="text-muted-foreground">
            {ci.openJobs} open job{ci.openJobs === 1 ? "" : "s"}
          </p>
        )}
        {memberSince && (
          <p className="text-muted-foreground">Member since {memberSince}</p>
        )}
      </div>
    </div>
  );
}
