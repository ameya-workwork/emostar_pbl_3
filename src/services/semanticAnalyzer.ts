import { pipeline, FeatureExtractionPipeline } from '@xenova/transformers';
import { EmotionAnalysis } from '../types/journal.ts';
import { CoreEmotion, CORE_EMOTION_LIST } from './emotionTaxonomy.ts';

const SEMANTIC_ANCHORS: Record<CoreEmotion, string[]> = {
  Joy: [
    'I feel so happy, grateful, delighted, and upbeat today.',
    'Today was awesome, exciting, and full of good news and celebration.',
    'I am smiling, proud of what happened, and feeling wonderful.',
    'I love spending time like this and feel deeply appreciative.',
  ],
  Calm: [
    'I feel peaceful, relaxed, grounded, and at ease inside.',
    'Everything feels serene, gentle, quiet, and emotionally balanced.',
    'After letting go, I feel a calm sense of relief and stillness.',
    'Today felt steady, tranquil, and comforting without rushing.',
  ],
  Sadness: [
    'I am feeling a little off today and my mood is not the best.',
    'I am never happy anymore and nothing feels exciting anymore.',
    'I feel down, discouraged, empty, lonely, and low in spirits.',
    'I tried so hard and it still went nowhere, leaving me disappointed.',
    'I just want to stay in bed all day because I feel heavy and sad.',
  ],
  Anxiety: [
    'I feel worried, nervous, uneasy, and on edge about what might happen.',
    'My mind will not stop racing with anxious thoughts and fear.',
    'I feel tense, restless, and a pit in my stomach before everything.',
    'I keep overthinking what could go wrong and cannot calm down.',
  ],
  Anger: [
    'I am frustrated, irritated, annoyed, and fed up with this situation.',
    'This feels unfair and makes me angry, resentful, and losing patience.',
    'People keep crossing my boundaries and it really ticks me off.',
    'I feel mad and disgusted by how poorly things were handled.',
  ],
  Confusion: [
    'I am not sure what to feel right now and my thoughts are mixed up.',
    'I feel puzzled, uncertain, conflicted, and caught off guard.',
    'Nothing makes clear sense to me at the moment and I feel indecisive.',
    'I had an unexpected realization and feel torn between choices.',
  ],
  Motivation: [
    'I feel driven, hopeful, focused, and ready to tackle my goals.',
    'I am determined to push forward, work hard, and make real progress.',
    'I feel inspired, ambitious, and energized for what comes next.',
    'Even when things are tough, I am committed to moving forward step by step.',
  ],
  Stress: [
    'Everything keeps piling up and I cannot keep pace with the pressure.',
    'I am overwhelmed, burnt out, exhausted, and have too much on my plate.',
    'Deadlines and responsibilities feel crushing and I cannot catch a break.',
    'I am running on empty and mentally drained from constant demands.',
  ],
};

const INSIGHTS: Record<CoreEmotion, string> = {
  Joy: 'Holding onto gratitude and genuine warmth strengthens emotional resilience and brightens your outlook.',
  Calm: 'Your words carry a grounded sense of stillness. Savoring this quiet balance helps anchor your mind.',
  Sadness: 'Be gentle with yourself today. Even when your mood feels off or low, acknowledging how you feel is an honest act of self-compassion.',
  Anxiety: 'Notice where tension is lingering in your thoughts. A brief 4-7-8 breathing cycle can help signal safety to your nervous system.',
  Anger: 'Frustration often points toward a boundary or value that matters deeply to you. Acknowledge the feeling before deciding your next step.',
  Confusion: 'It is completely okay not to have every feeling sorted out right now. Clarity often emerges after giving yourself room to pause.',
  Motivation: 'Your clarity of purpose and forward momentum stand out. Channel this drive steadily, one step at a time.',
  Stress: 'You are carrying a heavy cognitive load right now. Stepping away for a short 4-7-8 breath break can help restore mental breathing room.',
};

type SentimentResultItem = { label: string; score: number };
type SentimentPipelineFn = (text: string) => Promise<SentimentResultItem[]>;

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;
let sentimentPromise: Promise<SentimentPipelineFn> | null = null;
let anchorVectorsPromise: Promise<Record<CoreEmotion, number[][]>> | null = null;

function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return extractorPromise;
}

