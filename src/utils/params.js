/** URL query parameters, e.g. `?seed=42&debug`. */
export const params = new URLSearchParams(window.location.search);

/** Returns the `seed` parameter as a number, or null if absent. */
export function seedFromUrl() {
  const s = params.get('seed');
  return s !== null && s !== '' ? Number(s) : null;
}
