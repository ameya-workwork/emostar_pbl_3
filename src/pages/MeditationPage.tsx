import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Bell,
  Sparkles,
  BookOpen,
  Award,
  CheckCircle,
  Wind,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { PageRoute } from '../types/journal';
import { Sound } from '../services/soundGenerator';

interface MeditationPageProps {
  onNavigate: (page: PageRoute) => void;
  onStartJournalWithPrompt?: (prompt: string) => void;
}

type Phase478 = 'Inhale' | 'Hold' | 'Exhale';

export const MeditationPage: React.FC<MeditationPageProps> = ({
  onNavigate,
  onStartJournalWithPrompt,
}) => {
  // 4-7-8 Countdown State
  const [isActive, setIsActive] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [phase, setPhase] = useState<Phase478>('Inhale');
  const [count, setCount] = useState(4); // starts at 4 for inhale
  const [currentCycle, setCurrentCycle] = useState(1);
  const [targetCycles, setTargetCycles] = useState(4); // default 4 cycles (classic Dr. Weil 4-7-8 technique)

  // Sound toggles
  const [bellEnabled, setBellEnabled] = useState(true);
  const [ambientSound, setAmbientSound] = useState<'off' | 'zen' | 'rain'>('zen');

  // Lifetime Stats
  const [totalSessions, setTotalSessions] = useState(0);
  const [totalBreaths, setTotalBreaths] = useState(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('meditation_stats_478');
      if (stored) {
        const parsed = JSON.parse(stored);
        setTotalSessions(parsed.sessions || 0);
        setTotalBreaths(parsed.breaths || 0);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const saveStats = (completedCycles: number) => {
    try {
      const newSessions = totalSessions + 1;
      const newBreaths = totalBreaths + completedCycles;
      setTotalSessions(newSessions);
      setTotalBreaths(newBreaths);
      localStorage.setItem(
        'meditation_stats_478',
        JSON.stringify({ sessions: newSessions, breaths: newBreaths })
      );
    } catch (e) {
      // ignore
    }
  };

  // Main 4-7-8 Countdown Timer
  useEffect(() => {
    let interval: any = null;

    if (isActive && !isCompleted) {
      interval = setInterval(() => {
        setCount((prevCount) => {
          if (prevCount > 1) {
            return prevCount - 1;
          }

          // Count reached 1 -> transition to next phase
          if (phase === 'Inhale') {
            setPhase('Hold');
            if (bellEnabled) Sound.playSingingBowl();
            return 7; // 7 seconds for hold
          } else if (phase === 'Hold') {
            setPhase('Exhale');
            if (bellEnabled) Sound.playSingingBowl();
            return 8; // 8 seconds for exhale
          } else {
            // Exhale finished -> complete one cycle
            if (bellEnabled) Sound.playSingingBowl();

            if (currentCycle >= targetCycles) {
              handleSessionComplete();
              return 4;
            } else {
              setCurrentCycle((c) => c + 1);
              setPhase('Inhale');
              return 4; // 4 seconds for next inhale
            }
          }
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, phase, currentCycle, targetCycles, isCompleted, bellEnabled]);

  const handleStart = () => {
    setIsActive(true);
    setIsCompleted(false);

    if (ambientSound !== 'off') {
      Sound.startAmbient(ambientSound);
    }
    if (bellEnabled) {
      Sound.playSingingBowl();
    }
  };

  const handlePause = () => {
    setIsActive(false);
    Sound.stopAmbient();
  };

  const handleReset = () => {
    setIsActive(false);
    setIsCompleted(false);
    setPhase('Inhale');
    setCount(4);
    setCurrentCycle(1);
    Sound.stopAmbient();
  };

  const handleSessionComplete = () => {
    setIsActive(false);
    setIsCompleted(true);
    Sound.stopAmbient();
    if (bellEnabled) {
      Sound.playSingingBowl();
    }
    saveStats(targetCycles);
  };

  const toggleAmbient = () => {
    let nextSound: 'off' | 'zen' | 'rain' = 'off';
    if (ambientSound === 'off') nextSound = 'zen';
    else if (ambientSound === 'zen') nextSound = 'rain';
    else nextSound = 'off';

    setAmbientSound(nextSound);
    if (isActive) {
      if (nextSound === 'off') Sound.stopAmbient();
      else Sound.startAmbient(nextSound);
    }
  };

  // Phase Specific Configuration
  const phaseConfig = {
    Inhale: {
      totalSeconds: 4,
      instruction: 'Inhale through your nose',
      actionVerb: 'Breathe In',
      boxColor: 'border-emerald-400 bg-emerald-50/50',
      badgeColor: 'bg-emerald-600 text-white',
      accentText: 'text-emerald-700',
      ringColor: '#10b981',
      scale: 'scale-105',
    },
    Hold: {
      totalSeconds: 7,
      instruction: 'Hold your breath gently',
      actionVerb: 'Hold Still',
      boxColor: 'border-indigo-400 bg-indigo-50/50',
      badgeColor: 'bg-indigo-600 text-white',
      accentText: 'text-indigo-700',
      ringColor: '#6366f1',
      scale: 'scale-105',
    },
    Exhale: {
      totalSeconds: 8,
      instruction: 'Slowly exhale through your mouth',
      actionVerb: 'Release & Exhale',
      boxColor: 'border-pink-400 bg-pink-50/50',
      badgeColor: 'bg-pink-600 text-white',
      accentText: 'text-pink-700',
      ringColor: '#ec4899',
      scale: 'scale-95',
    },
  }[phase];

  // Calculate percentage of phase elapsed for progress indicator
  const progressPercent = Math.round(
    ((phaseConfig.totalSeconds - count + 1) / phaseConfig.totalSeconds) * 100
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-gray-900 font-serif">
              4-7-8 Meditation Timer
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              <Wind size={13} />
              <span>Vagus Nerve Calming</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            4s Inhale &bull; 7s Hold &bull; 8s Exhale
          </p>
        </div>

        {/* Stats Pill */}
        <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 px-3 py-1.5 rounded-xl text-xs font-semibold text-purple-900 self-start sm:self-auto">
          <Award size={15} className="text-purple-600" />
          <span>{totalBreaths} Breath Cycles Completed</span>
        </div>
      </div>

      {/* Main 4-7-8 Breathing Countdown Box */}
      <div
        className={`rounded-3xl border-2 shadow-lg p-6 sm:p-10 transition-all duration-700 flex flex-col items-center relative overflow-hidden bg-white ${phaseConfig.boxColor}`}
      >
        {isCompleted ? (
          /* Session Completed View */
          <div className="text-center py-6 space-y-5 animate-in zoom-in-95 duration-200 z-10 max-w-md w-full">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle size={40} />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-gray-900 font-serif">
                4-7-8 Session Completed!
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                You've completed {targetCycles} full cycles of the 4-7-8 relaxing breath. Notice the renewed calm in your chest and shoulders.
              </p>
            </div>

            <div className="p-4 bg-purple-50/80 rounded-2xl border border-purple-100 text-purple-900 text-xs italic">
              "When you slow your breath down to 8 seconds on the exhale, your parasympathetic nervous system turns on, lowering heart rate and quieting stress."
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-3">
              <button
                onClick={() => {
                  if (onStartJournalWithPrompt) {
                    onStartJournalWithPrompt(
                      `Just completed ${targetCycles} cycles of 4-7-8 breath meditation. Here is how my thoughts and physical state feel right now:`
                    );
                  }
                  onNavigate('journal');
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-pink-600 hover:bg-pink-700 active:scale-95 text-white font-semibold rounded-xl shadow-md transition-all text-sm"
              >
                <BookOpen size={16} />
                <span>Journal Your Experience</span>
              </button>

              <button
                onClick={handleReset}
                className="px-5 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl text-sm transition-colors"
              >
                Restart 4-7-8
              </button>
            </div>
          </div>
        ) : (
          /* Active Countdown Box */
          <>
            {/* Top Phase Step Bar */}
            <div className="w-full grid grid-cols-3 gap-2 mb-6 text-center text-xs font-bold">
              {/* Step 1: Inhale */}
              <div
                className={`py-2 px-1 rounded-xl border transition-all ${
                  phase === 'Inhale'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-gray-100/80 text-gray-400 border-transparent'
                }`}
              >
                <div>1. INHALE</div>
                <div className="text-[10px] font-normal opacity-90">4 Seconds</div>
              </div>

              {/* Step 2: Hold */}
              <div
                className={`py-2 px-1 rounded-xl border transition-all ${
                  phase === 'Hold'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-gray-100/80 text-gray-400 border-transparent'
                }`}
              >
                <div>2. HOLD</div>
                <div className="text-[10px] font-normal opacity-90">7 Seconds</div>
              </div>

              {/* Step 3: Exhale */}
              <div
                className={`py-2 px-1 rounded-xl border transition-all ${
                  phase === 'Exhale'
                    ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                    : 'bg-gray-100/80 text-gray-400 border-transparent'
                }`}
              >
                <div>3. EXHALE</div>
                <div className="text-[10px] font-normal opacity-90">8 Seconds</div>
              </div>
            </div>

            {/* Cycle Counter */}
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
              Breath Cycle {currentCycle} of {targetCycles}
            </div>

            {/* The Central Countdown Box Square */}
            <div
              className={`w-56 h-56 sm:w-64 sm:h-64 rounded-3xl bg-white shadow-xl border-4 flex flex-col items-center justify-center p-6 my-4 transition-all duration-1000 ${phaseConfig.scale} border-opacity-70`}
              style={{ borderColor: phaseConfig.ringColor }}
            >
              {/* Action Verb */}
              <span
                className={`text-sm sm:text-base font-bold uppercase tracking-wider mb-1 ${phaseConfig.accentText}`}
              >
                {isActive ? phaseConfig.actionVerb : '4-7-8 Breath'}
              </span>

              {/* Big Countdown Number */}
              <div
                className={`text-6xl sm:text-7xl font-mono font-extrabold tracking-tight my-1 transition-all ${phaseConfig.accentText}`}
              >
                {isActive ? count : 4}
              </div>

              {/* Seconds label */}
              <span className="text-xs font-semibold text-gray-400">
                {isActive ? `seconds remaining` : 'seconds to start'}
              </span>

              {/* Progress Bar inside Box */}
              {isActive && (
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-4">
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${progressPercent}%`,
                      backgroundColor: phaseConfig.ringColor,
                    }}
                  />
                </div>
              )}
            </div>

            {/* Live Instruction Sentence */}
            <div className="text-center my-3 space-y-1">
              <p className="text-lg sm:text-xl font-serif font-bold text-gray-800">
                {isActive ? phaseConfig.instruction : 'Press Start to begin 4-7-8 breathing'}
              </p>
              <p className="text-xs text-gray-500">
                Breathe in quietly through nose, hold, and blow out whoosh through mouth.
              </p>
            </div>

            {/* Controls Bar */}
            <div className="flex items-center gap-4 mt-4">
              <button
                type="button"
                onClick={handleReset}
                className="p-3 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
                title="Reset timer"
              >
                <RotateCcw size={22} />
              </button>

              <button
                type="button"
                onClick={isActive ? handlePause : handleStart}
                className="w-16 h-16 rounded-full bg-purple-700 hover:bg-purple-800 active:scale-95 text-white flex items-center justify-center shadow-lg transition-transform"
                title={isActive ? 'Pause' : 'Start 4-7-8 countdown'}
              >
                {isActive ? <Pause size={28} /> : <Play size={28} className="translate-x-0.5" />}
              </button>

              <button
                type="button"
                onClick={toggleAmbient}
                className={`p-3 rounded-full transition-colors ${
                  ambientSound !== 'off'
                    ? 'text-purple-600 bg-purple-100 ring-1 ring-purple-300'
                    : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title={`Ambient soundscape: ${ambientSound}`}
              >
                {ambientSound === 'off' ? <VolumeX size={22} /> : <Volume2 size={22} />}
              </button>

              <button
                type="button"
                onClick={() => setBellEnabled(!bellEnabled)}
                className={`p-3 rounded-full transition-colors ${
                  bellEnabled
                    ? 'text-amber-600 bg-amber-100 ring-1 ring-amber-300'
                    : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title={`Singing bowl chime: ${bellEnabled ? 'ON' : 'OFF'}`}
              >
                <Bell size={22} />
              </button>
            </div>

            {/* Cycle Selection Presets */}
            {!isActive && (
              <div className="w-full pt-6 mt-6 border-t border-gray-200/80 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                  <span>Number of 4-7-8 Cycles:</span>
                  <span className="text-purple-600 font-normal">
                    {targetCycles} cycles (~{Math.round((targetCycles * 19) / 60)} min)
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {[
                    { cycles: 4, label: '4 Cycles', subtitle: 'Recommended (~1m 16s)' },
                    { cycles: 8, label: '8 Cycles', subtitle: 'Deep Calm (~2m 32s)' },
                    { cycles: 12, label: '12 Cycles', subtitle: 'Full Reset (~3m 48s)' },
                    { cycles: 16, label: '16 Cycles', subtitle: 'Deep Trance (~5m)' },
                  ].map((opt) => (
                    <button
                      key={opt.cycles}
                      type="button"
                      onClick={() => setTargetCycles(opt.cycles)}
                      className={`p-2.5 rounded-xl text-center border text-xs font-semibold transition-all ${
                        targetCycles === opt.cycles
                          ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div>{opt.label}</div>
                      <div className="text-[10px] opacity-75 font-normal">{opt.subtitle}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Educational Guide Card */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-2xs space-y-3">
        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-600" />
          <span>Why 4-7-8 Breathing Works</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-600 leading-relaxed">
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
            <span className="font-bold text-emerald-900 block mb-1">Inhale for 4</span>
            Draws oxygen deeply into the diaphragm rather than shallow chest breathing.
          </div>
          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
            <span className="font-bold text-indigo-900 block mb-1">Hold for 7</span>
            Allows oxygen to saturate the bloodstream and slows down racing heartbeats.
          </div>
          <div className="p-3 bg-pink-50/60 rounded-xl border border-pink-100">
            <span className="font-bold text-pink-900 block mb-1">Exhale for 8</span>
            Extended exhalation triggers the vagus nerve to release calming acetylcholine.
          </div>
        </div>
      </div>
    </div>
  );
};
