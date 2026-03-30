import React, { useState, useRef, useEffect } from 'react';
import { ViewState, ClassSummary } from '../types';
import { COLORS } from '../constants';
import { ChevronDown } from './Icons';

interface AdminLayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
  onLogout: () => void;
  selectedClass: ClassSummary | null;
  onBackToClasses: () => void;
  onOpenGlobalMetrics: () => void;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  currentView,
  onViewChange,
  onLogout,
  selectedClass,
  onBackToClasses,
  onOpenGlobalMetrics,
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    if (profileOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [profileOpen]);

  const isClassSelect = currentView === 'ADMIN_CLASS_SELECT';
  const isGlobal = currentView === 'ADMIN_GLOBAL_METRICS';
  const isAddTeacher = currentView === 'ADMIN_ADD_TEACHER';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="sticky top-0 z-50 bg-white shadow-sm border-b border-slate-200">
        <header className="px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => onBackToClasses()}
              className="flex-shrink-0"
              aria-label="All classes"
            >
              <img src="/img/long-logo.png" alt="Lyrning" className="h-10 sm:h-14 w-auto object-contain" />
            </button>
            <div className="h-6 w-px bg-slate-300" />
            <span className="text-slate-700 font-medium truncate text-sm sm:text-base">
              <span className="text-slate-500 font-normal">Admin</span>
              {isAddTeacher
                ? ' · Add teacher'
                : isGlobal
                ? ' · Global metrics'
                : selectedClass
                  ? ` · ${selectedClass.class_name}`
                  : ' · All classes'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onViewChange('ADMIN_ADD_TEACHER')}
              className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                isAddTeacher ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Add teacher
            </button>
            {(isClassSelect || isGlobal) && (
              <button
                type="button"
                onClick={onOpenGlobalMetrics}
                className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                  isGlobal ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Global metrics
              </button>
            )}
            {isGlobal && (
              <button
                type="button"
                onClick={() => onViewChange('ADMIN_CLASS_SELECT')}
                className="px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              >
                All classes
              </button>
            )}

            <div className="relative flex items-center" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
              >
                <span className="w-9 h-9 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center">
                  AD
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 ${profileOpen ? 'rotate-180' : ''}`} />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full pt-1 z-[100]">
                  <div className="w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-4 py-3 text-sm font-medium rounded-lg mx-1 hover:bg-slate-50"
                      style={{ color: COLORS.primary }}
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {selectedClass && !isGlobal && (
          <nav className="bg-slate-100/80 border-b border-slate-200 flex px-4 sm:px-6 lg:px-8 py-2 gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={onBackToClasses}
              className="px-4 py-2 text-sm font-medium rounded-lg text-slate-600 hover:text-black hover:bg-white/80"
            >
              All classes
            </button>
            <button
              type="button"
              onClick={() => onViewChange('ADMIN_CLASS_DETAIL')}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                currentView === 'ADMIN_CLASS_DETAIL' ? 'bg-white text-black shadow-sm border border-slate-200' : 'text-slate-600 hover:bg-white/80'
              }`}
            >
              Class overview
            </button>
          </nav>
        )}
      </div>

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">{children}</main>
    </div>
  );
};

export default AdminLayout;
