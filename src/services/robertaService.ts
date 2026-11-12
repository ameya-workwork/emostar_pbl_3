import { EmotionAnalysis } from '../types/journal';
import { CoreEmotion, normalizeToCoreEmotion } from './emotionTaxonomy';

export const ALL_GO_EMOTIONS = [
  'admiration',
  'amusement',
  'anger',
  'annoyance',
  'approval',
  'caring',
  'confusion',
  'curiosity',
  'desire',
  'disappointment',
  'disapproval',
  'disgust',
  'embarrassment',
  'excitement',
  'fear',
  'gratitude',
  'grief',
  'joy',
  'love',
  'nervousness',
  'optimism',
  'pride',
  'realization',
  'relief',
  'remorse',
  'sadness',
  'surprise',
  'neutral',
];

export const MACRO_8_MAP: Record<string, CoreEmotion> = {
  joy: 'Joy',
  excitement: 'Joy',
  amusement: 'Joy',
  love: 'Joy',
  gratitude: 'Joy',
  admiration: 'Joy',
  pride: 'Joy',
  approval: 'Joy',

  calm: 'Calm',
  relief: 'Calm',
  caring: 'Calm',
  neutral: 'Calm',

  sadness: 'Sadness',
  grief: 'Sadness',
  disappointment: 'Sadness',
  remorse: 'Sadness',

  anxiety: 'Anxiety',
  nervousness: 'Anxiety',
  fear: 'Anxiety',
  embarrassment: 'Anxiety',

  anger: 'Anger',
  annoyance: 'Anger',
  disgust: 'Anger',
  disapproval: 'Anger',

  confusion: 'Confusion',
  realization: 'Confusion',
  curiosity: 'Confusion',
  surprise: 'Confusion',

  motivation: 'Motivation',
  desire: 'Motivation',
  optimism: 'Motivation',

  stress: 'Stress',
};

/**
 * Ensures any EmotionAnalysis object conforms strictly to the 8 grouped emotions
 * and sums cleanly to 100%.
 */
export function normalizeAnalysisTo8Emotions(analysis: EmotionAnalysis): EmotionAnalysis {
  const groupedDist: Record<string, number> = {};

  for (const [emotion, pct] of Object.entries(analysis.distribution || {})) {
    const core = normalizeToCoreEmotion(emotion);
    groupedDist[core] = Math.round(((groupedDist[core] || 0) + Number(pct)) * 10) / 10;
  }

  const entries = Object.entries(groupedDist)
    .filter(([, val]) => val > 0)
    .sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    const fallbackPrimary = normalizeToCoreEmotion(analysis.primary_emotion);
    return {
      ...analysis,
      primary_emotion: fallbackPrimary,
      secondary_emotions: [],
      distribution: { [fallbackPrimary]: 100.0 },
    };
  }

  const total = entries.reduce((sum, [, val]) => sum + val, 0);
  const normalizedDist: Record<string, number> = {};
  for (const [k, v] of entries) {
    normalizedDist[k] = Math.round((v / total) * 1000) / 10;
  }

  const currentSum = Object.values(normalizedDist).reduce((a, b) => a + b, 0);
  const diff = Math.round((100.0 - currentSum) * 10) / 10;
  if (diff !== 0) {
    const topKey = entries[0][0];
    normalizedDist[topKey] = Math.round((normalizedDist[topKey] + diff) * 10) / 10;
  }

  const primary_emotion = entries[0][0];
  const secondary_emotions = entries.slice(1, 4).map(([k]) => k);

  return {
    ...analysis,
    primary_emotion,
    secondary_emotions,
    distribution: normalizedDist,
  };
}

/**
 * Primary Emotion Analysis Dispatcher (Grouped 8 Emotions):
 * 1. Attempts server-side Gemini 4 Semantic Engine for true contextual/subtext analysis.
 * 2. Falls back to negation-aware & phrase-aware local cognitive engine if server is unreachable.
 */
export async function analyzeJournalEmotion(text: string): Promise<EmotionAnalysis> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.primary_emotion && data.distribution) {
        return normalizeAnalysisTo8Emotions(data);
      }
    }
  } catch {
    // Graceful fallback to local cognitive engine
  }

  const rawScores = simulateRobertaGoEmotions(text);
  return aggregateRobertaScores(rawScores, text);
}

/**
 * Checks whether a regex match at `matchIndex` is negated within the preceding ~25 characters
 * (e.g., "not happy", "mood is not the best", "don't feel good", "hardly relaxed").
 */
