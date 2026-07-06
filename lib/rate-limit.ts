// Soft, abuse-prevention rate limiting. Rather than a separate store, we count
// a user's own recent rows in the table they're about to write to (proposals,
// messages, …). This is robust across server instances and needs no extra
// schema. Note: Supabase Auth already rate-limits signups/auth endpoints
// server-side, so account creation is covered upstream.
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;

// Returns true when the user has already hit `max` rows in `table` (matched on
// `column`) within the trailing `windowSeconds` — i.e. the action should be
// blocked.
export async function isRateLimited(
  supabase: DB,
  table: string,
  column: string,
  userId: string,
  windowSeconds: number,
  max: number
): Promise<boolean> {
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const { count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(column, userId)
    .gte("created_at", since);
  return (count ?? 0) >= max;
}
