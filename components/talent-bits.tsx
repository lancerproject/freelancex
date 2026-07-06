import Link from "next/link";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function TalentCard({ f }: { f: any }) {
  const initials = (f.full_name || f.username || "?").slice(0, 1).toUpperCase();
  return (
    <Link
      href={`/profile/${f.id}`}
      className="rounded-2xl bg-secondary p-6 flex flex-col items-center text-center hover:opacity-90 transition"
    >
      {f.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={f.avatar_url}
          alt=""
          className="w-16 h-16 rounded-full object-cover border border-border"
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
          {initials}
        </div>
      )}
      <p className="font-semibold text-foreground mt-3">
        {f.full_name || f.username || "Freelancer"}
      </p>
      {f.title && (
        <p className="text-sm text-muted-foreground mt-0.5">{f.title}</p>
      )}
    </Link>
  );
}

export function EmptyTalent({ line }: { line: string }) {
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl bg-secondary h-44 flex items-center justify-center text-5xl text-muted-foreground"
          >
            👤
          </div>
        ))}
      </div>
      <p className="text-center text-muted-foreground mt-8">{line}</p>
      <div className="text-center mt-5">
        <Link
          href="/freelancers"
          className="inline-flex items-center gap-2 border border-primary text-primary px-6 py-2.5 rounded-full font-medium hover:bg-primary/10"
        >
          🔍 Find Talent
        </Link>
      </div>
    </div>
  );
}
