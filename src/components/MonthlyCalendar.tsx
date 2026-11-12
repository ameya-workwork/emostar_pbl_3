import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { JournalEntry } from '../types/journal';
import {
  CORE_EMOTION_LIST,
  CoreEmotion,
  getEmotionMeta,
} from '../services/emotionTaxonomy';
import { buildDailyEmotionMap, toLocalDateKey } from '../utils/dateHelpers';

interface MonthlyCalendarProps {
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onWriteEntry?: () => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({
  entries,
  onSelectEntry,
  onWriteEntry,
}) => {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() =>
    toLocalDateKey(now)
  );
  const [highlightEmotion, setHighlightEmotion] = useState<CoreEmotion | null>(null);

  const dailyMap = useMemo(() => buildDailyEmotionMap(entries), [entries]);
  const todayKey = toLocalDateKey(now);

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const goToToday = () => {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    setSelectedDateKey(toLocalDateKey(t));
  };

  const monthLabel = useMemo(() => {
    return new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }, [viewYear, viewMonth]);

  // Build calendar cells (leading blanks + days of month)
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const startWeekday = firstDayOfMonth.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells: Array<{
      date: Date | null;
      dateKey: string | null;
      dayNumber: number | null;
    }> = [];

    for (let i = 0; i < startWeekday; i++) {
      cells.push({ date: null, dateKey: null, dayNumber: null });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(viewYear, viewMonth, day);
      cells.push({
        date,
        dateKey: toLocalDateKey(date),
        dayNumber: day,
      });
    }

