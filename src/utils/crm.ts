// Optional link to Iggy's CRM (an HTTP API: POST <CRM_URL>/api/<tool> with a bearer token).
// When CRM_URL, CRM_TOKEN and CRM_DISCORD_USER_IDS are set, the listed users get a
// "Who did you engage today?" question in the nightly reflection. Each line is what the user
// did with someone ("messaged cam"). Claude reads out the people and the kind of contact.
// Each person is matched in the CRM or added to it, and the line is logged for that day.
import Anthropic from '@anthropic-ai/sdk';
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

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

const KINDS = ['hangout', 'call', 'text', 'date', 'party', 'met'] as const;

/** One thing the user did: the line as written, the people in it and the kind of contact. */
export interface Engagement { line: string; people: string[]; kind: string }

/** Splits the answer into lines: one per line, or separated by commas or semicolons. */
export function splitLines(text: string): string[] {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const raw of text.split(/\n|,|;/)) {
    const line = raw.replace(/^[\s\-*•\d.)]+/, '').trim();
    if (!line || line.length > 300) continue;
    const key = line.toLowerCase();
    if (!seen.has(key)) { seen.add(key); lines.push(line); }
  }
  return lines.slice(0, 50);
}

/** Without Claude: each short line is taken as a name, logged as a hangout. */
function fallbackEngagements(text: string): Engagement[] {
  return splitLines(text)
    .filter(l => l.split(/\s+/).length <= 3)
    .map(line => ({ line, people: [line], kind: 'hangout' }));
}

/** Reads the people and the kind of contact out of the answer. */
export async function parseEngagements(text: string): Promise<Engagement[]> {
  if (!anthropic) return fallbackEngagements(text);
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `The user answered "Who did you engage today?" in a nightly reflection. Each item says what they did with one or more people, for example "messaged cam" or "chatted lucia at length". Items are separated by new lines or commas, but a comma can also be inside one item.

For each item, return:
- "line": the item as written (keep the user's words)
- "people": the names of the people in it, written as a name (capitalize: "kat rice" -> "Kat Rice"). Leave out words that are not a person. Use [] if there is no person.
- "kind": one of ${KINDS.join(', ')}. Messages, DMs, sexting and chats in text are "text". Voice or video is "call". In person is "hangout" unless it is a date or a party. Meeting someone new is "met".

Respond with only a JSON array, no other text.

<answer>
${text}
</answer>`,
      }],
    });
    const out = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const json = out.slice(out.indexOf('['), out.lastIndexOf(']') + 1);
    const items = JSON.parse(json) as any[];
    return items
      .filter(i => i && typeof i.line === 'string' && Array.isArray(i.people))
      .map(i => ({
        line: i.line.trim().slice(0, 300),
        people: i.people.filter((p: unknown) => typeof p === 'string' && p.trim()).map((p: string) => p.trim().slice(0, 120)),
        kind: (KINDS as readonly string[]).includes(i.kind) ? i.kind : 'hangout',
      }))
      .filter(i => i.line)
      .slice(0, 50);
  } catch (e) {
    console.error('Could not parse the engage answer with Claude, using the fallback:', e);
    return fallbackEngagements(text);
  }
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

export async function logInteraction(people: number[], day: string, kind: string, summary: string): Promise<void> {
  await crmCall('log_interaction', { people, on: day, kind, summary });
}

export async function addPerson(name: string): Promise<PersonRow> {
  const r = await crmCall<{ person: PersonRow }>('add_person', { name, how_met: 'Added from the nightly reflection' });
  return r.person;
}

export interface EngageResult {
  logged: { line: string; people: string[] }[];
  added: string[];
  skipped: string[];
  failed: string[];
  error?: string;
}

/** Matches or adds each person, then logs each line as an interaction on that day. */
export async function recordEngagements(items: Engagement[], day: string): Promise<EngageResult> {
  const result: EngageResult = { logged: [], added: [], skipped: [], failed: [] };
  const resolved = new Map<string, PersonRow | null>();
  try {
    for (const item of items) {
      const people: PersonRow[] = [];
      for (const name of item.people) {
        const key = name.toLowerCase();
        if (!resolved.has(key)) {
          let p = await matchPerson(name);
          if (!p) {
            try {
              p = await addPerson(name);
              result.added.push(p.name);
            } catch (e) {
              // 409: the CRM thinks this is someone it already has, but the match was unclear
              if (!(e instanceof CrmHttpError) || e.status !== 409) throw e;
              result.failed.push(name);
            }
          }
          resolved.set(key, p);
        }
        const p = resolved.get(key);
        if (p && !people.some(x => x.id === p.id)) people.push(p);
      }
      if (!people.length) { result.skipped.push(item.line); continue; }
      await logInteraction(people.map(p => p.id), day, item.kind, item.line);
      result.logged.push({ line: item.line, people: people.map(p => p.name) });
    }
  } catch (e) {
    result.error = e instanceof Error ? e.message : String(e);
  }
  return result;
}
