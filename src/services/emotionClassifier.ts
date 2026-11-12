import { EmotionAnalysis } from '../types/journal';
import { CORE_EMOTIONS } from './emotionTaxonomy';
import { simulateRobertaGoEmotions, aggregateRobertaScores } from './robertaService';

export const EMOTION_META = CORE_EMOTIONS;

/**
 * Analyzes journal text producing an 8-category emotion breakdown
 */
export function analyzeJournalText(text: string): EmotionAnalysis {
  const rawScores = simulateRobertaGoEmotions(text);
  return aggregateRobertaScores(rawScores, text);
}
