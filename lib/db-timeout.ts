/**
 * Timeouts for every Supabase call a page makes.
 *
 * Why: on 14 and 15 Oct 2026 the Postgres instance stopped answering while
 * PostgREST stayed up, so queries hung instead of failing. Nothing in the page
 * paths had a timeout, so each request held a serverless function for the full
 * 300s `maxDuration` — crawlers walking /category/* piled up stuck functions and
 * a slow database read as a hard outage.
 *
 * The rule: a page must never wait on the database longer than a reader would.
 * Time out fast, render a degraded page, stay up.
 */

/** Page data reads. Long enough for a cold query, short enough to not strand a reader. */
export const DB_TIMEOUT_MS = 4000

/** Supabase Auth (`getUser`). Only decides which homepage variant renders. */
export const AUTH_TIMEOUT_MS = 3000

/**
 * Resolve `work`, or `fallback` if it takes longer than `ms`.
 *
 * Supabase query builders accept `.abortSignal()` and should use
 * `dbSignal()` as well — that actually cancels the request. This race is the
 * backstop for calls that cannot be aborted (e.g. `auth.getUser()`), and it
 * guarantees the caller is released on time either way.
 */
export async function withTimeout<T>(
  work: PromiseLike<T>,
  ms: number,
  label: string,
  fallback: T
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<T>(resolve => {
    timer = setTimeout(() => {
      console.error(`[db-timeout] ${label} exceeded ${ms}ms — serving fallback`)
      resolve(fallback)
    }, ms)
  })
  try {
    return await Promise.race([work, timeout])
  } catch (err) {
    console.error(`[db-timeout] ${label} failed:`, err)
    return fallback
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/** Abort signal for Supabase query builders: `.abortSignal(dbSignal())`. */
export function dbSignal(ms: number = DB_TIMEOUT_MS): AbortSignal {
  return AbortSignal.timeout(ms)
}
