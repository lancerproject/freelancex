// The "⭐ Pro" badge shown next to a freelancer's name wherever Pro status is
// surfaced (own dashboard, public profile, proposal cards, directory). Brand
// purple pill — never green. Render only when the freelancer is an active Pro.
export function ProBadge({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  const sizing =
    size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5";
  return (
    <span
      title="Pro member"
      className={`inline-flex items-center gap-1 rounded-full font-semibold bg-primary/10 text-primary border border-primary/20 ${sizing} ${className}`}
    >
      <span aria-hidden>⭐</span>
      Pro
    </span>
  );
}
