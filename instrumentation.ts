// Next.js instrumentation. `onRequestError` fires whenever the server captures
// an error, giving us one place to forward every server error to monitoring.
import { reportError } from "@/lib/monitoring";

export async function onRequestError(
  err: unknown,
  request: { path?: string; method?: string },
  context: { routerKind?: string; routePath?: string }
): Promise<void> {
  await reportError(err, {
    path: request?.path,
    method: request?.method,
    routePath: context?.routePath,
    routerKind: context?.routerKind,
  });
}
