import React from 'react';
import { Heart, Home, BookOpen, TrendingUp, Calendar, Wind, X, History } from 'lucide-react';
import { PageRoute } from '../types/journal';
import type { HistoryTab } from '../pages/HistoryPage';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: PageRoute;
  currentHistoryTab?: HistoryTab;
  onNavigate: (page: PageRoute) => void;
  onOpenHistoryTab?: (tab: HistoryTab) => void;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  currentPage,
  currentHistoryTab = 'list',
  onNavigate,
  onOpenHistoryTab,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer content */}
      <div className="relative w-72 max-w-[80vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
        {/* Drawer Header matching Flutter's DrawerHeader */}
        <div className="h-44 bg-gradient-to-br from-purple-700 via-purple-600 to-indigo-700 flex flex-col items-center justify-center text-white relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
            aria-label="Close Drawer"
          >
            <X size={20} />
          </button>

          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center shadow-inner mb-2">
            <Heart size={32} className="text-white fill-white animate-pulse" />
          </div>
          <span className="text-lg font-serif font-bold tracking-wide">EMOSTAR</span>
          <span className="text-xs text-purple-200 font-sans">An Insightful Journalling App</span>
        </div>

        {/* Navigation ListTiles */}
        <div className="py-2 flex-1 overflow-y-auto">
          {/* Home */}
          <button
            onClick={() => {
              onNavigate('home');
              onClose();
            }}
            className={`w-full flex items-center gap-4 px-5 py-3.5 text-left text-sm font-medium transition-colors ${
              currentPage === 'home'
                ? 'bg-purple-50 text-purple-700 border-r-4 border-purple-600 font-semibold'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Home size={22} className={currentPage === 'home' ? 'text-purple-600' : 'text-gray-500'} />
            <span>Home Page</span>
          </button>

          {/* Today's entry */}
          <button
            onClick={() => {
              onNavigate('journal');
              onClose();
            }}
            className={`w-full flex items-center gap-4 px-5 py-3.5 text-left text-sm font-medium transition-colors ${
              currentPage === 'journal'
                ? 'bg-pink-50 text-pink-700 border-r-4 border-pink-500 font-semibold'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <BookOpen size={22} className={currentPage === 'journal' ? 'text-pink-600' : 'text-gray-500'} />
            <span>Today's entry</span>
          </button>

          {/* Meditation Timer */}
          <button
            onClick={() => {
              onNavigate('meditation');
              onClose();
            }}
            className={`w-full flex items-center gap-4 px-5 py-3.5 text-left text-sm font-medium transition-colors ${
              currentPage === 'meditation'
                ? 'bg-emerald-50 text-emerald-700 border-r-4 border-emerald-600 font-semibold'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Wind size={22} className={currentPage === 'meditation' ? 'text-emerald-600' : 'text-gray-500'} />
            <span>Meditation Timer</span>
          </button>

          {/* Historical data */}
          <button
            onClick={() => {
              if (onOpenHistoryTab) onOpenHistoryTab('list');
              else onNavigate('history');
              onClose();
            }}
            className={`w-full flex items-center gap-4 px-5 py-3.5 text-left text-sm font-medium transition-colors ${
              currentPage === 'history' && currentHistoryTab === 'list'
                ? 'bg-purple-50 text-purple-700 border-r-4 border-purple-600 font-semibold'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <History size={22} className={currentPage === 'history' && currentHistoryTab === 'list' ? 'text-purple-600' : 'text-gray-500'} />
            <span>Journal History</span>
          </button>

          {/* Weekly Trends */}
          <button
            onClick={() => {
              if (onOpenHistoryTab) onOpenHistoryTab('trends');
              else onNavigate('history');
              onClose();
            }}
            className={`w-full flex items-center gap-4 px-5 py-3.5 text-left text-sm font-medium transition-colors ${
              currentPage === 'history' && currentHistoryTab === 'trends'
                ? 'bg-purple-50 text-purple-700 border-r-4 border-purple-600 font-semibold'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <TrendingUp size={22} className={currentPage === 'history' && currentHistoryTab === 'trends' ? 'text-purple-600' : 'text-gray-500'} />
            <span>Weekly Trends</span>
          </button>

          {/* Monthly Calendar */}
          <button
            onClick={() => {
              if (onOpenHistoryTab) onOpenHistoryTab('calendar');
              else onNavigate('history');
              onClose();
            }}
            className={`w-full flex items-center gap-4 px-5 py-3.5 text-left text-sm font-medium transition-colors ${
              currentPage === 'history' && currentHistoryTab === 'calendar'
                ? 'bg-indigo-50 text-indigo-700 border-r-4 border-indigo-600 font-semibold'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Calendar size={22} className={currentPage === 'history' && currentHistoryTab === 'calendar' ? 'text-indigo-600' : 'text-gray-500'} />
            <span>Monthly Mood Calendar</span>
          </button>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-gray-100 text-center text-xs text-gray-400">
          EmoStar Emotion Engine &bull; AI Powered
        </div>
      </div>
    </div>
  );
};