async function getSentimentClassifier(): Promise<SentimentPipelineFn> {
  if (!sentimentPromise) {
    sentimentPromise = pipeline(
      'sentiment-analysis',
      'Xenova/distilbert-base-uncased-finetuned-sst-2-english'
    ) as unknown as Promise<SentimentPipelineFn>;
  }
  return sentimentPromise;
}

async function getAnchorVectors(): Promise<Record<CoreEmotion, number[][]>> {
  if (!anchorVectorsPromise) {
    anchorVectorsPromise = (async () => {
      const ext = await getExtractor();
      const vectors = {} as Record<CoreEmotion, number[][]>;
      for (const emotion of CORE_EMOTION_LIST) {
        vectors[emotion] = [];
        for (const anchor of SEMANTIC_ANCHORS[emotion]) {
          const out = await ext(anchor, { pooling: 'mean', normalize: true });
          vectors[emotion].push(Array.from(out.data as Float32Array));
        }
      }
      return vectors;
    })();
  }
  return anchorVectorsPromise;
}

export function warmUpSemanticAnalyzer(): void {
  Promise.all([getAnchorVectors(), getSentimentClassifier()]).catch((err) => {
    console.warn('Semantic model warmup skipped:', err?.message || err);
  });
}

function splitClauses(text: string): string[] {
  const parts = text
    .split(/(?<=[.!?])\s+|\n+|\s+(?:but|however|yet|although|though)\s+/i)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);
  return parts.length > 0 ? parts : [text.trim()];
}

function scoreEmbeddingAgainstAnchors(
  vec: number[],
  anchorVectors: Record<CoreEmotion, number[][]>
): Record<CoreEmotion, number> {
  const scores = {} as Record<CoreEmotion, number>;
  for (const emotion of CORE_EMOTION_LIST) {
    const sims = anchorVectors[emotion]
      .map((av) => dotProduct(vec, av))
      .sort((a, b) => b - a);
    scores[emotion] = 0.72 * sims[0] + 0.28 * (sims[1] ?? sims[0]);
  }
  return scores;
}

/**
 * Evaluates a single sentence/clause with BOTH:
 * 1) DistilBERT SST-2 Cross-Encoder (accurately catches negation & negative valence even with typos)
 * 2) MiniLM-L6-v2 Neural Semantic Embeddings across all 8 emotion anchors
 */
async function analyzeClause(
  clause: string,
  ext: FeatureExtractionPipeline,
  sentimentFn: SentimentPipelineFn,
  anchorVectors: Record<CoreEmotion, number[][]>
): Promise<Record<CoreEmotion, number>> {
  const [embOut, sentOut] = await Promise.all([
    ext(clause, { pooling: 'mean', normalize: true }),
    sentimentFn(clause),
  ]);

  const raw = scoreEmbeddingAgainstAnchors(
    Array.from(embOut.data as Float32Array),
    anchorVectors
  );

  const sent = sentOut?.[0];
  const isNegative = sent?.label === 'NEGATIVE' && sent.score >= 0.72;
  const isPositive = sent?.label === 'POSITIVE' && sent.score >= 0.78;
  const polarityStrength = sent?.score ?? 0.5;

  if (isNegative) {
    // Polarity Gate: Cross-encoder confirmed NEGATIVE sentiment (e.g., "im never happy anymore").
    // If topic embeddings matched Joy/Calm because of negated happy words ("happy", "best", "exciting"),
    // transfer that negated positive energy into Sadness and suppress Joy & Calm!
    const negatedPositiveEnergy = Math.max(0, raw.Joy - 0.18) * 0.85 + Math.max(0, raw.Calm - 0.22) * 0.4;
    raw.Sadness = raw.Sadness + negatedPositiveEnergy * polarityStrength + 0.08 * polarityStrength;

    // Suppress positive emotions in a strongly negative clause
    raw.Joy *= 0.12;
    raw.Calm *= 0.25;
    raw.Motivation *= 0.45;
  } else if (isPositive) {
    // Cross-encoder confirmed POSITIVE sentiment: dampen negative emotions unless strongly evident
    raw.Sadness *= 0.25;
    raw.Anger *= 0.25;
    raw.Anxiety *= 0.35;
    raw.Stress *= 0.35;
    raw.Joy += 0.06 * polarityStrength;
  }

  return raw;
}

