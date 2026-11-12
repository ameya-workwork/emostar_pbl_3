import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Calendar,
  BookOpen,
  Sparkles,
  Minus,
} from 'lucide-react';
import { JournalEntry } from '../types/journal';
import {
  CORE_EMOTION_LIST,
  CoreEmotion,
  getEmotionMeta,
} from '../services/emotionTaxonomy';
import {
  buildDailyEmotionMap,
  getWeekDays,
  getWeekStart,
  toLocalDateKey,
} from '../utils/dateHelpers';

interface WeeklyTrendsProps {
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onWriteEntry?: () => void;
}

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function computeWeekAggregate(
  days: Date[],
  dailyMap: ReturnType<typeof buildDailyEmotionMap>
) {
  const totals: Record<CoreEmotion, number> = {
    Joy: 0,
    Calm: 0,
    Motivation: 0,
    Confusion: 0,
    Anxiety: 0,
    Stress: 0,
    Sadness: 0,
    Anger: 0,
  };

  let entryCount = 0;
  let activeDays = 0;

  for (const d of days) {
    const summary = dailyMap[toLocalDateKey(d)];
    if (summary && summary.entries.length > 0) {
      activeDays++;
      entryCount += summary.entries.length;
      for (const em of CORE_EMOTION_LIST) {
        totals[em] += summary.distribution[em] || 0;
      }
    }
  }

  const totalSum = Object.values(totals).reduce((a, b) => a + b, 0);
  const percentages: Record<CoreEmotion, number> = { ...totals };

  if (totalSum > 0) {
    for (const em of CORE_EMOTION_LIST) {
      percentages[em] = Math.round((totals[em] / totalSum) * 1000) / 10;
    }
  }

  const sorted = [...CORE_EMOTION_LIST]
    .map((em) => ({ emotion: em, pct: percentages[em] }))
    .sort((a, b) => b.pct - a.pct);

  return {
    entryCount,
    activeDays,
    percentages,
    dominant: totalSum > 0 ? sorted[0] : null,
    sorted,
  };
}

