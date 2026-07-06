// Red banner shown on a suspended account's profile and dashboard.
export function SuspensionBanner({ self = false }: { self?: boolean }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 p-4 flex items-start gap-3">
      <span className="text-xl leading-none" aria-hidden>
        🚫
      </span>
      <div>
        <p className="font-semibold">
          {self
            ? "Your account has been suspended"
            : "This account has been suspended"}
        </p>
        <p className="text-sm mt-1">
          {self
            ? "Your account was permanently suspended after 3 policy warnings for trying to share contact details or take payments off Xwork. You can no longer send messages or apply to jobs. If you believe this was a mistake, please contact our support team."
            : "This account has been suspended for repeated policy violations and can't be hired or contacted right now."}
        </p>
      </div>
    </div>
  );
}
