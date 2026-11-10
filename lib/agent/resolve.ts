// Pure matching of names the model passes (people, projects, labels, task keys)
// to exactly one record. No `@/` imports so `node --test` can run it.

export type Resolved<T> = { ok: true; item: T } | { ok: false; error: string; candidates: string[] };

/** Lower-case, trim, collapse spaces, drop accents ("Tomás" matches "tomas"). */
export const norm = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").trim().toLowerCase().replace(/\s+/g, " ");

/** Predicate tiers are tried in order; the first tier with any match decides. */
type Tier<T> = (item: T, q: string) => boolean;

export function resolveOne<T>(query: string, items: T[], tiers: Tier<T>[], noun: string, label: (t: T) => string): Resolved<T> {
  const q = norm(query);
  const all = items.map(label);
  if (!q) return { ok: false, error: `${noun} is empty`, candidates: all };
  for (const tier of tiers) {
    const hits = items.filter((t) => tier(t, q));
    if (hits.length === 1) return { ok: true, item: hits[0] };
    if (hits.length > 1) {
      const names = hits.map(label);
      return { ok: false, error: `"${q}" matches ${hits.length} ${noun}s: ${names.join(", ")}`, candidates: names };
    }
  }
  return { ok: false, error: `no ${noun} matches "${q}"`, candidates: all };
}

const is = (...vals: (string | undefined)[]) => (q: string) => vals.some((v) => v !== undefined && norm(v) === q);

type PersonLike = { id: string; name: string; handle: string; initials: string };
const ME = new Set(["me", "myself", "i"]);

/** Person by full name, handle or id; then first name or initials. "me" is the requester. */
export function resolveMember<T extends PersonLike>(query: string, members: T[], meId: string): Resolved<T> {
  if (ME.has(norm(query))) {
    const me = members.find((m) => m.id === meId);
    if (me) return { ok: true, item: me };
  }
  return resolveOne(
    query,
    members,
    [(m, q) => is(m.name, m.handle, m.id)(q), (m, q) => is(m.name.split(" ")[0], m.initials)(q)],
    "workspace member",
    (m) => m.name,
  );
}

type ProjectLike = { id: string; key: string; name: string };
/** Project by key or id, then exact name, then name containing the text (3+ chars). */
export function resolveProject<T extends ProjectLike>(query: string, projects: T[]): Resolved<T> {
  return resolveOne(
    query,
    projects,
    [(p, q) => is(p.key, p.id)(q), (p, q) => is(p.name)(q), (p, q) => q.length >= 3 && norm(p.name).includes(q)],
    "project",
    (p) => `${p.name} (${p.key})`,
  );
}

export function resolveLabel<T extends { name: string }>(query: string, labels: T[]): Resolved<T> {
  return resolveOne(query, labels, [(l, q) => is(l.name)(q), (l, q) => q.length >= 3 && norm(l.name).includes(q)], "label", (l) => l.name);
}

/** "WEB-18" -> { project: "WEB", number: 18 }, or null. */
export function parseTaskKey(key: string): { project: string; number: number } | null {
  const m = /^([A-Za-z]{2,5})-(\d+)$/.exec(key.trim());
  return m ? { project: m[1].toUpperCase(), number: Number(m[2]) } : null;
}

/** A real calendar date written YYYY-MM-DD. */
export function isValidDate(d: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const t = new Date(`${d}T00:00:00Z`);
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d;
}
