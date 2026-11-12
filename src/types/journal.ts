export interface EmotionAnalysis {
  primary_emotion: string;
  secondary_emotions: string[];
  distribution: Record<string, number>;
  emotional_triggers?: string;
  mindful_insight?: string;
  raw_scores?: Record<string, number>; // Raw 28 GoEmotions scores from RoBERTa
  model_source?: string;
  weightage_method?: 'sum' | 'max_balanced';
}

export interface JournalEntry {
  id: string;
  text: string;
  createdAt: string; // ISO string format matching DateTime.toIso8601String()
  analysisStatus: 'pending' | 'complete' | 'failed';
  analysis?: EmotionAnalysis;
}

export type PageRoute = 'home' | 'journal' | 'history' | 'analysis' | 'meditation';
