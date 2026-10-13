// Optional nightly habit tracking, linked to Iggy's Ledger (POST <LEDGER_URL>/api/<tool> with a bearer token).
// When LEDGER_URL, LEDGER_TOKEN, HABITS and HABIT_DISCORD_USER_IDS are set, the listed users get a
// "Before bed I did:" multi-select in the nightly reflection. An option that is not picked counts as "no".
// Each night: one log line on the habit's Ledger item ("2026-10-13: yes") and the streak KPI on its objective.
import * as fs from 'fs';
import * as path from 'path';
import { getDataDir } from '../config/dataPath';

export interface Habit {
  id: string;        // select option value and history key
  label: string;     // option text in the form
  item: string;      // Ledger item that gets the nightly log line
  objective?: string; // Ledger objective that holds the streak KPI
  kpi?: string;      // KPI name on the objective
  target?: number;   // KPI target
}

const LEDGER_URL = process.env.LEDGER_URL?.trim().replace(/\/+$/, '');
const LEDGER_TOKEN = process.env.LEDGER_TOKEN?.trim();
const HABIT_USERS = new Set(
  (process.env.HABIT_DISCORD_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
);

function parseHabits(): Habit[] {
  const raw = process.env.HABITS?.trim();
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) throw new Error('HABITS must be a JSON array');
    return list.filter((h: any) => h && typeof h.id === 'string' && typeof h.label === 'string' && typeof h.item === 'string')
      .slice(0, 25);
  } catch (error) {
    console.error('Ignoring HABITS: not valid JSON.', error);
    return [];
  }
}

export const HABITS: Habit[] = parseHabits();

export function habitsEnabledFor(userId: string): boolean {
  return Boolean(LEDGER_URL && LEDGER_TOKEN && HABITS.length && HABIT_USERS.has(userId));
}

async function ledgerCall(tool: string, args: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${LEDGER_URL}/api/${tool}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${LEDGER_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(15_000),
  });
  const body: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Ledger ${tool} failed (${res.status}): ${body?.error?.message ?? body?.error ?? 'unknown error'}`);
  return body;
}

// History: { userId: { habitId: { "YYYY-MM-DD": true|false } } }
type History = Record<string, Record<string, Record<string, boolean>>>;

function historyFile(): string {
  return path.join(getDataDir(), 'habits.json');
}

function loadHistory(): History {
  try {
    return JSON.parse(fs.readFileSync(historyFile(), 'utf-8'));
  } catch {
    return {};
  }
}

function saveHistory(history: History): void {
  fs.mkdirSync(path.dirname(historyFile()), { recursive: true });
  fs.writeFileSync(historyFile(), JSON.stringify(history, null, 2));
}

function previousDay(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Nights in a row with "yes", ending on `day`. A "no" or a missed night ends the streak. */
export function streakEndingOn(days: Record<string, boolean>, day: string): number {
  let streak = 0;
  for (let d = day; days[d] === true; d = previousDay(d)) streak++;
  return streak;
}

export interface HabitResult { habit: Habit; done: boolean; streak: number; error?: string }

/** Records one night's answers. A second answer for the same night replaces the first. */
export async function recordHabits(userId: string, day: string, doneIds: Set<string>): Promise<HabitResult[]> {
  const history = loadHistory();
  const userHistory = (history[userId] ??= {});
  const results: HabitResult[] = [];
  for (const habit of HABITS) {
    const done = doneIds.has(habit.id);
    const days = (userHistory[habit.id] ??= {});
    days[day] = done;
    results.push({ habit, done, streak: streakEndingOn(days, day) });
  }
  saveHistory(history);

  for (const r of results) {
    try {
      await ledgerCall('log', { id: r.habit.item, text: `${day}: ${r.done ? 'yes' : 'no'}`, agent: 'checkin' });
      if (r.habit.objective && r.habit.kpi) {
        const kpi: Record<string, unknown> = { id: r.habit.objective, name: r.habit.kpi, current: r.streak, agent: 'checkin' };
        if (r.habit.target !== undefined) kpi.target = r.habit.target;
        await ledgerCall('set_kpi', kpi);
      }
    } catch (error) {
      r.error = error instanceof Error ? error.message : String(error);
    }
  }
  return results;
}
