/**
 * Full-document navigation, as a named function.
 *
 * Three places need it — login, logout and post-checkout — and all three for
 * the same reason: the Next client router caches RSC payloads per route, and a
 * session change (or a just-created order) invalidates those payloads. A soft
 * navigation can serve a cached response rendered for the *previous* session,
 * which shows up as "logged in but bounced back to /login" or "order placed
 * but the list is empty".
 *
 * Having it behind a function rather than inline `window.location.assign`
 * calls means the intent is searchable, the reason is documented once, and
 * tests can mock one module instead of fighting jsdom over a non-configurable
 * `window.location`.
 */
export function hardNavigate(url: string): void {
  window.location.assign(url);
}
