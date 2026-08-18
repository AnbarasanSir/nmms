import React, { useState, useEffect } from 'react';
import { Award, UserCheck, ShieldCheck, GraduationCap, LayoutDashboard, Sparkles, Maximize2, Minimize2, LogOut } from 'lucide-react';
import { toggleFullscreen, isFullscreenActive } from '../utils/fullscreen';

interface NavbarProps {
  currentView: 'student_entry' | 'exam' | 'scorecard' | 'teacher_admin';
  setCurrentView: (view: 'student_entry' | 'teacher_admin') => void;
  onAdminLogout?: () => void;
  examInProgress?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  onAdminLogout,
  examInProgress = false,
}) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => isFullscreenActive());

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(isFullscreenActive());
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo & Portal Identity */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-inner text-white font-bold flex-shrink-0">
              <Award className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <span className="font-extrabold tracking-tight text-base sm:text-lg md:text-xl bg-gradient-to-r from-white via-indigo-100 to-blue-200 bg-clip-text text-transparent truncate">
                  NMMS PORTAL
                </span>
                <span className="hidden xs:inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  MAT &amp; SAT
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden md:block truncate">
                National Means-cum-Merit Scholarship Assessment &amp; Analytics
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
            {/* Fullscreen Toggle in Navbar Header */}
            <button
              type="button"
              id="nav-fullscreen-toggle-btn"
              onClick={async () => {
                await toggleFullscreen();
                setIsFullscreen(isFullscreenActive());
              }}
              className={`p-2 sm:p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                isFullscreen
                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/30 shadow-sm'
                  : 'bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border-indigo-500/40'
              }`}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-amber-300" />
              ) : (
                <Maximize2 className="w-4 h-4 text-indigo-300" />
              )}
            </button>

            {!examInProgress && currentView !== 'scorecard' && (
              <div className="flex items-center space-x-2">
                {currentView === 'teacher_admin' ? (
                  <button
                    id="nav-admin-logout-btn"
                    type="button"
                    onClick={() => {
                      try {
                        sessionStorage.removeItem('nmms_admin_auth');
                        localStorage.removeItem('nmms_admin_auth');
                      } catch {
                        // ignore
                      }
                      if (onAdminLogout) {
                        onAdminLogout();
                      } else {
                        setCurrentView('student_entry');
                      }
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 hover:text-white border border-rose-500/40 text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-sm"
                    title="வெளியேறு (Logout to Student Portal)"
                  >
                    <LogOut className="w-4 h-4 text-rose-300" />
                    <span>Logout</span>
                  </button>
                ) : (
                  <button
                    id="nav-back-to-admin-btn"
                    onClick={() => setCurrentView('teacher_admin')}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Admin Portal</span>
                  </button>
                )}
              </div>
            )}

            {examInProgress && (
              <div className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Active Exam</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
