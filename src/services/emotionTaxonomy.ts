export type CoreEmotion =
  | 'Joy'
  | 'Calm'
  | 'Sadness'
  | 'Anxiety'
  | 'Anger'
  | 'Confusion'
  | 'Motivation'
  | 'Stress';

export interface EmotionMetaItem {
  id: CoreEmotion;
  label: CoreEmotion;
  color: string;
  gradientTo: string;
  bgLight: string;
  border: string;
  emoji: string;
  description: string;
  subFeelings: string[];
}

export const CORE_EMOTIONS: Record<CoreEmotion, EmotionMetaItem> = {
  Joy: {
    id: 'Joy',
    label: 'Joy',
    color: '#eab308',
    gradientTo: '#f59e0b',
    bgLight: '#fefce8',
    border: '#fde047',
    emoji: '☀️',
    description: 'Happiness, gratitude, excitement, pride, love, and heartfelt celebration.',
    subFeelings: ['Happiness', 'Gratitude', 'Excitement', 'Love', 'Pride'],
  },
  Calm: {
    id: 'Calm',
    label: 'Calm',
    color: '#06b6d4',
    gradientTo: '#0891b2',
    bgLight: '#ecfeff',
    border: '#a5f3fc',
    emoji: '🌿',
    description: 'Inner tranquility, relief, empathy, gentle warmth, and steady grounding.',
    subFeelings: ['Serenity', 'Relief', 'Caring', 'Contentment', 'Peace'],
  },
  Sadness: {
    id: 'Sadness',
    label: 'Sadness',
    color: '#3b82f6',
    gradientTo: '#2563eb',
    bgLight: '#eff6ff',
    border: '#bfdbfe',
    emoji: '💧',
    description: 'Sorrow, disappointment, grief, remorse, or quiet emotional heaviness.',
    subFeelings: ['Sorrow', 'Disappointment', 'Grief', 'Remorse', 'Loneliness'],
  },
  Anxiety: {
    id: 'Anxiety',
    label: 'Anxiety',
    color: '#8b5cf6',
    gradientTo: '#7c3aed',
    bgLight: '#f5f3ff',
    border: '#ddd6fe',
    emoji: '⚡',
    description: 'Nervous tension, worry, apprehension, fear, or self-consciousness.',
    subFeelings: ['Worry', 'Nervousness', 'Fear', 'Unease', 'Awkwardness'],
  },
  Anger: {
    id: 'Anger',
    label: 'Anger',
    color: '#ef4444',
    gradientTo: '#dc2626',
    bgLight: '#fef2f2',
    border: '#fecaca',
    emoji: '🔥',
    description: 'Frustration, irritation, disapproval, disgust, or fierce boundary defense.',
    subFeelings: ['Frustration', 'Irritation', 'Annoyance', 'Outrage', 'Aversion'],
  },
  Confusion: {
    id: 'Confusion',
    label: 'Confusion',
    color: '#f97316',
    gradientTo: '#ea580c',
    bgLight: '#fff7ed',
    border: '#fed7aa',
    emoji: '🌀',
    description: 'Perplexity, sudden realization, curiosity, surprise, or mixed signals.',
    subFeelings: ['Uncertainty', 'Curiosity', 'Surprise', 'Realization', 'Doubt'],
  },
  Motivation: {
    id: 'Motivation',
    label: 'Motivation',
    color: '#10b981',
    gradientTo: '#059669',
    bgLight: '#ecfdf5',
    border: '#a7f3d0',
    emoji: '🚀',
    description: 'Drive, optimism, purposeful focus, determination, and forward momentum.',
    subFeelings: ['Drive', 'Hope', 'Optimism', 'Ambition', 'Focus'],
  },
  Stress: {
    id: 'Stress',
    label: 'Stress',
    color: '#d946ef',
    gradientTo: '#c026d3',
    bgLight: '#fdf4ff',
    border: '#f5d0fe',
    emoji: '⏳',
    description: 'High cognitive load, tight deadlines, pressure, burnout, or feeling overwhelmed.',
    subFeelings: ['Overwhelm', 'Pressure', 'Exhaustion', 'Urgency', 'Burnout'],
  },
};

export const CORE_EMOTION_LIST: CoreEmotion[] = [
  'Joy',
  'Calm',
  'Motivation',
  'Confusion',
  'Anxiety',
  'Stress',
  'Sadness',
  'Anger',
];

const SYNONYM_TO_CORE: Record<string, CoreEmotion> = {
  joy: 'Joy',
  excitement: 'Joy',
  amusement: 'Joy',
  love: 'Joy',
  gratitude: 'Joy',
  admiration: 'Joy',
  pride: 'Joy',
  approval: 'Joy',
  happiness: 'Joy',

  calm: 'Calm',
  relief: 'Calm',
  caring: 'Calm',
  contentment: 'Calm',
  neutral: 'Calm',
  peace: 'Calm',

  sadness: 'Sadness',
  grief: 'Sadness',
  disappointment: 'Sadness',
  remorse: 'Sadness',
  sorrow: 'Sadness',

  anxiety: 'Anxiety',
  nervousness: 'Anxiety',
  fear: 'Anxiety',
  embarrassment: 'Anxiety',
  worry: 'Anxiety',

  anger: 'Anger',
  annoyance: 'Anger',
  frustration: 'Anger',
  disgust: 'Anger',
  disapproval: 'Anger',

  confusion: 'Confusion',
  realization: 'Confusion',
  curiosity: 'Confusion',
  surprise: 'Confusion',

  motivation: 'Motivation',
  desire: 'Motivation',
  optimism: 'Motivation',
  hope: 'Motivation',

  stress: 'Stress',
  overwhelm: 'Stress',
};

export function normalizeToCoreEmotion(emotion: string): CoreEmotion {
  if (!emotion) return 'Calm';
  const key = emotion.trim().toLowerCase();
  return SYNONYM_TO_CORE[key] || 'Calm';
}

export function getEmotionMeta(emotion: string): EmotionMetaItem {
  const core = normalizeToCoreEmotion(emotion);
  return CORE_EMOTIONS[core];
}

export const EMOTION_META = CORE_EMOTIONS;
export const RICH_EMOTIONS = CORE_EMOTIONS;
