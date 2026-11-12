import React, { useState, useMemo, useEffect } from 'react';
import {
  Book,
  ChevronRight,
  Trash2,
  Search,
  X,
  PieChart as PieIcon,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Calendar,
  ListFilter,
} from 'lucide-react';
import { JournalEntry, PageRoute } from '../types/journal';
import { formatJournalDate } from '../utils/formatters';
import { CORE_EMOTIONS, CORE_EMOTION_LIST, getEmotionMeta } from '../services/emotionTaxonomy';
import { EmotionPieChart } from '../components/EmotionPieChart';
import { WeeklyTrends } from '../components/WeeklyTrends';
import { MonthlyCalendar } from '../components/MonthlyCalendar';

export type HistoryTab = 'list' | 'trends' | 'calendar';

interface HistoryPageProps {
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (id: string) => void;
  onNavigate: (page: PageRoute) => void;
  activeTab?: HistoryTab;
  onTabChange?: (tab: HistoryTab) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  entries,
  onSelectEntry,
  onDeleteEntry,
  onNavigate,
  activeTab: controlledTab,
  onTabChange,
}) => {
  const [internalTab, setInternalTab] = useState<HistoryTab>(controlledTab || 'list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmotionFilter, setSelectedEmotionFilter] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showOverviewChart, setShowOverviewChart] = useState(true);

  useEffect(() => {
    if (controlledTab) {
      setInternalTab(controlledTab);
    }
  }, [controlledTab]);

  const currentTab = controlledTab ?? internalTab;
  const setTab = (tab: HistoryTab) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  // Filtered entries
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      searchTerm.trim() === '' ||
      entry.text.toLowerCase().includes(searchTerm.toLowerCase());

    const normalizedPrimary = entry.analysis?.primary_emotion
      ? getEmotionMeta(entry.analysis.primary_emotion).id
      : null;

    const matchesEmotion =
      !selectedEmotionFilter || normalizedPrimary === selectedEmotionFilter;

    return matchesSearch && matchesEmotion;
  });

  // Aggregate distribution across displayed entries for the dynamic History Pie Chart
  const aggregateDistribution = useMemo(() => {
    const totals: Record<string, number> = {};
    let count = 0;

    for (const entry of filteredEntries) {
      if (entry.analysis?.distribution) {
        count++;
        for (const [em, pct] of Object.entries(entry.analysis.distribution)) {
          const core = getEmotionMeta(em).id;
          totals[core] = (totals[core] || 0) + Number(pct);
        }
      } else if (entry.analysis?.primary_emotion) {
        count++;
        const core = getEmotionMeta(entry.analysis.primary_emotion).id;
        totals[core] = (totals[core] || 0) + 100;
      }
    }

    if (count === 0) return {};

    const sum = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
    const pctMap: Record<string, number> = {};
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);

    for (const [k, v] of sorted) {
      pctMap[k] = Math.round((v / sum) * 1000) / 10;
    }

    const finalSum = Object.values(pctMap).reduce((a, b) => a + b, 0);
    const diff = Math.round((100.0 - finalSum) * 10) / 10;
    if (diff !== 0 && sorted.length > 0) {
      pctMap[sorted[0][0]] = Math.round((pctMap[sorted[0][0]] + diff) * 10) / 10;
    }

    return pctMap;
  }, [filteredEntries]);

  const topAggregateEmotion = Object.keys(aggregateDistribution)[0] || 'Calm';

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-6 animate-in fade-in duration-200">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-serif">
            Journal History &amp; Insights
          </h2>
          <p className="text-xs sm:text-sm text-gray-500">
            {entries.length} {entries.length === 1 ? 'reflection' : 'reflections'} recorded across 8 core emotions
          </p>
        </div>

        <button
          onClick={() => onNavigate('journal')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
        >
          <span>Write New Entry</span>
        </button>
      </div>

      {/* View Switcher Tabs: Entries & Pie / Weekly Trends / Monthly Calendar */}
      <div className="grid grid-cols-3 bg-white p-1.5 rounded-2xl border border-gray-200/80 shadow-2xs gap-1">
        <button
          type="button"
          onClick={() => setTab('list')}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            currentTab === 'list'
              ? 'bg-pink-600 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <ListFilter size={15} />
          <span>Entries &amp; Breakdown</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('trends')}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            currentTab === 'trends'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <TrendingUp size={15} />
          <span>Weekly Trends</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('calendar')}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            currentTab === 'calendar'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Calendar size={15} />
          <span>Monthly Calendar</span>
        </button>
      </div>

      {/* TAB 1: Weekly Trends */}
      {currentTab === 'trends' && (
        <WeeklyTrends
          entries={entries}
          onSelectEntry={onSelectEntry}
          onWriteEntry={() => onNavigate('journal')}
        />
      )}

      {/* TAB 2: Monthly Calendar */}
      {currentTab === 'calendar' && (
        <MonthlyCalendar
          entries={entries}
          onSelectEntry={onSelectEntry}
          onWriteEntry={() => onNavigate('journal')}
        />
      )}

      {/* TAB 3: Reflections List & Aggregate Pie Chart */}
      {currentTab === 'list' && (
        <>
          {/* Search and 8-Emotion Filters */}
          <div className="bg-white rounded-2xl p-3.5 border border-gray-200/80 shadow-2xs space-y-3">
            <div className="relative">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search keywords in your journals..."
                className="w-full pl-10 pr-10 py-2 text-sm rounded-lg border border-gray-200 focus:outline-hidden focus:border-pink-500 focus:ring-1 focus:ring-pink-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* 8-Emotion quick filter badges */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setSelectedEmotionFilter(null)}
                className={`px-3 py-1 rounded-full font-medium whitespace-nowrap transition-colors ${
                  selectedEmotionFilter === null
                    ? 'bg-purple-700 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All ({entries.length})
              </button>
              {CORE_EMOTION_LIST.map((emotion) => {
                const meta = CORE_EMOTIONS[emotion];
                const isSelected = selectedEmotionFilter === emotion;
                const count = entries.filter(
                  (e) =>
                    e.analysis?.primary_emotion &&
                    getEmotionMeta(e.analysis.primary_emotion).id === emotion
                ).length;

                if (count === 0 && !isSelected) return null;

                return (
                  <button
                    key={emotion}
                    onClick={() => setSelectedEmotionFilter(isSelected ? null : emotion)}
                    className={`px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-colors flex items-center gap-1 border ${
                      isSelected
                        ? 'border-transparent text-white'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                    style={isSelected ? { backgroundColor: meta.color } : {}}
                  >
                    <span>{meta.emoji}</span>
                    <span>{meta.label}</span>
                    <span className="opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Aggregate Pie Chart Summary */}
          {Object.keys(aggregateDistribution).length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() => setShowOverviewChart(!showOverviewChart)}
                className="w-full px-5 py-3.5 flex items-center justify-between bg-slate-50/70 hover:bg-slate-100/70 transition-colors border-b border-gray-100"
              >
                <span className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <PieIcon size={16} className="text-pink-600" />
                  <span>
                    Overall Emotional Breakdown ({filteredEntries.length}{' '}
                    {filteredEntries.length === 1 ? 'entry' : 'entries'})
                  </span>
                </span>
                {showOverviewChart ? (
                  <ChevronUp size={16} className="text-gray-500" />
                ) : (
                  <ChevronDown size={16} className="text-gray-500" />
                )}
              </button>

              {showOverviewChart && (
                <div className="p-4 sm:p-6">
                  <EmotionPieChart
                    distribution={aggregateDistribution}
                    primaryEmotion={topAggregateEmotion}
                    compact
                    title="Aggregate Mood Distribution"
                  />
                </div>
              )}
            </div>
          )}

          {/* Main List */}
          {entries.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-200/80 shadow-2xs space-y-4">
              <div className="w-16 h-16 rounded-full bg-pink-50 text-pink-500 flex items-center justify-center mx-auto">
                <Book size={32} />
              </div>
              <p className="text-gray-700 text-lg font-medium">No journal entries yet.</p>
              <p className="text-gray-400 text-sm max-w-sm mx-auto">
                Take a moment to record your thoughts and see your emotional analysis unfold.
              </p>
              <button
                onClick={() => onNavigate('journal')}
                className="px-6 py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                Start your first entry
              </button>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-gray-200/80 text-gray-500 text-sm">
              No entries matched your search or emotion filter.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map((entry) => {
                const primaryEmotion = entry.analysis?.primary_emotion;
                const emotionMeta = primaryEmotion ? getEmotionMeta(primaryEmotion) : null;

                return (
                  <div
                    key={entry.id}
                    className="group relative bg-white rounded-xl border border-gray-200/90 hover:border-pink-300 hover:shadow-md transition-all duration-150 overflow-hidden"
                  >
                    <div
                      onClick={() => onSelectEntry(entry)}
                      className="p-4 sm:p-5 flex items-start gap-4 cursor-pointer"
                    >
                      <div className="mt-0.5 w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Book size={20} />
                      </div>

                      <div className="flex-1 min-w-0 pr-8">
                        <p className="text-gray-900 font-medium text-sm sm:text-base line-clamp-2 leading-snug">
                          {entry.text}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span className="font-mono">{formatJournalDate(entry.createdAt)}</span>

                          {emotionMeta && (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-xs border"
                              style={{
                                backgroundColor: emotionMeta.bgLight,
                                borderColor: emotionMeta.border,
                                color: emotionMeta.color,
                              }}
                            >
                              <span>{emotionMeta.emoji}</span>
                              <span>{emotionMeta.label}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-gray-400 group-hover:text-pink-600 group-hover:translate-x-1 transition-all shrink-0 self-center">
                        <ChevronRight size={22} />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(entry.id);
                      }}
                      className="absolute top-3 right-3 text-gray-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete entry"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-gray-800 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-gray-900">Delete Journal Entry?</h3>
            <p className="text-sm text-gray-600 mt-2">
              Are you sure you want to delete this reflection? This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteEntry(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
