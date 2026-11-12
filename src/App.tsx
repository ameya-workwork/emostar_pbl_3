import React, { useState, useEffect } from 'react';
import { PageRoute, JournalEntry, EmotionAnalysis } from './types/journal';
import { JournalStorage } from './services/storage';
import { Header } from './components/Header';
import { Drawer } from './components/Drawer';
import { Toast } from './components/Toast';
import { HomePage } from './pages/HomePage';
import { JournalPage } from './pages/JournalPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { HistoryPage, HistoryTab } from './pages/HistoryPage';
import { MeditationPage } from './pages/MeditationPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function MainAppContent() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageRoute>('home');
  const [pageHistory, setPageHistory] = useState<PageRoute[]>(['home']);
  const [historyTab, setHistoryTab] = useState<HistoryTab>('list');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<EmotionAnalysis | null>(null);
  const [currentEntry, setCurrentEntry] = useState<JournalEntry | null>(null);
  const [initialJournalPrompt, setInitialJournalPrompt] = useState<string>('');

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastIsError, setToastIsError] = useState(false);

  // Sync on mount or when user signs in
  useEffect(() => {
    async function load() {
      const synced = await JournalStorage.syncWithCloud();
      setEntries(synced);
    }
    load();
  }, [user]);

  const refreshEntries = async () => {
    const loaded = await JournalStorage.syncWithCloud();
    setEntries(loaded);
  };

  const navigateTo = (page: PageRoute, addToHistory = true) => {
    if (addToHistory && page !== currentPage) {
      setPageHistory((prev) => [...prev, page]);
    }
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openHistoryTab = (tab: HistoryTab) => {
    setHistoryTab(tab);
    navigateTo('history');
  };

  const handleBack = () => {
    if (pageHistory.length > 1) {
      const newHistory = [...pageHistory];
      newHistory.pop();
      const prevPage = newHistory[newHistory.length - 1] || 'home';
      setPageHistory(newHistory);
      setCurrentPage(prevPage);
    } else {
      navigateTo('home', false);
    }
  };

  const showToast = (message: string, isError = false) => {
    setToastMessage(message);
    setToastIsError(isError);
  };

  const handleJournalSaved = (entry: JournalEntry, analysis: EmotionAnalysis) => {
    refreshEntries();
    setCurrentAnalysis(analysis);
    setCurrentEntry(entry);
    setInitialJournalPrompt('');
    navigateTo('analysis');
  };

  const handleSelectHistoryEntry = (entry: JournalEntry) => {
    if (entry.analysis) {
      setCurrentAnalysis(entry.analysis);
      setCurrentEntry(entry);
      navigateTo('analysis');
    } else {
      showToast('No emotion analysis available for this entry.', true);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    await JournalStorage.deleteEntry(id);
    refreshEntries();
    showToast('Entry deleted successfully');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        page={currentPage}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onBack={currentPage !== 'home' ? handleBack : undefined}
        onNavigate={navigateTo}
      />

      {/* Navigation Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentPage={currentPage}
        currentHistoryTab={historyTab}
        onNavigate={(page) => navigateTo(page)}
        onOpenHistoryTab={openHistoryTab}
      />

      {/* Main Page Content */}
      <main className="flex-1 pb-12">
        {currentPage === 'home' && (
          <HomePage
            entries={entries}
            onNavigate={navigateTo}
            onOpenHistoryTab={openHistoryTab}
          />
        )}

        {currentPage === 'journal' && (
          <JournalPage
            onJournalSaved={handleJournalSaved}
            onShowToast={showToast}
            initialText={initialJournalPrompt}
          />
        )}

        {currentPage === 'meditation' && (
          <MeditationPage
            onNavigate={navigateTo}
            onStartJournalWithPrompt={(prompt) => {
              setInitialJournalPrompt(prompt);
            }}
          />
        )}

        {currentPage === 'analysis' && currentAnalysis && (
          <AnalysisPage
            analysis={currentAnalysis}
            entry={currentEntry}
            onNavigate={navigateTo}
            onBack={handleBack}
          />
        )}

        {currentPage === 'history' && (
          <HistoryPage
            entries={entries}
            onSelectEntry={handleSelectHistoryEntry}
            onDeleteEntry={handleDeleteEntry}
            onNavigate={navigateTo}
            activeTab={historyTab}
            onTabChange={setHistoryTab}
          />
        )}
      </main>

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        isError={toastIsError}
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}

export default App;
