/**
 * Resolve the app's base path (mount path) so client-side fetch() calls hit the
 * right URL whether the app is served at "/" (local) or "/planner-rsvp"
 * (Webflow Cloud).
 *
 * Order of preference:
 *   1. NEXT_PUBLIC_BASE_PATH if it was inlined at build time.
 *   2. The current URL's pathname — this app is a single page served at its
 *      mount root, so the pathname IS the base path. This is the reliable path
 *      on Webflow Cloud, which applies the mount path itself without exposing
 *      it as a NEXT_PUBLIC_ variable.
 */
export function getBasePath(): string {
  const configured = process.env.NEXT_PUBLIC_BASE_PATH;
  if (configured) return configured;
  if (typeof window !== 'undefined') {
    return window.location.pathname.replace(/\/+$/, '');
  }
  return '';
}