function isPrecededByNegation(text: string, matchIndex: number): boolean {
  const windowStart = Math.max(0, matchIndex - 28);
  const preceding = text.slice(windowStart, matchIndex);
  return /\b(not|n't|never|no|hardly|barely|neither|without|lack(ing)?|less)\b/i.test(preceding);
}

/**
 * Semantic & Negation-Aware GoEmotions Fallback Scorer
 */
export function simulateRobertaGoEmotions(text: string): Record<string, number> {
  const scores: Record<string, number> = {};
  const lower = text.toLowerCase();

  for (const label of ALL_GO_EMOTIONS) {
    scores[label] = 0.005;
  }

  // 1. Contextual & understated phrases (negation, euphemisms, indirect emotional states)
  const semanticPhrases: Array<{ pattern: RegExp; boosts: Record<string, number> }> = [
    // Subtle / understated sadness & low mood
    {
      pattern: /\b(a little off|bit off|feel(ing)? off|mood is off|out of sorts|not myself|not really myself|don't feel like myself)\b/,
      boosts: { sadness: 0.78, disappointment: 0.42, confusion: 0.2 },
    },
    {
      pattern: /\b(mood is not the best|not (feeling )?(the )?best|could be better|not (doing |feeling )?(so |very |that )?(great|good|well|okay|ok|fine|right))\b/,
      boosts: { sadness: 0.75, disappointment: 0.5 },
    },
    {
      pattern: /\b((not|never) (feel(ing)? )?(happy|glad|excited|good|okay|ok)|don't feel happy|hard to (feel |be )?(happy|positive|smile)|can't (seem to )?(smile|feel happy))\b/,
      boosts: { sadness: 0.85, disappointment: 0.45 },
    },
    {
      pattern: /\b(feeling (a bit |kinda |kind of )?(low|down|blue|meh|blah|flat|empty|numb|hollow|heavy)|in a funk|down in the dumps|heavy heart|low spirits)\b/,
      boosts: { sadness: 0.85, grief: 0.25 },
    },
    {
      pattern: /\b(rough day|hard day|tough day|bad day|not my day|drained|emotionally drained|mentally drained|weighed down)\b/,
      boosts: { sadness: 0.68, disappointment: 0.4, nervousness: 0.25 },
    },
    // Subtle anxiety & restlessness
    {
      pattern: /\b(on edge|mind won't stop|racing thoughts|overthinking|pit in my stomach|can't relax|cannot relax|restless|uneasy|worried about)\b/,
      boosts: { nervousness: 0.8, fear: 0.35 },
    },
    // Subtle anger / frustration
    {
      pattern: /\b(fed up|had enough|sick of|getting on my nerves|ticks me off|drives me crazy|so unfair|losing patience)\b/,
      boosts: { annoyance: 0.78, anger: 0.55 },
    },
    // Subtle confusion / mixed feelings
    {
      pattern: /\b(mixed feelings|torn between|don't know what to (do|feel|think)|can't figure out|hard to tell|not sure how i feel|caught off guard)\b/,
      boosts: { confusion: 0.8, realization: 0.3 },
    },
    // Subtle motivation / resolve
    {
      pattern: /\b(ready to tackle|moving forward|step by step|making progress|looking ahead|committed to|pushing through|keep going)\b/,
      boosts: { optimism: 0.75, desire: 0.6 },
    },
  ];

  for (const item of semanticPhrases) {
    if (item.pattern.test(lower)) {
      for (const [label, weight] of Object.entries(item.boosts)) {
        scores[label] = (scores[label] || 0) + weight;
      }
    }
  }

  // 2. Direct lexical cues (positive rules skip matches preceded by negation!)
  const positiveLabels = new Set([
    'gratitude',
    'joy',
    'love',
    'excitement',
    'pride',
    'amusement',
    'admiration',
    'optimism',
    'desire',
    'relief',
    'caring',
  ]);

  const rules: Record<string, RegExp[]> = {
    gratitude: [
      /\b(grateful|thank(s|ful|ing)?|appreciat(e|ion|ive)|blessed|indebted|fortunate)\b/g,
      /\bthank you\b/g,
      /\bso glad for\b/g,
    ],
    joy: [
      /\b(happy|joy|glad|delighted|pleased|cheerful|ecstatic|blissful|radiant|amazing|wonderful|perfect)\b/g,
      /\bhad a great day\b/g,
      /\bfelt so good\b/g,
      /\bmade me smile\b/g,
    ],
    love: [
      /\b(love|loving|adore|sweetheart|affection|partner|cherish|tender)\b/g,
    ],
    excitement: [
      /\b(excited|thrilled|hyped|pumped|can't wait|stoked|electrifying)\b/g,
      /\blooking forward to\b/g,
    ],
    pride: [
      /\b(proud|pride|accomplish(ed|ment)|achiev(ed|ement)|nailed it|conquered|victory)\b/g,
    ],
    amusement: [
      /\b(funny|laugh(ed|ing)?|hilarious|cracked me up|joke|humor|silly)\b/g,
      /\blol|haha\b/g,
    ],
    admiration: [
      /\b(admire|amazed|incredible|spectacular|awe|inspiring|brilliant)\b/g,
    ],
    optimism: [
      /\b(hopeful|optimistic|bright future|things will get better|positive outlook|determined)\b/g,
    ],
    desire: [
      /\b(desire|ambition|motivated|motivation|driven|craving|aspire|goal|focus|focused)\b/g,
    ],
    relief: [
      /\b(relieved|relief|calm|peace|peaceful|relaxed|finally over|phew|off my chest|weight lifted|safe now)\b/g,
    ],
    caring: [
      /\b(caring|kindness|nurture|empathy|compassion|hugged|comforted|gentle)\b/g,
    ],
    nervousness: [
      /\b(nervous|anxious|anxiety|worried|worry|butterflies|jittery|uneasy)\b/g,
      /\bwhat if\b/g,
    ],
    fear: [
      /\b(fear|scared|terrified|horror|panic|dread|frightened|paralyzed)\b/g,
    ],
    annoyance: [
      /\b(annoyed|annoying|irritated|frustrated|frustrating|bothered|pissed|driving me crazy)\b/g,
    ],
    anger: [
      /\b(angry|furious|rage|mad|hateful|infuriated|exploded|fuming)\b/g,
    ],
    sadness: [
      /\b(sad|sadness|unhappy|depressed|heartbroken|tears|crying|lonely|melancholy|gloomy|miserable)\b/g,
    ],
    disappointment: [
      /\b(disappointed|disappointment|letdown|failed|dashed hopes|fell short|underwhelmed)\b/g,
    ],
    grief: [
      /\b(grief|mourning|passed away|loss|miss them so much|bereavement)\b/g,
    ],
    remorse: [
      /\b(regret|guilt|guilty|remorse|my fault|apologize|should not have done)\b/g,
    ],
    embarrassment: [
      /\b(embarrassed|awkward|cringe|humiliated|shame|blushed)\b/g,
    ],
    curiosity: [
      /\b(curious|wondering|intrigued|fascinated|interested to know)\b/g,
    ],
    realization: [
      /\b(realized|realization|epiphany|it struck me|now I understand)\b/g,
    ],
    confusion: [
      /\b(confused|confusion|puzzled|baffled|perplexed|lost|don't get it|uncertain)\b/g,
    ],
    surprise: [
      /\b(surprised|shocked|unexpected|astonished|out of nowhere)\b/g,
    ],
    disgust: [
      /\b(disgusting|gross|nasty|repulsed|sickening|toxic)\b/g,
    ],
  };

  for (const [label, patterns] of Object.entries(rules)) {
    for (const pattern of patterns) {
      const regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
      let match: RegExpExecArray | null;
      while ((match = regex.exec(lower)) !== null) {
        if (positiveLabels.has(label) && isPrecededByNegation(lower, match.index)) {
          // Negated positive statement points toward Sadness / Disappointment instead of Joy/Calm
          scores['disappointment'] = (scores['disappointment'] || 0) + 0.45;
          scores['sadness'] = (scores['sadness'] || 0) + 0.4;
          continue;
        }
        scores[label] = (scores[label] || 0) + 0.65;
      }
    }
  }

  const isStressed = /\b(stress(ed|ful)?|overwhelm(ed)?|burnout|burnt out|too much (to do|on my plate)|deadline(s)?|swamped|exhausted|hectic|pressure|frazzled|running on empty|can't catch a break)\b/i.test(lower);
  if (isStressed) {
    scores['nervousness'] = Math.max(scores['nervousness'] || 0, 0.55);
    scores['annoyance'] = Math.max(scores['annoyance'] || 0, 0.35);
  }

  return scores;
}

/**
 * Balanced aggregation strictly into the 8 grouped emotions:
 * Joy, Calm, Sadness, Anxiety, Anger, Confusion, Motivation, Stress
 */
export function aggregateRobertaScores(
  rawScores: Record<string, number>,
  originalText = ''
): EmotionAnalysis {
  const emotionScores: Record<string, number> = {};
  const lower = originalText.toLowerCase();
  const isStressful = /\b(stress(ed|ful)?|overwhelm(ed)?|burnout|burnt out|deadline(s)?|hectic|pressure|swamped|exhausted|too much on my plate|running on empty)\b/i.test(lower);

  // Peak pooling per grouped category prevents 8 Joy labels from overpowering smaller buckets
  for (const [label, score] of Object.entries(rawScores)) {
    const category = MACRO_8_MAP[label];
    if (!category) continue;
    if (!emotionScores[category] || score > emotionScores[category]) {
      emotionScores[category] = score;
    }
  }

  if (isStressful) {
    emotionScores['Stress'] = Math.max(emotionScores['Stress'] || 0, 0.85);
  } else if ((rawScores['nervousness'] || 0) > 0.3 && (rawScores['annoyance'] || 0) > 0.2) {
    emotionScores['Stress'] = Math.max(
      emotionScores['Stress'] || 0,
      ((rawScores['nervousness'] || 0) + (rawScores['annoyance'] || 0)) * 0.65
    );
  }

  const filteredScores: Record<string, number> = {};
  for (const [category, score] of Object.entries(emotionScores)) {
    if (score >= 0.05) {
      filteredScores[category] = score;
    }
  }

  if (Object.keys(filteredScores).length === 0) {
    return {
      primary_emotion: 'Calm',
      secondary_emotions: [],
      distribution: { Calm: 100.0 },
      raw_scores: rawScores,
      model_source: 'EmoStar 8-Emotion Engine',
      weightage_method: 'max_balanced',
      emotional_triggers: 'Quiet baseline and peaceful reflection.',
      mindful_insight: 'Your words express an equilibrium of mind. A gentle space to pause and be present.',
    };
  }

  const sorted = Object.entries(filteredScores).sort((a, b) => b[1] - a[1]);
  const primary_emotion = sorted[0][0];
  const strongest_score = sorted[0][1];

  const meaningful = sorted.filter(([, s]) => s >= strongest_score * 0.12).slice(0, 5);
  const total = meaningful.reduce((acc, [, s]) => acc + s, 0);

  const distribution: Record<string, number> = {};
  for (const [emotion, s] of meaningful) {
    distribution[emotion] = Math.round((s / total) * 1000) / 10;
  }

  const currentSum = Object.values(distribution).reduce((a, b) => a + b, 0);
  const diff = Math.round((100.0 - currentSum) * 10) / 10;
  if (diff !== 0) {
    const largestKey = meaningful[0][0];
    distribution[largestKey] = Math.round((distribution[largestKey] + diff) * 10) / 10;
  }

  const secondary_emotions = meaningful
    .map(([emotion]) => emotion)
    .filter((emotion) => emotion !== primary_emotion);

  let mindful_insight = 'Observing your emotions without judgment fosters emotional agility and clarity.';
  if (['Stress', 'Anxiety'].includes(primary_emotion)) {
    mindful_insight = 'You carried significant weight today. Consider a brief 4-7-8 breath session to calm your nervous system.';
  } else if (['Joy', 'Calm'].includes(primary_emotion)) {
    mindful_insight = 'Holding warmth and groundedness strengthens resilience and brightens psychological well-being.';
  } else if (primary_emotion === 'Anger') {
    mindful_insight = 'Frustration often highlights an important boundary or value you care about. Honor the feeling and release the tension.';
  } else if (primary_emotion === 'Sadness') {
    mindful_insight = 'Be gentle with yourself today. Even when your mood feels off or low, giving space to how you feel is an act of self-compassion.';
  } else if (primary_emotion === 'Motivation') {
    mindful_insight = 'Your clarity of purpose is shining through. Channel this energy step by step.';
  }

  return {
    primary_emotion,
    secondary_emotions,
    distribution,
    raw_scores: rawScores,
    model_source: 'EmoStar Semantic Fallback (8-Emotion Engine)',
    weightage_method: 'max_balanced',
    emotional_triggers: 'Emotional tone, phrasing, and underlying sentiment expressed in your reflection.',
    mindful_insight,
  };
}
