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
  item?: string;     // Ledger item that gets the nightly log line (none when absent)
  objective?: string; // Ledger objective that holds the KPI
  kpi?: string;      // KPI name on the objective
  target?: number;   // KPI target
  kpiMode?: 'streak' | 'count7'; // KPI value: nights in a row (default), or "yes" nights in the last 7
}

// A 0-100% self-rating asked after the nightly reflection. KPI = mean of the last 7 answers.
export interface Rating {
  id: string;        // history key
  question: string;  // select placeholder text
  objective: string; // Ledger objective that holds the KPI
  kpi: string;       // KPI name on the objective
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
    return list.filter((h: any) => h && typeof h.id === 'string' && typeof h.label === 'string'
      && (h.item === undefined || typeof h.item === 'string'))
      .slice(0, 25);
  } catch (error) {
    console.error('Ignoring HABITS: not valid JSON.', error);
    return [];
  }
}

function parseRatings(): Rating[] {
  const raw = process.env.RATINGS?.trim();
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) throw new Error('RATINGS must be a JSON array');
    return list.filter((r: any) => r && typeof r.id === 'string' && typeof r.question === 'string'
      && typeof r.objective === 'string' && typeof r.kpi === 'string')
      .slice(0, 4);
  } catch (error) {
    console.error('Ignoring RATINGS: not valid JSON.', error);
    return [];
  }
}

export const HABITS: Habit[] = parseHabits();
export const RATINGS: Rating[] = parseRatings();

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

/** "Yes" nights among the 7 nights ending on `day`. */
export function countLast7(days: Record<string, boolean>, day: string): number {
  let count = 0;
  for (let i = 0, d = day; i < 7; i++, d = previousDay(d)) if (days[d] === true) count++;
  return count;
}

export interface HabitResult { habit: Habit; done: boolean; streak: number; last7: number; error?: string }

/** Records one night's answers. A second answer for the same night replaces the first. */
export async function recordHabits(userId: string, day: string, doneIds: Set<string>): Promise<HabitResult[]> {
  const history = loadHistory();
  const userHistory = (history[userId] ??= {});
  const results: HabitResult[] = [];
  for (const habit of HABITS) {
    const done = doneIds.has(habit.id);
    const days = (userHistory[habit.id] ??= {});
    days[day] = done;
    results.push({ habit, done, streak: streakEndingOn(days, day), last7: countLast7(days, day) });
  }
  saveHistory(history);

  for (const r of results) {
    try {
      if (r.habit.item) {
        await ledgerCall('log', { id: r.habit.item, text: `${day}: ${r.done ? 'yes' : 'no'}`, agent: 'checkin' });
      }
      if (r.habit.objective && r.habit.kpi) {
        const current = r.habit.kpiMode === 'count7' ? r.last7 : r.streak;
        const kpi: Record<string, unknown> = { id: r.habit.objective, name: r.habit.kpi, current, agent: 'checkin' };
        if (r.habit.target !== undefined) kpi.target = r.habit.target;
        await ledgerCall('set_kpi', kpi);
      }
    } catch (error) {
      r.error = error instanceof Error ? error.message : String(error);
    }
  }
  return results;
}

// Ratings history: { userId: { ratingId: { "YYYY-MM-DD": 0-100 } } }
type RatingHistory = Record<string, Record<string, Record<string, number>>>;

function ratingsFile(): string {
  return path.join(getDataDir(), 'ratings.json');
}

/** Mean of the last `n` answers (by day), rounded to a whole number. */
export function meanOfLast(days: Record<string, number>, n = 7): number {
  const values = Object.keys(days).sort().slice(-n).map(d => days[d]);
  return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
}

export interface RatingResult { rating: Rating; value: number; mean: number; answers: number; error?: string }

/** Records one night's rating. A second answer for the same night replaces the first. */
export async function recordRating(userId: string, ratingId: string, day: string, value: number): Promise<RatingResult | null> {
  const rating = RATINGS.find(r => r.id === ratingId);
  if (!rating) return null;
  let history: RatingHistory = {};
  try {
    history = JSON.parse(fs.readFileSync(ratingsFile(), 'utf-8'));
  } catch { /* first rating */ }
  const days = ((history[userId] ??= {})[ratingId] ??= {});
  days[day] = value;
  fs.mkdirSync(path.dirname(ratingsFile()), { recursive: true });
  fs.writeFileSync(ratingsFile(), JSON.stringify(history, null, 2));

  const result: RatingResult = { rating, value, mean: meanOfLast(days), answers: Math.min(7, Object.keys(days).length) };
  try {
    const kpi: Record<string, unknown> = { id: rating.objective, name: rating.kpi, current: result.mean, agent: 'checkin' };
    if (rating.target !== undefined) kpi.target = rating.target;
    await ledgerCall('set_kpi', kpi);
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }
  return result;
}
