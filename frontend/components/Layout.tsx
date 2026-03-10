import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from './Icons';
import { ViewState, ClassSummary } from '../types';
import { COLORS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
  onLogout: () => void;
  selectedClass: ClassSummary | null;
  onBackToClasses: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onViewChange, onLogout, selectedClass, onBackToClasses }) => {
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

  const isClassSelect = currentView === 'CLASS_SELECT';

  return (
    <div className="min-h-screen flex flex-col">
      {/* Sticky Header & Navigation Wrapper */}
      <div className="sticky top-0 z-50 bg-white shadow-sm">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer"
              style={{ backgroundColor: COLORS.primary }}
              onClick={() => { if (selectedClass) onBackToClasses(); }}
            >
              <svg viewBox="0 0 24 24" fill="black" className="w-6 h-6">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold" style={{ color: '#333' }}>Lyrning</h1>
            <div className="h-8 w-[1px] bg-gray-300 mx-2"></div>
            <span className="text-gray-600 font-medium">
              {isClassSelect
                ? 'My Classes'
                : selectedClass
                  ? `${selectedClass.class_name}${selectedClass.semester ? ` · ${selectedClass.semester}` : ''}`
                  : 'My Classes'}
            </span>
          </div>

          <div className="relative flex items-center gap-4" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((o) => !o)}
              className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-red-200 focus:ring-offset-2"
              aria-expanded={profileOpen}
              aria-haspopup="true"
            >
              <img
                src="https://picsum.photos/seed/teacher/100"
                alt="Profile"
                className="w-10 h-10 rounded-full border-2 border-gray-200 shadow-sm"
              />
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-full pt-1 z-[100]">
                <div className="w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-1">
                  <button
                    type="button"
                    onClick={() => { setProfileOpen(false); onLogout(); }}
                    className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors rounded-lg mx-1"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Class-level tab nav — only shown when a class is selected */}
        {!isClassSelect && selectedClass && (
          <nav className="bg-gray-50 border-b border-gray-100 flex justify-start px-8 py-2 gap-1">
            <button
              type="button"
              onClick={() => onViewChange('ASSIGNMENT_LIST')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                currentView === 'ASSIGNMENT_LIST' || currentView === 'ASSIGNMENT_EDIT' || currentView === 'ASSIGNMENT_VIEW'
                  ? 'bg-white text-black shadow-sm border border-gray-200'
                  : 'text-gray-600 hover:text-black hover:bg-white/70'
              }`}
            >
              Assignments
            </button>
            <button
              type="button"
              onClick={() => onViewChange('CLASS_INFO')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                currentView === 'CLASS_INFO'
                  ? 'bg-white text-black shadow-sm border border-gray-200'
                  : 'text-gray-600 hover:text-black hover:bg-white/70'
              }`}
            >
              Class Info
            </button>
          </nav>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
};

export default Layout;
