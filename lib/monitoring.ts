// Central error reporting seam. Every server error flows through here.
//
// Out of the box it logs structured errors to the server console (visible in
// your hosting provider's logs). To ship errors to Sentry, set the env var
// MONITORING_WEBHOOK_URL to a Sentry-compatible ingest/webhook URL (Sentry
// "Internal Integration" webhooks, or a Slack incoming webhook, both work).
//
// When you're ready for the full Sentry SDK, run `npm i @sentry/nextjs` and add
// `Sentry.captureException(err, { extra: ctx })` to the block below — it's the
// single integration point, so nothing else needs to change.

type ErrCtx = Record<string, unknown>;

export async function reportError(err: unknown, ctx?: ErrCtx): Promise<void> {
  // Always log to the server console.
  // eslint-disable-next-line no-console
  console.error("[xwork:error]", ctx ?? {}, err);

  const hook = process.env.MONITORING_WEBHOOK_URL;
  if (!hook) return;

  try {
    const e = err as { message?: string; stack?: string; digest?: string };
    await fetch(hook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: e?.message ?? String(err),
        stack: e?.stack,
        digest: e?.digest,
        context: ctx ?? {},
        at: new Date().toISOString(),
      }),
    });
  } catch {
    // Never let error reporting throw.
  }
}
