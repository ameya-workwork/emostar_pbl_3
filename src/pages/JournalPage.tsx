import React, { useState, useEffect } from 'react';
import { Loader2, Sparkles, Trash2, Lightbulb, BrainCircuit } from 'lucide-react';
import { JournalEntry, EmotionAnalysis } from '../types/journal';
import { JournalStorage } from '../services/storage';
import { analyzeJournalEmotion } from '../services/robertaService';
import { CORE_EMOTION_LIST, CORE_EMOTIONS } from '../services/emotionTaxonomy';

interface JournalPageProps {
  onJournalSaved: (entry: JournalEntry, analysis: EmotionAnalysis) => void;
  onShowToast: (message: string, isError?: boolean) => void;
  initialText?: string;
}

const PROMPT_INSPIRATIONS = [
  "What was the most rewarding part of your day today?",
  "Did anything trigger stress, pressure, or anxiety today, and how did you navigate it?",
  "What is one small thing you felt grateful or relieved about?",
  "Write honestly about something that confused, annoyed, or challenged you.",
];

export const JournalPage: React.FC<JournalPageProps> = ({
  onJournalSaved,
  onShowToast,
  initialText = '',
}) => {
  const [text, setText] = useState(initialText);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialText) {
      setText(initialText);
    }
  }, [initialText]);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  const handleSaveJournal = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      onShowToast('Please write something in your journal before saving.', true);
      return;
    }

    setIsSaving(true);

    const localEntry: JournalEntry = {
      id: Date.now().toString(),
      text: trimmed,
      createdAt: new Date().toISOString(),
      analysisStatus: 'pending',
    };

    try {
      await JournalStorage.saveEntry(localEntry);

      // Analyze using the 8 grouped emotions model
      const emotionAnalysis = await analyzeJournalEmotion(trimmed);

      const updatedEntry: JournalEntry = {
        ...localEntry,
        analysisStatus: 'complete',
        analysis: emotionAnalysis,
      };

      await JournalStorage.updateEntry(updatedEntry);

      setText('');
      setIsSaving(false);

      onShowToast('Journal analyzed successfully!');
      onJournalSaved(updatedEntry, emotionAnalysis);
    } catch (err) {
      console.error('Error during emotion analysis:', err);
      setIsSaving(false);
      onShowToast('Journal saved, but emotion analysis encountered an issue.', true);
    }
  };

  const setPrompt = (prompt: string) => {
    if (text) {
      setText((prev) => `${prev}\n\n${prompt} `);
    } else {
      setText(`${prompt} `);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200/80 p-5 sm:p-8 space-y-6">
        {/* Title area */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 font-serif">
                New Journal Reflection
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-pink-100 text-pink-700">
                <BrainCircuit size={12} />
                <span>8-Emotion Model</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Maps your reflection across Joy, Calm, Motivation, Confusion, Anxiety, Stress, Sadness, and Anger
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>{wordCount} words</span>
            <span>&bull;</span>
            <span>{charCount} chars</span>
          </div>
        </div>

        {/* 8 Core Dimensions Strip */}
        <div className="flex flex-wrap gap-1.5">
          {CORE_EMOTION_LIST.map((em) => {
            const meta = CORE_EMOTIONS[em];
            return (
              <span
                key={em}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border"
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

        {/* Text Input area */}
        <div className="space-y-2">
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write about your day, how you felt, what challenged or inspired you..."
              rows={10}
              disabled={isSaving}
              className="w-full p-4 rounded-2xl border border-gray-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all text-gray-800 placeholder-gray-400 resize-y text-base sm:text-lg leading-relaxed focus:outline-hidden"
            />

            {text && !isSaving && (
              <button
                type="button"
                onClick={() => setText('')}
                className="absolute top-3 right-3 text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                title="Clear text"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Prompt inspirations */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
            <Lightbulb size={14} className="text-amber-500" />
            <span>Need inspiration? Click a prompt to insert:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {PROMPT_INSPIRATIONS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setPrompt(prompt)}
                disabled={isSaving}
                className="text-xs bg-gray-50 hover:bg-pink-50 hover:text-pink-700 hover:border-pink-200 text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200/80 transition-colors text-left"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Save/Analyze Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleSaveJournal}
            disabled={isSaving || !text.trim()}
            className="w-full sm:w-auto min-w-[240px] inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed active:scale-95 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            {isSaving ? (
              <>
                <Loader2 size={20} className="animate-spin text-white" />
                <span>Analyzing Emotions...</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Save & Analyze Emotions</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