export async function analyzeWithSemanticModel(text: string): Promise<EmotionAnalysis> {
  const [ext, sentimentFn, anchorVectors] = await Promise.all([
    getExtractor(),
    getSentimentClassifier(),
    getAnchorVectors(),
  ]);

  const trimmed = text.trim();
  const clauses = splitClauses(trimmed).slice(0, 8);

  const combinedRaw: Record<CoreEmotion, number> = {
    Joy: 0,
    Calm: 0,
    Motivation: 0,
    Confusion: 0,
    Anxiety: 0,
    Stress: 0,
    Sadness: 0,
    Anger: 0,
  };

  if (clauses.length === 1) {
    const res = await analyzeClause(clauses[0], ext, sentimentFn, anchorVectors);
    Object.assign(combinedRaw, res);
  } else {
    // Analyze whole entry AND individual clauses (catches mixed/contrastive emotions cleanly)
    const fullPromise = analyzeClause(trimmed, ext, sentimentFn, anchorVectors);
    const clausePromises = clauses.map((c) => analyzeClause(c, ext, sentimentFn, anchorVectors));
    const [fullRes, ...clauseResults] = await Promise.all([fullPromise, ...clausePromises]);

    for (const em of CORE_EMOTION_LIST) {
      const avgClause =
        clauseResults.reduce((sum, cr) => sum + cr[em], 0) / clauseResults.length;
      const peakClause = Math.max(...clauseResults.map((cr) => cr[em]));
      combinedRaw[em] = 0.45 * fullRes[em] + 0.3 * avgClause + 0.25 * peakClause;
    }
  }

  const sortedRaw = [...CORE_EMOTION_LIST]
    .map((em) => [em, combinedRaw[em]] as [CoreEmotion, number])
    .sort((a, b) => b[1] - a[1]);

  const maxScore = sortedRaw[0][1];
  const marginFloor = Math.max(0.24, maxScore * 0.72);

  const activated = sortedRaw
    .map(([em, score]) => {
      const excess = Math.max(0, score - marginFloor);
      return [em, excess > 0 ? Math.pow(excess, 1.35) : 0] as [CoreEmotion, number];
    })
    .filter(([, weight]) => weight > 0.002)
    .slice(0, 4);

  const rawScoresMap: Record<string, number> = {};
  for (const [em, s] of sortedRaw) {
    rawScoresMap[em.toLowerCase()] = Number(Math.max(0, s).toFixed(3));
  }

  if (activated.length === 0) {
    const primary = sortedRaw[0][0];
    return {
      primary_emotion: primary,
      secondary_emotions: [],
      distribution: { [primary]: 100.0 },
      raw_scores: rawScoresMap,
      model_source: 'EmoStar Neural Semantic Engine (SST-2 + MiniLM-L6-v2)',
      weightage_method: 'max_balanced',
      emotional_triggers:
        'Negation-aware sentiment and semantic sentence analysis.',
      mindful_insight: INSIGHTS[primary],
    };
  }

  const totalWeight = activated.reduce((sum, [, w]) => sum + w, 0) || 1;
  const distribution: Record<string, number> = {};
  for (const [em, w] of activated) {
    distribution[em] = Math.round((w / totalWeight) * 1000) / 10;
  }

  const sumPct = Object.values(distribution).reduce((a, b) => a + b, 0);
  const diff = Math.round((100.0 - sumPct) * 10) / 10;
  if (diff !== 0) {
    const topKey = activated[0][0];
    distribution[topKey] = Math.round((distribution[topKey] + diff) * 10) / 10;
  }

  const primary_emotion = activated[0][0];
  const secondary_emotions = activated.slice(1).map(([em]) => em);

  const formattedSecondary =
    secondary_emotions.length === 1
      ? secondary_emotions[0]
      : secondary_emotions.length > 1
      ? `${secondary_emotions.slice(0, -1).join(', ')}, and ${
          secondary_emotions[secondary_emotions.length - 1]
        }`
      : '';

  const secondarySummary = formattedSecondary
    ? ` with undertones of ${formattedSecondary}`
    : '';

  return {
    primary_emotion,
    secondary_emotions,
    distribution,
    raw_scores: rawScoresMap,
    model_source: 'EmoStar Neural Semantic Engine (SST-2 + MiniLM-L6-v2)',
    weightage_method: 'max_balanced',
    emotional_triggers: `Semantic context reflects primarily ${primary_emotion.toLowerCase()}${secondarySummary}.`,
    mindful_insight: INSIGHTS[primary_emotion],
  };
}
