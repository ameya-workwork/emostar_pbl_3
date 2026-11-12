import { db } from './index.ts';
import { journals, meditationSessions } from './schema.ts';
import { eq, and, desc } from 'drizzle-orm';
import { JournalEntry } from '../types/journal';

export async function getJournals(userId: string): Promise<JournalEntry[]> {
  try {
    const rows = await db
      .select()
      .from(journals)
      .where(eq(journals.userId, userId))
      .orderBy(desc(journals.createdAt));

    return rows.map((r) => ({
      id: r.id,
      text: r.text,
      createdAt: r.createdAt.toISOString(),
      analysisStatus: r.analysisStatus as any,
      analysis: {
        primary_emotion: r.primaryEmotion,
        secondary_emotions: JSON.parse(r.secondaryEmotions || '[]'),
        distribution: JSON.parse(r.distribution || '{}'),
        emotional_triggers: r.emotionalTriggers || undefined,
        mindful_insight: r.mindfulInsight || undefined,
        raw_scores: r.rawScores ? JSON.parse(r.rawScores) : undefined,
      },
    }));
  } catch (error) {
    console.error('Failed to get journals from database:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function saveJournal(userId: string, entry: JournalEntry) {
  try {
    const analysis = entry.analysis;
    const result = await db
      .insert(journals)
      .values({
        id: entry.id,
        userId,
        text: entry.text,
        primaryEmotion: analysis?.primary_emotion || 'Calm',
        secondaryEmotions: JSON.stringify(analysis?.secondary_emotions || []),
        distribution: JSON.stringify(analysis?.distribution || { Calm: 100 }),
        emotionalTriggers: analysis?.emotional_triggers || null,
        mindfulInsight: analysis?.mindful_insight || null,
        rawScores: analysis?.raw_scores ? JSON.stringify(analysis.raw_scores) : null,
        analysisStatus: entry.analysisStatus || 'complete',
        createdAt: new Date(entry.createdAt),
      })
      .onConflictDoUpdate({
        target: journals.id,
        set: {
          text: entry.text,
          primaryEmotion: analysis?.primary_emotion || 'Calm',
          secondaryEmotions: JSON.stringify(analysis?.secondary_emotions || []),
          distribution: JSON.stringify(analysis?.distribution || { Calm: 100 }),
          emotionalTriggers: analysis?.emotional_triggers || null,
          mindfulInsight: analysis?.mindful_insight || null,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Failed to save journal to database:', error);
    throw new Error('Database insert failed. Please try again later.', { cause: error });
  }
}

export async function deleteJournal(userId: string, journalId: string) {
  try {
    await db
      .delete(journals)
      .where(and(eq(journals.id, journalId), eq(journals.userId, userId)));
    return true;
  } catch (error) {
    console.error('Failed to delete journal:', error);
    throw new Error('Database deletion failed. Please try again later.', { cause: error });
  }
}

export async function logMeditation(
  userId: string,
  durationSeconds: number,
  patternName: string
) {
  try {
    const res = await db
      .insert(meditationSessions)
      .values({
        userId,
        durationSeconds,
        patternName,
      })
      .returning();
    return res[0];
  } catch (error) {
    console.error('Failed to log meditation:', error);
    throw new Error('Database meditation logging failed', { cause: error });
  }
}

export async function getMeditationStats(userId: string) {
  try {
    const rows = await db
      .select()
      .from(meditationSessions)
      .where(eq(meditationSessions.userId, userId));

    const totalMinutes = rows.reduce(
      (sum, r) => sum + Math.round(r.durationSeconds / 60),
      0
    );
    return {
      totalSessions: rows.length,
      totalMinutes,
    };
  } catch (error) {
    console.error('Failed to get meditation stats:', error);
    return { totalSessions: 0, totalMinutes: 0 };
  }
}
