import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser } from './src/db/users.ts';
import {
  getJournals,
  saveJournal,
  deleteJournal,
  logMeditation,
  getMeditationStats,
} from './src/db/journals.ts';
import {
  analyzeWithSemanticModel,
  warmUpSemanticAnalyzer,
} from './src/services/semanticAnalyzer.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());
  warmUpSemanticAnalyzer();

  // Helper to get sanitized Gemini client
  let lastGeminiStatus: 'unconfigured' | 'active' | 'invalid_key' | 'error' = 'unconfigured';
  let cachedKey = '';
  let cachedAi: GoogleGenAI | null = null;

  const getGeminiClient = (): GoogleGenAI | null => {
    const rawKey = (process.env.GEMINI_API_KEY || '')
      .trim()
      .replace(/^["']|["']$/g, '')
      .trim();
    if (!rawKey) {
      lastGeminiStatus = 'unconfigured';
      return null;
    }
    if (rawKey !== cachedKey || !cachedAi) {
      cachedKey = rawKey;
      cachedAi = new GoogleGenAI({
        apiKey: rawKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
    return cachedAi;
  };

  // Deep AI Semantic Emotion Analysis endpoint
  app.post('/api/analyze', async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Journal text is required' });
      }

      const ai = getGeminiClient();
      if (ai) {
        const systemInstruction = `You are an expert cognitive psychologist and pragmatic sentiment analyst for EmoStar.
Your job is to perform DEEP SEMANTIC & SUBTEXT ANALYSIS on personal journal entries—never shallow keyword matching.

Read the whole sentence meaning, emotional understatement, euphemisms, idioms, tone, and negations:
- Understated low mood ("I am a little off", "my mood is not the best", "not feeling myself", "feeling meh", "could be better", "a bit low", "empty") expresses genuine SADNESS (possibly blended with Anxiety, Stress, or Confusion), NOT Calm and NEVER Joy.
- Negated positive phrases ("not happy", "don't feel good", "hard to stay excited", "not great") convey Sadness, Disappointment, or Stress—never trigger positive emotions from negated words.
- Masked distress ("I'm fine I guess", "whatever, it doesn't matter anymore") reflects Sadness, Fatigue/Stress, or suppressed frustration rather than Calm.
- Quiet pressure ("too much on my plate", "running on empty", "can't switch my brain off") reflects Stress or Anxiety.

You MUST classify strictly into these 8 grouped emotions:
1. Joy (happiness, gratitude, love, excitement, pride, amusement, admiration)
2. Calm (genuine inner peace, serenity, relief, caring, tranquil grounding — do NOT use Calm as a catch-all for vague low mood)
3. Sadness (low mood, feeling off, sorrow, disappointment, grief, loneliness, emotional heaviness)
4. Anxiety (worry, nervousness, fear, unease, dread, overthinking)
5. Anger (frustration, irritation, annoyance, resentment, disapproval)
6. Confusion (uncertainty, mixed feelings, perplexity, curiosity, surprise)
7. Motivation (drive, hope, optimism, determination, purposeful momentum)
8. Stress (overwhelm, pressure, deadlines, burnout, mental exhaustion)

Return JSON matching the schema. Only assign non-zero percentages to emotions genuinely present in the text (typically 1 to 4 emotions) summing to EXACTLY 100.0; set absent emotions to 0 or omit them.`;

        const prompt = `Analyze the true emotional meaning and psychological subtext of this journal entry:

---
"${text}"
---

Provide:
1. "primary_emotion": one of Joy, Calm, Sadness, Anxiety, Anger, Confusion, Motivation, Stress.
2. "secondary_emotions": up to 3 other co-occurring emotions from the 8 (empty array if only 1 emotion is genuinely expressed).
3. "distribution": percentage weights across the genuinely detected emotions totaling EXACTLY 100.0 (keep unrelated emotions at 0).
4. "emotional_triggers": 1-2 concise sentences identifying the underlying cause or tone in the reflection.
5. "mindful_insight": a brief, warm, empathetic reflection tailored to the writer's actual emotional state.`;

        let lastError: any = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const response = await ai.models.generateContent({
              model: 'gemini-4-hydrogen',
              contents: prompt,
              config: {
                systemInstruction,
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    primary_emotion: { type: Type.STRING },
                    secondary_emotions: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    distribution: {
                      type: Type.OBJECT,
                      description: 'Percentage distribution across detected emotions totaling 100%',
                      properties: {
                        Joy: { type: Type.NUMBER },
                        Calm: { type: Type.NUMBER },
                        Sadness: { type: Type.NUMBER },
                        Anxiety: { type: Type.NUMBER },
                        Anger: { type: Type.NUMBER },
                        Confusion: { type: Type.NUMBER },
                        Motivation: { type: Type.NUMBER },
                        Stress: { type: Type.NUMBER },
                      },
                    },
                    emotional_triggers: { type: Type.STRING },
                    mindful_insight: { type: Type.STRING },
                  },
                  required: ['primary_emotion', 'secondary_emotions', 'distribution', 'mindful_insight'],
                },
              },
            });

            const rawText = (response.text ?? '')
              .trim()
              .replace(/^```json\s*/i, '')
              .replace(/^```\s*/i, '')
              .replace(/```$/i, '')
              .trim();

            if (rawText) {
              const parsed = JSON.parse(rawText);
              lastGeminiStatus = 'active';
              return res.json({
                ...parsed,
                model_source: 'Gemini 4 Semantic Engine (8-Emotion Model)',
              });
            }
          } catch (err: any) {
            lastError = err;
            const msg = String(err?.message || '');
            if (msg.includes('API_KEY_INVALID') || msg.includes('PERMISSION_DENIED')) {
              lastGeminiStatus = 'invalid_key';
              break; // Don't retry an invalid API key
            }
            lastGeminiStatus = 'error';
            if (attempt === 0) {
              await new Promise((r) => setTimeout(r, 400));
            }
          }
        }
        console.warn(
          'Server Gemini call unavailable, switching to MiniLM neural semantic analyzer:',
          lastError?.message
        );
      }

      const semanticResult = await analyzeWithSemanticModel(text);
      return res.json(semanticResult);
    } catch (error: any) {
      console.warn('Server semantic analysis failed, falling back to client engine:', error.message);
      return res.status(500).json({ error: error.message || 'Analysis failed', fallback: true });
    }
  });

  // User synchronization on sign in
  app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user || !req.user.uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const { displayName, photoURL } = req.body;
      const user = await getOrCreateUser(
        req.user.uid,
        req.user.email || '',
        displayName,
        photoURL
      );
      res.json(user);
    } catch (e: any) {
      console.error('Auth sync failed:', e);
      res.status(500).json({ error: 'Auth sync failed' });
    }
  });

  // Cloud SQL Journals endpoints
  app.get('/api/journals', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user?.uid) return res.status(401).json({ error: 'Unauthorized' });
      const userJournals = await getJournals(req.user.uid);
      res.json(userJournals);
    } catch (e: any) {
      console.error('Fetch journals error:', e);
      res.status(500).json({ error: 'Failed to fetch journals' });
    }
  });

  app.post('/api/journals', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user?.uid) return res.status(401).json({ error: 'Unauthorized' });
      const { entry } = req.body;
      if (!entry || !entry.id || !entry.text) {
        return res.status(400).json({ error: 'Valid journal entry required' });
      }

      // Ensure user exists first
      await getOrCreateUser(req.user.uid, req.user.email || '');
      const saved = await saveJournal(req.user.uid, entry);
      res.json(saved);
    } catch (e: any) {
      console.error('Save journal error:', e);
      res.status(500).json({ error: 'Failed to save journal to database' });
    }
  });

  app.delete('/api/journals/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user?.uid) return res.status(401).json({ error: 'Unauthorized' });
      await deleteJournal(req.user.uid, String(req.params.id));
      res.json({ success: true });
    } catch (e: any) {
      console.error('Delete journal error:', e);
      res.status(500).json({ error: 'Failed to delete journal' });
    }
  });

  // Meditation endpoints
  app.post('/api/meditation', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user?.uid) return res.status(401).json({ error: 'Unauthorized' });
      const { durationSeconds, patternName } = req.body;
      await getOrCreateUser(req.user.uid, req.user.email || '');
      const logged = await logMeditation(
        req.user.uid,
        durationSeconds || 300,
        patternName || 'Mindful Breath'
      );
      res.json(logged);
    } catch (e: any) {
      console.error('Log meditation error:', e);
      res.status(500).json({ error: 'Failed to log meditation' });
    }
  });

  app.get('/api/meditation/stats', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user?.uid) return res.status(401).json({ error: 'Unauthorized' });
      const stats = await getMeditationStats(req.user.uid);
      res.json(stats);
    } catch (e: any) {
      console.error('Meditation stats error:', e);
      res.status(500).json({ error: 'Failed to load stats' });
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasGeminiKey: Boolean(getGeminiClient()),
      geminiStatus: lastGeminiStatus,
      database: 'Cloud SQL PostgreSQL Active',
    });
  });

  // Mount Vite in development mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
