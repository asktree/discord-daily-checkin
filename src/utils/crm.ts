// Optional link to Iggy's CRM (an HTTP API: POST <CRM_URL>/api/<tool> with a bearer token).
// When CRM_URL, CRM_TOKEN and CRM_DISCORD_USER_IDS are set, the listed users get a
// "Who did you engage today?" question in the nightly reflection. Names that match one
// CRM person get a hangout logged for that day; other names get "Add" buttons.
import { formatInTimeZone } from 'date-fns-tz';
import { subDays } from 'date-fns';

const CRM_URL = process.env.CRM_URL?.trim().replace(/\/+$/, '');
const CRM_TOKEN = process.env.CRM_TOKEN?.trim();
const CRM_USERS = new Set(
  (process.env.CRM_DISCORD_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
);

export class CrmHttpError extends Error { constructor(msg: string, readonly status: number) { super(msg); } }

export function crmEnabledFor(userId: string): boolean {
  return Boolean(CRM_URL && CRM_TOKEN && CRM_USERS.has(userId));
}

async function crmCall<T = any>(tool: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${CRM_URL}/api/${tool}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${CRM_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(15_000),
  });
  const body: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new CrmHttpError(`CRM ${tool} failed (${res.status}): ${body?.error?.message ?? 'unknown error'}`, res.status);
  return body as T;
}

/** Splits the answer into names: one per line, or separated by commas, "and" or "&". */
export function parseNames(text: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const raw of text.split(/\n|,|;|&|\band\b/i)) {
    const name = raw.replace(/^[\s\-*•\d.)]+/, '').trim();
    if (!name || name.length > 120) continue;
    const key = name.toLowerCase();
    if (!seen.has(key)) { seen.add(key); names.push(name); }
  }
  return names.slice(0, 50);
}

/** The day the reflection is about: before 5 am local time it still counts as yesterday. */
export function reflectionDay(now: Date, timezone: string): string {
  const hour = Number(formatInTimeZone(now, timezone, 'H'));
  const day = hour < 5 ? subDays(now, 1) : now;
  return formatInTimeZone(day, timezone, 'yyyy-MM-dd');
}

interface PersonRow { id: number; name: string }

/**
 * One CRM person for a name, or null. First the CRM's own exact match on name or nickname.
 * Else a first-name match: exactly one search hit whose first name is the given name.
 */
export async function matchPerson(name: string): Promise<PersonRow | null> {
  try {
    const p = await crmCall<PersonRow>('get_person', { person: name, interactions: 1 });
    if (p?.id) return { id: p.id, name: p.name };
  } catch (e) {
    if (!(e instanceof CrmHttpError) || ![404, 409].includes(e.status)) throw e;
  }
  const r = await crmCall<{ people?: PersonRow[] }>('search_people', { query: name, limit: 10 });
  const key = name.toLowerCase();
  const first = (r.people ?? []).filter(p => p.name.toLowerCase().split(/\s+/)[0] === key);
  return first.length === 1 ? first[0] : null;
}

export async function logHangout(people: (number | string)[], day: string): Promise<void> {
  await crmCall('log_interaction', { people, on: day, kind: 'hangout', summary: 'Seen today (nightly reflection)' });
}

export async function addPerson(name: string): Promise<PersonRow> {
  const r = await crmCall<{ person: PersonRow }>('add_person', { name, how_met: 'Added from the nightly reflection' });
  return r.person;
}

export interface SeenResult { logged: string[]; unmatched: string[]; error?: string }

export async function recordSeen(names: string[], day: string): Promise<SeenResult> {
  const logged: string[] = [];
  const unmatched: string[] = [];
  const ids: number[] = [];
  try {
    for (const name of names) {
      const p = await matchPerson(name);
      if (p && !ids.includes(p.id)) { ids.push(p.id); logged.push(p.name); }
      else if (!p) unmatched.push(name);
    }
    if (ids.length) await logHangout(ids, day);
    return { logged, unmatched };
  } catch (e) {
    return { logged: [], unmatched, error: e instanceof Error ? e.message : String(e) };
  }
}
