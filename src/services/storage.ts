import { JournalEntry } from '../types/journal';
import { aggregateRobertaScores, normalizeAnalysisTo8Emotions } from './robertaService';
import { auth } from '../lib/firebase';

const STORAGE_KEY = 'journal_entries';

const SEED_TEXT_1 =
  "I am so happy today! Everything went perfectly and I feel amazing. Our team launched the project successfully and celebrated together.";
const SEED_SCORES_1 = {
  joy: 0.88,
  admiration: 0.65,
  excitement: 0.54,
  gratitude: 0.42,
  optimism: 0.38,
  pride: 0.45,
  approval: 0.31,
  relief: 0.22,
  love: 0.15,
  neutral: 0.01,
  sadness: 0.01,
  nervousness: 0.01,
};

const SEED_TEXT_2 =
  "Took a long walk in the morning park. The air was fresh and calm. I felt so much peace and gratitude for simple moments.";
const SEED_SCORES_2 = {
  relief: 0.82,
  caring: 0.61,
  gratitude: 0.58,
  joy: 0.35,
  optimism: 0.29,
  approval: 0.21,
  neutral: 0.08,
  nervousness: 0.02,
  sadness: 0.01,
};

const SEED_TEXT_3 =
  "Had tight deadlines at work today. Felt quite stressed and overwhelmed with all the pending reviews, but determined to get through it tomorrow.";
const SEED_SCORES_3 = {
  nervousness: 0.74,
  annoyance: 0.61,
  disappointment: 0.38,
  desire: 0.42,
  optimism: 0.35,
  fear: 0.28,
  relief: 0.05,
  joy: 0.02,
};

const INITIAL_ENTRIES: JournalEntry[] = [
  {
    id: 'seed-1',
    text: SEED_TEXT_1,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    analysisStatus: 'complete',
    analysis: aggregateRobertaScores(SEED_SCORES_1, SEED_TEXT_1),
  },
  {
    id: 'seed-2',
    text: SEED_TEXT_2,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
    analysisStatus: 'complete',
    analysis: aggregateRobertaScores(SEED_SCORES_2, SEED_TEXT_2),
  },
  {
    id: 'seed-3',
    text: SEED_TEXT_3,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 52).toISOString(),
    analysisStatus: 'complete',
    analysis: aggregateRobertaScores(SEED_SCORES_3, SEED_TEXT_3),
  },
];

function normalizeEntries(entries: JournalEntry[]): JournalEntry[] {
  return entries.map((entry) =>
    entry.analysis
      ? {
          ...entry,
          analysis: normalizeAnalysisTo8Emotions(entry.analysis),
        }
      : entry
  );
}

export const JournalStorage = {
  getEntries(): JournalEntry[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ENTRIES));
        return INITIAL_ENTRIES;
      }
      return normalizeEntries(JSON.parse(stored));
    } catch (e) {
      console.error('Failed to load journals from localStorage', e);
      return INITIAL_ENTRIES;
    }
  },

  async syncWithCloud(): Promise<JournalEntry[]> {
    if (!auth.currentUser) return this.getEntries();
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/journals', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const cloudEntries: JournalEntry[] = await res.json();
        if (cloudEntries && cloudEntries.length > 0) {
          const normalized = normalizeEntries(cloudEntries);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
          return normalized;
        } else {
          const local = this.getEntries();
          for (const entry of local) {
            await fetch('/api/journals', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ entry }),
            });
          }
        }
      }
    } catch (e) {
      console.warn('Sync with Cloud SQL failed, using local cache:', e);
    }
    return this.getEntries();
  },

  async saveEntry(entry: JournalEntry): Promise<void> {
    const entries = this.getEntries();
    const updated = [entry, ...entries.filter((e) => e.id !== entry.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    if (auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken();
        await fetch('/api/journals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ entry }),
        });
      } catch (e) {
        console.warn('Failed to persist to Cloud SQL, saved locally:', e);
      }
    }
  },

  async updateEntry(updatedEntry: JournalEntry): Promise<void> {
    const entries = this.getEntries();
    const index = entries.findIndex((e) => e.id === updatedEntry.id);
    if (index !== -1) {
      entries[index] = updatedEntry;
    } else {
      entries.unshift(updatedEntry);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));

    if (auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken();
        await fetch('/api/journals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ entry: updatedEntry }),
        });
      } catch (e) {
        console.warn('Failed to update in Cloud SQL:', e);
      }
    }
  },

  async deleteEntry(id: string): Promise<void> {
    const entries = this.getEntries();
    const updated = entries.filter((e) => e.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    if (auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken();
        await fetch(`/api/journals/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {
        console.warn('Failed to delete from Cloud SQL:', e);
      }
    }
  },

  async clearAll(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
  },
};
