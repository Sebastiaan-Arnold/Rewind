// Reads options from the page address, e.g.  localhost:5173/?seed=42&debug
export const params = new URLSearchParams(window.location.search);

export function seedFromUrl() {
  const s = params.get('seed');
  return s !== null && s !== '' ? Number(s) : null;
}
