import React, { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  TrendingUp,
  Sparkles,
  Cpu,
  ChevronDown,
  ChevronUp,
  Wind,
  Lightbulb,
} from 'lucide-react';
import { EmotionAnalysis, PageRoute, JournalEntry } from '../types/journal';
import { getEmotionMeta } from '../services/emotionTaxonomy';
import { MACRO_8_MAP, normalizeAnalysisTo8Emotions } from '../services/robertaService';
import { EmotionPieChart } from '../components/EmotionPieChart';

interface AnalysisPageProps {
  analysis: EmotionAnalysis;
  entry?: JournalEntry | null;
  onNavigate: (page: PageRoute) => void;
  onBack: () => void;
}

export const AnalysisPage: React.FC<AnalysisPageProps> = ({
  analysis: initialAnalysis,
  entry,
  onNavigate,
  onBack,
}) => {
  const [showRawInspector, setShowRawInspector] = useState(false);

  const activeAnalysis = normalizeAnalysisTo8Emotions(initialAnalysis);
  const rawScores = activeAnalysis?.raw_scores || {};
  const hasRawScores = Object.keys(rawScores).length > 0;

  const primaryEmotion = activeAnalysis?.primary_emotion || 'Calm';
  const secondaryEmotions = activeAnalysis?.secondary_emotions || [];
  const distribution = activeAnalysis?.distribution || {};
  const mindfulInsight = activeAnalysis?.mindful_insight;
  const triggers = activeAnalysis?.emotional_triggers;

  const primaryMeta = getEmotionMeta(primaryEmotion);

  const isStressfulOrAnxious =
    ['Stress', 'Anxiety', 'Anger', 'Sadness'].includes(primaryEmotion) ||
    secondaryEmotions.some((e) => ['Stress', 'Anxiety'].includes(e));

  const sortedRawScores = Object.entries(rawScores).sort((a, b) => b[1] - a[1]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-6 animate-in fade-in duration-300">
      {/* Top Navigation Banner */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-pink-100 text-pink-800 border border-pink-200">
          <Sparkles size={13} />
          <span>{activeAnalysis.model_source || 'EmoStar 8-Emotion Model'}</span>
        </span>
      </div>

      {/* Main Analysis Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200/80 p-6 sm:p-10 space-y-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 font-serif">
            Your emotional breakdown
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Synthesized across EmoStar's 8 core emotional dimensions.
          </p>
        </div>

        {/* Primary Emotion Section */}
        <div
          className="p-6 rounded-2xl border transition-all"
          style={{ backgroundColor: primaryMeta.bgLight, borderColor: primaryMeta.border }}
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold uppercase tracking-wider text-gray-600 flex items-center gap-2">
              <Sparkles size={16} style={{ color: primaryMeta.color }} />
              <span>Primary emotion</span>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/80 border border-gray-200/70 text-gray-700">
              {distribution[primaryEmotion] ? `${distribution[primaryEmotion]}%` : 'Dominant'}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-baseline gap-4">
            <span
              className="text-4xl sm:text-5xl font-extrabold tracking-tight"
              style={{ color: primaryMeta.color }}
            >
              {primaryMeta.label}
            </span>
            <span className="text-3xl">{primaryMeta.emoji}</span>
          </div>

          <p className="mt-2 text-sm text-gray-600 font-normal">
            {primaryMeta.description}
          </p>
        </div>

        {/* Dynamic Pie Chart / Emotion Wheel Breakdown */}
        {Object.keys(distribution).length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <EmotionPieChart
              distribution={distribution}
              primaryEmotion={primaryEmotion}
              title="Dynamic Emotion Breakdown"
            />
          </div>
        )}

        {/* Secondary Emotions Section */}
        <div className="space-y-3 pt-2 border-t border-gray-100">
          <h3 className="text-base font-bold text-gray-800">
            Secondary emotions
          </h3>

          {secondaryEmotions.length === 0 ? (
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-gray-500 text-base">
              None detected
            </div>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {secondaryEmotions.map((emotion) => {
                const meta = getEmotionMeta(emotion);

                return (
                  <span
                    key={emotion}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-base font-medium border shadow-2xs"
                    style={{
                      backgroundColor: meta.bgLight,
                      borderColor: meta.border,
                      color: meta.color,
                    }}
                  >
                    <span>{meta.emoji}</span>
                    <span>{meta.label}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Mindful Insight & Triggers Card */}
        {(mindfulInsight || triggers) && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-50 via-pink-50/50 to-indigo-50/40 border border-purple-100 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
              <Lightbulb size={20} />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900">
                Mindful Perspective
              </h4>
              {mindfulInsight && (
                <p className="text-sm text-purple-900/90 leading-relaxed font-serif">
                  "{mindfulInsight}"
                </p>
              )}
              {triggers && (
                <p className="text-xs text-purple-700/80 pt-1">
                  <span className="font-semibold">Key context:</span> {triggers}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Stress / Anxiety Meditation Suggestion Card */}
        {isStressfulOrAnxious && (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Wind size={22} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-emerald-950">
                  Take a Mindful Breath Break
                </h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Elevated stress or anxiety detected. A brief 4-7-8 breathing session can calm your nervous system.
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('meditation')}
              className="whitespace-nowrap px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold rounded-xl text-xs shadow-xs transition-all"
            >
              Start 4-7-8 Meditation
            </button>
          </div>
        )}

        {/* Expandable Raw Model Output Inspector */}
        {hasRawScores && (
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <button
              type="button"
              onClick={() => setShowRawInspector(!showRawInspector)}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 transition-colors text-slate-800 font-semibold text-xs"
            >
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-purple-600" />
                <span>Underlying Signal Mapping ({sortedRawScores.length} signals &rarr; 8 Emotions)</span>
              </div>
              {showRawInspector ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showRawInspector && (
              <div className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs space-y-3 font-mono shadow-inner animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                  <span>Signal</span>
                  <span>Grouped Emotion &bull; Weight</span>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-800/60">
                  {sortedRawScores.map(([label, score]) => {
                    const groupedName = MACRO_8_MAP[label] || 'Calm';
                    const meta = getEmotionMeta(groupedName);
                    const isHigh = score >= 0.1;

                    return (
                      <div key={label} className="flex items-center justify-between pt-1.5">
                        <div className="flex items-center gap-2">
                          <span className={isHigh ? 'text-pink-300 font-bold' : 'text-slate-300'}>
                            {label}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-slate-800 text-slate-400 font-sans">
                            &rarr; {meta.emoji} {groupedName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-pink-500"
                              style={{ width: `${Math.min(100, score * 100)}%` }}
                            />
                          </div>
                          <span className={`w-12 text-right ${isHigh ? 'text-pink-400 font-bold' : 'text-slate-400'}`}>
                            {(score * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Original Journal Excerpt */}
        {entry?.text && (
          <div className="space-y-2 pt-4 border-t border-gray-100">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Analyzed Reflection
            </div>
            <div className="p-4 rounded-xl bg-gray-50 text-gray-700 text-sm leading-relaxed border border-gray-200/70 italic whitespace-pre-wrap">
              "{entry.text}"
            </div>
          </div>
        )}

        {/* Navigation Action Buttons */}
        <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row gap-3 justify-end">
          <button
            onClick={() => onNavigate('journal')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors"
          >
            <BookOpen size={18} />
            <span>Write Another Journal</span>
          </button>

          <button
            onClick={() => onNavigate('history')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-pink-600 hover:bg-pink-700 text-white shadow-md transition-colors"
          >
            <TrendingUp size={18} />
            <span>View All in History</span>
          </button>
        </div>
      </div>
    </div>
  );
};