    return cells;
  }, [viewYear, viewMonth]);

  // Count how many days each primary emotion appeared in the displayed month
  const monthEmotionCounts = useMemo(() => {
    const counts: Record<CoreEmotion, number> = {
      Joy: 0,
      Calm: 0,
      Motivation: 0,
      Confusion: 0,
      Anxiety: 0,
      Stress: 0,
      Sadness: 0,
      Anger: 0,
    };

    let markedDays = 0;
    for (const cell of calendarCells) {
      if (!cell.dateKey) continue;
      const summary = dailyMap[cell.dateKey];
      if (summary?.primaryEmotion) {
        counts[summary.primaryEmotion] += 1;
        markedDays += 1;
      }
    }

    return { counts, markedDays };
  }, [calendarCells, dailyMap]);

  const selectedDaySummary = dailyMap[selectedDateKey] || null;
  const selectedDateObj = useMemo(() => {
    const [y, m, d] = selectedDateKey.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }, [selectedDateKey]);

  const isCurrentMonth =
    viewYear === now.getFullYear() && viewMonth === now.getMonth();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200/80 shadow-xs space-y-5">
        {/* Calendar Header & Month Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
              <CalendarIcon size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                {monthLabel}
              </h3>
              <p className="text-xs text-gray-500">
                {monthEmotionCounts.markedDays}{' '}
                {monthEmotionCounts.markedDays === 1 ? 'day' : 'days'} marked with primary emotions
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={goToPrevMonth}
              className="p-1.5 rounded-lg hover:bg-white text-gray-600 hover:text-gray-900 transition-colors"
              title="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={goToToday}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                isCurrentMonth
                  ? 'bg-white text-pink-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={goToNextMonth}
              className="p-1.5 rounded-lg hover:bg-white text-gray-600 hover:text-gray-900 transition-colors"
              title="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Weekday Header */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-[11px] font-bold uppercase tracking-wider text-gray-400 py-1"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {calendarCells.map((cell, idx) => {
            if (!cell.dateKey || !cell.dayNumber) {
              return <div key={`empty-${idx}`} className="min-h-[64px] sm:min-h-[82px]" />;
            }

            const summary = dailyMap[cell.dateKey];
            const primaryEmotion = summary?.primaryEmotion || null;
            const meta = primaryEmotion ? getEmotionMeta(primaryEmotion) : null;
            const entryCount = summary?.entries.length || 0;
            const isToday = cell.dateKey === todayKey;
            const isSelected = cell.dateKey === selectedDateKey;
            const isDimmed =
              highlightEmotion !== null &&
              primaryEmotion !== highlightEmotion;

            return (
              <button
                key={cell.dateKey}
                type="button"
                onClick={() => setSelectedDateKey(cell.dateKey!)}
                className={`relative min-h-[66px] sm:min-h-[84px] p-1.5 sm:p-2 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  isSelected
                    ? 'ring-2 ring-purple-600 shadow-sm scale-[1.02] z-10'
                    : isToday
                    ? 'ring-1.5 ring-pink-400'
                    : 'hover:border-purple-300'
                } ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
                style={
                  meta
                    ? {
                        backgroundColor: meta.bgLight,
                        borderColor: meta.border,
                      }
                    : {
                        backgroundColor: isToday ? '#fdf2f8' : '#f8fafc',
                        borderColor: isToday ? '#fbcfe8' : '#f1f5f9',
                      }
                }
              >
                {/* Top Row: Day number + count */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs font-bold leading-none ${
                      isToday
                        ? 'text-pink-600 underline decoration-2 underline-offset-2'
                        : meta
                        ? 'text-gray-800'
                        : 'text-gray-400'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {entryCount > 1 && (
                    <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded-md bg-white/80 text-gray-600 border border-gray-200/70">
                      ×{entryCount}
                    </span>
                  )}
                </div>

                {/* Primary Emotion Marker */}
                {meta ? (
                  <div className="mt-1 flex flex-col items-center justify-center w-full">
                    <span className="text-lg sm:text-xl leading-none">
                      {meta.emoji}
                    </span>
                    <span
                      className="mt-1 text-[9px] sm:text-[10px] font-bold truncate max-w-full px-1 py-0.2 rounded-md bg-white/80"
                      style={{ color: meta.color }}
                    >
                      {meta.label}
                    </span>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <span className="w-1 h-1 rounded-full bg-gray-300/60" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Interactive 8-Emotion Legend for the Month */}
        <div className="pt-3 border-t border-gray-100 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="font-bold uppercase tracking-wider">
              Month Emotion Markers (tap to highlight)
            </span>
            {highlightEmotion && (
              <button
                type="button"
                onClick={() => setHighlightEmotion(null)}
                className="text-purple-600 font-semibold hover:underline"
              >
                Clear highlight
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {CORE_EMOTION_LIST.map((em) => {
              const meta = getEmotionMeta(em);
              const count = monthEmotionCounts.counts[em];
              const isHighlighted = highlightEmotion === em;

              return (
                <button
                  key={em}
                  type="button"
                  onClick={() =>
                    setHighlightEmotion(isHighlighted ? null : em)
                  }
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                    isHighlighted
                      ? 'text-white shadow-xs scale-105'
                      : count > 0
                      ? 'bg-white text-gray-700 hover:bg-gray-50'
                      : 'bg-gray-50 text-gray-400 border-gray-100 opacity-65'
                  }`}
                  style={
                    isHighlighted
                      ? { backgroundColor: meta.color, borderColor: meta.color }
                      : count > 0
                      ? { borderColor: meta.border }
                      : {}
                  }
                >
                  <span>{meta.emoji}</span>
                  <span>{meta.label}</span>
                  <span className="font-mono text-[10px] opacity-80">
                    ({count}d)
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Day Entries Panel */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/80 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-gray-900">
              {selectedDateObj.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </h4>
            <p className="text-xs text-gray-400">
              {selectedDaySummary
                ? `${selectedDaySummary.entries.length} ${
                    selectedDaySummary.entries.length === 1
                      ? 'reflection'
                      : 'reflections'
                  } logged`
                : 'No entries logged on this date'}
            </p>
          </div>

          {selectedDaySummary?.primaryEmotion && (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
              style={{
                backgroundColor: getEmotionMeta(selectedDaySummary.primaryEmotion)
                  .bgLight,
                borderColor: getEmotionMeta(selectedDaySummary.primaryEmotion)
                  .border,
                color: getEmotionMeta(selectedDaySummary.primaryEmotion).color,
              }}
            >
              <Sparkles size={12} />
              <span>
                {getEmotionMeta(selectedDaySummary.primaryEmotion).emoji} Primary:{' '}
                {selectedDaySummary.primaryEmotion}
              </span>
            </span>
          )}
        </div>

        {selectedDaySummary && selectedDaySummary.entries.length > 0 ? (
          <div className="space-y-2">
            {selectedDaySummary.entries.map((entry) => {
              const em = entry.analysis?.primary_emotion
                ? getEmotionMeta(entry.analysis.primary_emotion)
                : null;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onSelectEntry(entry)}
                  className="w-full text-left p-3.5 rounded-xl bg-slate-50 hover:bg-pink-50/40 border border-gray-200/70 hover:border-pink-300 transition-all flex items-start justify-between gap-3"
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
                  <span className="text-xs font-semibold text-pink-600 shrink-0 self-center">
                    Analysis &rarr;
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-gray-200 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-gray-500">
              Select a highlighted day on the calendar to review its reflections and mood breakdown.
            </span>
            {selectedDateKey === todayKey && onWriteEntry && (
              <button
                type="button"
                onClick={onWriteEntry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold transition-colors"
              >
                <BookOpen size={13} />
                <span>Journal Today</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
