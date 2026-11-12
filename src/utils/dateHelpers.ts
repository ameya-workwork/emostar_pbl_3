import { JournalEntry } from '../types/journal';
import { CoreEmotion, CORE_EMOTION_LIST, getEmotionMeta } from '../services/emotionTaxonomy';

/**
 * Converts a Date or ISO timestamp into a local calendar key 'YYYY-MM-DD'
 */
export function toLocalDateKey(input: Date | string): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses 'YYYY-MM-DD' into a local Date at midnight
 */
export function fromLocalDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/**
 * Returns the Sunday (start of week) at 00:00:00 local time for the week containing `date`
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayOfWeek = d.getDay(); // 0 = Sun
  d.setDate(d.getDate() - dayOfWeek);
  return d;
}

/**
 * Returns an array of 7 local Date objects for the week starting at `weekStart`
 */
export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
    return d;
  });
}

export interface DayEmotionSummary {
  dateKey: string;
  date: Date;
  entries: JournalEntry[];
  primaryEmotion: CoreEmotion | null;
  distribution: Record<CoreEmotion, number>;
}

/**
 * Groups journal entries by local calendar day and computes each day's
 * primary emotion and normalized 8-emotion distribution.
 */
export function buildDailyEmotionMap(entries: JournalEntry[]): Record<string, DayEmotionSummary> {
  const byDay: Record<string, JournalEntry[]> = {};

  for (const entry of entries) {
    if (!entry.createdAt) continue;
    const key = toLocalDateKey(entry.createdAt);
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(entry);
  }

  const result: Record<string, DayEmotionSummary> = {};

  for (const [dateKey, dayEntries] of Object.entries(byDay)) {
    const totals: Record<CoreEmotion, number> = {
      Joy: 0,
      Calm: 0,
      Motivation: 0,
      Confusion: 0,
      Anxiety: 0,
      Stress: 0,
      Sadness: 0,
      Anger: 0,
    };

    let counted = 0;
    for (const entry of dayEntries) {
      if (entry.analysis?.distribution) {
        counted++;
        for (const [em, pct] of Object.entries(entry.analysis.distribution)) {
          const core = getEmotionMeta(em).id;
          totals[core] += Math.max(0, Number(pct) || 0);
        }
      } else if (entry.analysis?.primary_emotion) {
        counted++;
        const core = getEmotionMeta(entry.analysis.primary_emotion).id;
        totals[core] += 100;
      }
    }

    let primaryEmotion: CoreEmotion | null = null;
    const distribution: Record<CoreEmotion, number> = { ...totals };

    if (counted > 0) {
      const sum = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
      let topEmotion: CoreEmotion = 'Calm';
      let topVal = -1;

      for (const em of CORE_EMOTION_LIST) {
        const pct = Math.round((totals[em] / sum) * 1000) / 10;
        distribution[em] = pct;
        if (totals[em] > topVal) {
          topVal = totals[em];
          topEmotion = em;
        }
      }
      primaryEmotion = topEmotion;
    }

    // Sort day's entries newest first
    const sortedEntries = [...dayEntries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    result[dateKey] = {
      dateKey,
      date: fromLocalDateKey(dateKey),
      entries: sortedEntries,
      primaryEmotion,
      distribution,
    };
  }

  return result;
}
