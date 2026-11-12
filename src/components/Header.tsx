import React, { useState } from 'react';
import { Menu, ArrowLeft, Activity, Wind, Cloud, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { PageRoute } from '../types/journal';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  page: PageRoute;
  onOpenDrawer: () => void;
  onBack?: () => void;
  titleOverride?: string;
  onNavigate?: (page: PageRoute) => void;
}

export const Header: React.FC<HeaderProps> = ({
  page,
  onOpenDrawer,
  onBack,
  titleOverride,
  onNavigate,
}) => {
  const { user, signInWithGoogle, signOut } = useAuth();
  const [showPulseModal, setShowPulseModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  let bgClass = 'bg-purple-700';
  let title = 'EMOSTAR: An Insightful Journalling App';

  if (page === 'journal') {
    bgClass = 'bg-pink-600';
    title = 'Journal Entry';
  } else if (page === 'analysis') {
    bgClass = 'bg-pink-600';
    title = 'Emotion Analysis';
  } else if (page === 'history') {
    bgClass = 'bg-pink-600';
    title = 'Journal History';
  } else if (page === 'meditation') {
    bgClass = 'bg-emerald-700';
    title = 'Meditation & Mindful Breath';
  } else {
    bgClass = 'bg-purple-700';
    title = titleOverride || 'EMOSTAR: An Insightful Journalling App';
  }

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await signInWithGoogle();
    } catch (e) {
      console.error('Sign in error:', e);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <>
      <header className={`${bgClass} text-white shadow-md sticky top-0 z-40 transition-colors duration-200`}>
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack ? (
              <button
                onClick={onBack}
                className="p-2 -ml-2 rounded-full hover:bg-white/15 transition-colors focus:outline-hidden"
                aria-label="Go back"
              >
                <ArrowLeft size={24} />
              </button>
            ) : (
              <button
                onClick={onOpenDrawer}
                className="p-2 -ml-2 rounded-full hover:bg-white/15 transition-colors focus:outline-hidden"
                aria-label="Open menu"
              >
                <Menu size={24} />
              </button>
            )}

            <h1
              className={`text-lg sm:text-xl font-bold truncate ${
                page === 'home' ? 'font-serif tracking-tight' : 'font-sans'
              }`}
            >
              {title}
            </h1>
          </div>

          {/* Action icons */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => {
                if (onNavigate) onNavigate('meditation');
              }}
              className={`p-2 rounded-full hover:bg-white/15 transition-colors ${
                page === 'meditation' ? 'bg-white/20 ring-2 ring-white/50' : ''
              }`}
              title="Open Meditation Timer"
              aria-label="Meditation timer"
            >
              <Wind size={20} />
            </button>

            <button
              onClick={() => setShowPulseModal(true)}
              className="p-2 rounded-full hover:bg-white/15 transition-colors"
              title="Emotional check-in pulse"
              aria-label="Heart monitor"
            >
              <Activity size={20} />
            </button>

            {/* Auth / Cloud Sync Status */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1.5 p-1 pl-2 rounded-full bg-white/15 hover:bg-white/25 transition-all text-xs"
                >
                  <Cloud size={14} className="text-emerald-300" />
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-7 h-7 rounded-full border border-white/40 object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-white/30 flex items-center justify-center font-bold text-xs">
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 text-gray-800 animate-in fade-in zoom-in-95 duration-100 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-xs font-bold text-gray-900 truncate">
                        {user.displayName || 'Signed in'}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>PostgreSQL Cloud Sync</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        signOut();
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={14} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 active:scale-95 text-xs font-semibold transition-all ml-1"
                title="Sign in with Google to sync with Cloud SQL"
              >
                <LogIn size={14} />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Pulse / Emotional Well-Being Modal */}
      {showPulseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-gray-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-purple-700 mb-3">
              <Activity size={28} className="text-pink-600 animate-bounce" />
              <h2 className="text-xl font-bold font-serif">Heart & Mind Pulse</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Taking a momentary pause before journaling helps calibrate your thoughts and lowers physiological stress.
            </p>
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 mb-4 space-y-2">
              <div className="flex justify-between text-xs font-semibold text-purple-900">
                <span>Recommended practice:</span>
                <span>4-7-8 Breathing</span>
              </div>
              <p className="text-xs text-purple-700">
                Inhale through your nose for 4 seconds, hold for 7 seconds, and exhale slowly for 8 seconds.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowPulseModal(false);
                  if (onNavigate) onNavigate('meditation');
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors text-sm"
              >
                Open Meditation
              </button>
              <button
                onClick={() => setShowPulseModal(false)}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
