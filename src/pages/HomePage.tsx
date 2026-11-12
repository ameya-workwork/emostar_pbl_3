import React, { useMemo } from 'react';
import { BookOpen, TrendingUp, Sparkles, Wind, Clock, ArrowRight, Calendar } from 'lucide-react';
import { JournalEntry, PageRoute } from '../types/journal';
import { getEmotionMeta } from '../services/emotionTaxonomy';
import { buildDailyEmotionMap, getWeekDays, getWeekStart, toLocalDateKey } from '../utils/dateHelpers';
import type { HistoryTab } from './HistoryPage';

interface HomePageProps {
  entries: JournalEntry[];
  onNavigate: (page: PageRoute) => void;
  onOpenHistoryTab?: (tab: HistoryTab) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ entries, onNavigate, onOpenHistoryTab }) => {
  const latestEntry = entries[0];
  const completedEntries = entries.filter((e) => e.analysisStatus === 'complete' && e.analysis);

  // Calculate emotion distribution overview across historical entries
  const emotionCounts: Record<string, number> = {};
  for (const entry of completedEntries) {
    if (entry.analysis?.primary_emotion) {
      const emotion = entry.analysis.primary_emotion;
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    }
  }

  const dominantEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Calm';
  const dominantMeta = getEmotionMeta(dominantEmotion);

  const weekDays = useMemo(() => getWeekDays(getWeekStart(new Date())), []);
  const dailyMap = useMemo(() => buildDailyEmotionMap(entries), [entries]);
  const todayKey = toLocalDateKey(new Date());

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-800 via-purple-700 to-indigo-800 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-xs">
            <Sparkles size={14} className="text-yellow-300" />
            <span>AI Cognitive Emotion Analysis & Mindfulness</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
            How are you feeling today?
          </h2>

          <p className="text-purple-100 text-sm sm:text-base leading-relaxed">
            Pour your uncensored thoughts into your journal. EmoStar analyzes your reflections across 8 core emotional dimensions, offering dynamic emotion breakdowns and mindful breathing exercises.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('journal')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-pink-600 hover:bg-pink-700 active:scale-95 text-white font-semibold rounded-xl shadow-lg transition-all text-sm"
            >
              <BookOpen size={18} />
              <span>Write Today's Entry</span>
            </button>

            <button
              onClick={() => onNavigate('meditation')}
              className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600/90 hover:bg-emerald-600 active:scale-95 text-white font-semibold rounded-xl shadow-md transition-all text-sm"
            >
              <Wind size={18} />
              <span>Meditation Timer</span>
            </button>

            <button
              onClick={() => (onOpenHistoryTab ? onOpenHistoryTab('trends') : onNavigate('history'))}
              className="inline-flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl border border-white/20 transition-all text-sm"
            >
              <TrendingUp size={18} />
              <span>Weekly Trends</span>
            </button>

            <button
              onClick={() => (onOpenHistoryTab ? onOpenHistoryTab('calendar') : onNavigate('history'))}
              className="inline-flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl border border-white/20 transition-all text-sm"
            >
              <Calendar size={18} />
              <span>Calendar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Status Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Entries */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <BookOpen size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-800">{entries.length}</div>
            <div className="text-xs text-gray-500">Journal Reflections</div>
          </div>
        </div>

        {/* Dominant Mood */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-inner"
            style={{ backgroundColor: dominantMeta.bgLight }}
          >
            {dominantMeta.emoji}
          </div>
          <div>
            <div className="text-lg font-bold text-gray-800 flex items-center gap-1.5">
              <span>{dominantEmotion}</span>
            </div>
            <div className="text-xs text-gray-500">Dominant Reflection Mood</div>
          </div>
        </div>

        {/* Mindfulness & Breathing */}
        <div
          onClick={() => onNavigate('meditation')}
          className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 flex items-center gap-4 cursor-pointer hover:border-emerald-300 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
            <Wind size={24} />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-800 group-hover:text-emerald-700 transition-colors">
              Mindful Breathing
            </div>
            <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <span>Start session</span>
              <ArrowRight size={12} />
            </div>
          </div>
        </div>
      </div>

      {/* This Week's Mood Strip + Calendar Quick Access */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-200/80 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp size={16} className="text-purple-600" />
              <span>This Week's Emotional Check-ins</span>
            </h3>
            <p className="text-xs text-gray-400">
              Primary mood marker for each day this week
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => (onOpenHistoryTab ? onOpenHistoryTab('trends') : onNavigate('history'))}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
            >
              Weekly Trends
            </button>
            <button
              type="button"
              onClick={() => (onOpenHistoryTab ? onOpenHistoryTab('calendar') : onNavigate('history'))}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors inline-flex items-center gap-1"
            >
              <Calendar size={12} />
              <span>Monthly Calendar</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((d) => {
            const key = toLocalDateKey(d);
            const summary = dailyMap[key];
            const meta = summary?.primaryEmotion
              ? getEmotionMeta(summary.primaryEmotion)
              : null;
            const isToday = key === todayKey;

            return (
              <button
                key={key}
                type="button"
                onClick={() =>
                  onOpenHistoryTab ? onOpenHistoryTab('calendar') : onNavigate('history')
                }
                className={`p-2 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 ${
                  isToday ? 'ring-2 ring-pink-400' : ''
                }`}
                style={
                  meta
                    ? { backgroundColor: meta.bgLight, borderColor: meta.border }
                    : { backgroundColor: '#f8fafc', borderColor: '#f1f5f9' }
                }
              >
                <span className="text-[10px] font-bold text-gray-500">
                  {d.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span className="text-lg leading-none">
                  {meta ? meta.emoji : '·'}
                </span>
                <span
                  className="text-[10px] font-bold truncate max-w-full"
                  style={{ color: meta ? meta.color : '#94a3b8' }}
                >
                  {meta ? meta.label : d.getDate()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Three Pillars Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Today's Entry Card */}
        <div
          onClick={() => onNavigate('journal')}
          className="group cursor-pointer bg-white rounded-2xl p-6 shadow-xs hover:shadow-md border border-gray-200/80 transition-all hover:border-pink-300 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <BookOpen size={24} />
              </div>
              <span className="text-xs font-semibold text-pink-600 bg-pink-50 px-2.5 py-1 rounded-full">
                Journal
              </span>
            </div>

            <h3 className="text-lg font-bold text-gray-900 group-hover:text-pink-600 transition-colors">
              Today's Reflection
            </h3>
            <p className="text-xs text-gray-600 mt-2 line-clamp-2 leading-relaxed">
              Express your feelings freely. Deep analysis categorizes your primary emotion and triggers.
            </p>
          </div>

          <div className="mt-5 flex items-center text-xs font-semibold text-pink-600 group-hover:translate-x-1 transition-transform">
            <span>Write Now</span>
            <ArrowRight size={14} className="ml-1" />
          </div>
        </div>

        {/* Meditation Card */}
        <div
          onClick={() => onNavigate('meditation')}
          className="group cursor-pointer bg-white rounded-2xl p-6 shadow-xs hover:shadow-md border border-gray-200/80 transition-all hover:border-emerald-300 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Wind size={24} />
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                Mindfulness
              </span>
            </div>

            <h3 className="text-lg font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
              Meditation Timer
            </h3>
            <p className="text-xs text-gray-600 mt-2 line-clamp-2 leading-relaxed">
              Box breathing, 4-7-8 relaxing breath, and Tibetan singing bowl chimes for mental reset.
            </p>
          </div>

          <div className="mt-5 flex items-center text-xs font-semibold text-emerald-600 group-hover:translate-x-1 transition-transform">
            <span>Meditate</span>
            <ArrowRight size={14} className="ml-1" />
          </div>
        </div>

        {/* Historical Data Card */}
        <div
          onClick={() => onNavigate('history')}
          className="group cursor-pointer bg-white rounded-2xl p-6 shadow-xs hover:shadow-md border border-gray-200/80 transition-all hover:border-purple-300 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <TrendingUp size={24} />
              </div>
              <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
                History
              </span>
            </div>

            <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
              Historical Data
            </h3>
            <p className="text-xs text-gray-600 mt-2 line-clamp-2 leading-relaxed">
              Browse previous journals, search reflections by keyword, and filter by emotion spectrum.
            </p>
          </div>

          <div className="mt-5 flex items-center text-xs font-semibold text-purple-600 group-hover:translate-x-1 transition-transform">
            <span>View All</span>
            <ArrowRight size={14} className="ml-1" />
          </div>
        </div>
      </div>

      {/* Latest Entry Preview */}
      {latestEntry && (
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-gray-200/80">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
              <Clock size={15} />
              <span>Most Recent Journal</span>
            </h4>
            {latestEntry.analysis?.primary_emotion && (() => {
              const latestMeta = getEmotionMeta(latestEntry.analysis.primary_emotion);
              return (
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                  style={{
                    backgroundColor: latestMeta.bgLight,
                    color: latestMeta.color,
                  }}
                >
                  {latestMeta.emoji}{' '}
                  {latestMeta.label}
                </span>
              );
            })()}
          </div>

          <p className="text-gray-700 text-sm sm:text-base italic line-clamp-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
            "{latestEntry.text}"
          </p>

          <div className="mt-4 flex justify-between items-center text-xs text-gray-500">
            <span>Logged on {new Date(latestEntry.createdAt).toLocaleDateString()}</span>
            <button
              onClick={() => onNavigate('history')}
              className="text-purple-600 font-semibold hover:underline"
            >
              Open in History &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