export const WeeklyTrends: React.FC<WeeklyTrendsProps> = ({
  entries,
  onSelectEntry,
  onWriteEntry,
}) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDayKey, setSelectedDayKey] = useState<string>(() =>
    toLocalDateKey(new Date())
  );

  const dailyMap = useMemo(() => buildDailyEmotionMap(entries), [entries]);

  const currentWeekStart = useMemo(() => {
    const base = getWeekStart(new Date());
    base.setDate(base.getDate() + weekOffset * 7);
    return base;
  }, [weekOffset]);

  const prevWeekStart = useMemo(() => {
    const prev = new Date(currentWeekStart);
    prev.setDate(prev.getDate() - 7);
    return prev;
  }, [currentWeekStart]);

  const weekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart]);
  const prevWeekDays = useMemo(() => getWeekDays(prevWeekStart), [prevWeekStart]);

  const weekStats = useMemo(
    () => computeWeekAggregate(weekDays, dailyMap),
    [weekDays, dailyMap]
  );
  const prevWeekStats = useMemo(
    () => computeWeekAggregate(prevWeekDays, dailyMap),
    [prevWeekDays, dailyMap]
  );

  const todayKey = toLocalDateKey(new Date());

  // Compute meaningful week-over-week shifts
  const shifts = useMemo(() => {
    if (weekStats.entryCount === 0 || prevWeekStats.entryCount === 0) return [];
    return CORE_EMOTION_LIST.map((em) => {
      const delta = Math.round((weekStats.percentages[em] - prevWeekStats.percentages[em]) * 10) / 10;
      return { emotion: em, delta };
    })
      .filter((s) => Math.abs(s.delta) >= 2)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 3);
  }, [weekStats, prevWeekStats]);

  const rangeLabel = useMemo(() => {
    const first = weekDays[0];
    const last = weekDays[6];
    const sameMonth = first.getMonth() === last.getMonth();
    const firstStr = first.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const lastStr = last.toLocaleDateString('en-US', {
      month: sameMonth ? undefined : 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${firstStr} – ${lastStr}`;
  }, [weekDays]);

  const activeDaySummary = useMemo(() => {
    const inThisWeek = weekDays.some((d) => toLocalDateKey(d) === selectedDayKey);
    const firstActiveDay = weekDays.find(
      (d) => (dailyMap[toLocalDateKey(d)]?.entries.length || 0) > 0
    );
    const effectiveKey = inThisWeek
      ? selectedDayKey
      : toLocalDateKey(firstActiveDay || weekDays[0]);

    return {
      key: effectiveKey,
      date:
        weekDays.find((d) => toLocalDateKey(d) === effectiveKey) || weekDays[0],
      summary: dailyMap[effectiveKey] || null,
    };
  }, [weekDays, selectedDayKey, dailyMap]);

  const entryDelta = weekStats.entryCount - prevWeekStats.entryCount;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Week Navigator */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200/80 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                Weekly Emotional Trends
              </h3>
              <p className="text-xs text-gray-500">{rangeLabel}</p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setWeekOffset((w) => w - 1)}
              className="p-1.5 rounded-lg hover:bg-white text-gray-600 hover:text-gray-900 transition-colors"
              title="Previous week"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                setWeekOffset(0);
                setSelectedDayKey(todayKey);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                weekOffset === 0
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset((w) => w + 1)}
              disabled={weekOffset >= 0}
              className="p-1.5 rounded-lg hover:bg-white text-gray-600 hover:text-gray-900 disabled:opacity-35 disabled:hover:bg-transparent transition-colors"
              title="Next week"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Entries Logged */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-gray-100">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Weekly Check-ins
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-gray-900">
                {weekStats.entryCount}
              </span>
              <span className="text-xs font-medium text-gray-500">
                {weekStats.activeDays}/7 days active
              </span>
            </div>
            {prevWeekStats.entryCount > 0 && (
              <div className="mt-1 text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                {entryDelta > 0 ? (
                  <span className="text-emerald-600">+{entryDelta} vs prior week</span>
                ) : entryDelta < 0 ? (
                  <span className="text-amber-600">{entryDelta} vs prior week</span>
                ) : (
                  <span>Same pace as prior week</span>
                )}
              </div>
            )}
          </div>

          {/* Dominant Mood */}
          <div
            className="p-3.5 rounded-xl border"
            style={
              weekStats.dominant
                ? {
                    backgroundColor: getEmotionMeta(weekStats.dominant.emotion).bgLight,
                    borderColor: getEmotionMeta(weekStats.dominant.emotion).border,
                  }
                : { backgroundColor: '#f8fafc', borderColor: '#f1f5f9' }
            }
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Dominant Weekly Mood
            </div>
            {weekStats.dominant ? (
              <div className="mt-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {getEmotionMeta(weekStats.dominant.emotion).emoji}
                  </span>
                  <span
                    className="text-lg font-extrabold"
                    style={{
                      color: getEmotionMeta(weekStats.dominant.emotion).color,
                    }}
                  >
                    {weekStats.dominant.emotion}
                  </span>
                </div>
                <span className="text-sm font-mono font-bold text-gray-700">
                  {weekStats.dominant.pct}%
                </span>
              </div>
            ) : (
              <div className="mt-2 text-sm font-medium text-gray-400">
                No entries logged
              </div>
            )}
          </div>

          {/* Week-over-Week Shifts */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-gray-100">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Week-over-Week Shifts
            </div>
            {shifts.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {shifts.map(({ emotion, delta }) => {
                  const meta = getEmotionMeta(emotion);
                  const up = delta > 0;
                  return (
                    <span
                      key={emotion}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-white border border-gray-200 text-gray-700"
                    >
                      <span>{meta.emoji}</span>
                      <span>{emotion}</span>
                      <span className={up ? 'text-emerald-600' : 'text-rose-600'}>
                        {up ? '↑' : '↓'}
                        {Math.abs(delta)}%
                      </span>
                    </span>
                  );
                })}
              </div>
            ) : (
              <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                <Minus size={12} />
                <span>
                  {weekStats.entryCount === 0
                    ? 'Log reflections to see shifts'
                    : 'Not enough prior-week data yet'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 7-Day Stacked Emotion Bar Chart */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Daily Emotion Stack (Tap any day to inspect)
            </span>
            <span className="text-[11px] text-gray-400">
              Height = Emotional intensity share (100%)
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2 sm:gap-3 pt-4 pb-2 px-2 bg-gradient-to-b from-slate-50/70 to-white rounded-2xl border border-gray-100">
            {weekDays.map((day) => {
              const key = toLocalDateKey(day);
              const summary = dailyMap[key];
              const isToday = key === todayKey;
              const isSelected = activeDaySummary.key === key;
              const primaryMeta = summary?.primaryEmotion
                ? getEmotionMeta(summary.primaryEmotion)
                : null;

              const segments = summary
                ? CORE_EMOTION_LIST.map((em) => ({
                    emotion: em,
                    pct: summary.distribution[em] || 0,
                    meta: getEmotionMeta(em),
                  })).filter((s) => s.pct > 0)
                : [];

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDayKey(key)}
                  className={`flex flex-col items-center p-1.5 sm:p-2 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-purple-50/90 ring-2 ring-purple-400'
                      : 'hover:bg-slate-100/70'
                  }`}
                >
                  {/* Floating primary emoji badge */}
                  <div className="h-7 flex items-center justify-center mb-1">
                    {primaryMeta ? (
                      <span
                        className="text-lg sm:text-xl leading-none drop-shadow-2xs"
                        title={`Primary: ${primaryMeta.label}`}
                      >
                        {primaryMeta.emoji}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </div>

                  {/* Stacked vertical bar */}
                  <div className="w-full max-w-[38px] h-28 sm:h-32 rounded-xl bg-gray-100/80 border border-gray-200/70 overflow-hidden flex flex-col-reverse justify-start p-0.5">
                    {segments.length > 0 ? (
                      segments.map((seg) => (
                        <div
                          key={seg.emotion}
                          style={{
                            height: `${seg.pct}%`,
                            backgroundColor: seg.meta.color,
                          }}
                          className="w-full first:rounded-b-lg last:rounded-t-lg transition-all duration-500"
                          title={`${seg.emotion}: ${seg.pct}%`}
                        />
                      ))
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300/70" />
                      </div>
                    )}
                  </div>

                  {/* Day & Date Label */}
                  <div className="mt-2 text-center">
                    <div
                      className={`text-[11px] font-bold ${
                        isToday ? 'text-pink-600' : 'text-gray-700'
                      }`}
                    >
                      {DAY_SHORT[day.getDay()]}
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono">
                      {day.getDate()}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Weekly 8-Emotion Balance Bars */}
        {weekStats.entryCount > 0 && (
          <div className="space-y-2.5 pt-2 border-t border-gray-100">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Weekly Balance Across All 8 Emotions
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {CORE_EMOTION_LIST.map((em) => {
                const meta = getEmotionMeta(em);
                const pct = weekStats.percentages[em] || 0;
                return (
                  <div
                    key={em}
                    className={`p-2.5 rounded-xl border ${
                      pct > 0
                        ? 'bg-white border-gray-200/80'
                        : 'bg-slate-50/70 border-gray-100 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                      <span className="flex items-center gap-1 text-gray-800">
                        <span>{meta.emoji}</span>
                        <span>{meta.label}</span>
                      </span>
                      <span className="font-mono text-gray-700">{pct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: meta.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Selected Day Detail Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/80 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-purple-600" />
            <h4 className="text-sm font-bold text-gray-900">
              {activeDaySummary.date.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </h4>
          </div>

          {activeDaySummary.summary?.primaryEmotion && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border"
              style={{
                backgroundColor: getEmotionMeta(activeDaySummary.summary.primaryEmotion)
                  .bgLight,
                borderColor: getEmotionMeta(activeDaySummary.summary.primaryEmotion)
                  .border,
                color: getEmotionMeta(activeDaySummary.summary.primaryEmotion).color,
              }}
            >
              <Sparkles size={11} />
              <span>
                {getEmotionMeta(activeDaySummary.summary.primaryEmotion).emoji}{' '}
                {activeDaySummary.summary.primaryEmotion} Day
              </span>
            </span>
          )}
        </div>

        {activeDaySummary.summary && activeDaySummary.summary.entries.length > 0 ? (
          <div className="space-y-2">
            {activeDaySummary.summary.entries.map((entry) => {
              const em = entry.analysis?.primary_emotion
                ? getEmotionMeta(entry.analysis.primary_emotion)
                : null;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onSelectEntry(entry)}
                  className="w-full text-left p-3.5 rounded-xl bg-slate-50 hover:bg-purple-50/50 border border-gray-200/70 hover:border-purple-300 transition-all flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-800 font-medium line-clamp-2">
                      "{entry.text}"
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-gray-500">
                      <span className="font-mono">
                        {new Date(entry.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {em && (
                        <span
                          className="px-2 py-0.2 rounded-full font-semibold"
                          style={{
                            backgroundColor: em.bgLight,
                            color: em.color,
                          }}
                        >
                          {em.emoji} {em.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-purple-600 shrink-0 self-center">
                    View &rarr;
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-gray-200 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-gray-500">
              No journal reflection recorded on this day.
            </span>
            {activeDaySummary.key === todayKey && onWriteEntry && (
              <button
                type="button"
                onClick={onWriteEntry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold transition-colors"
              >
                <BookOpen size={13} />
                <span>Write Today's Entry</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
