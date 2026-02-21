import React, { useState, useRef, useEffect } from 'react';
import { Home, GraduationCap, BookOpen, MessageSquare, ChevronDown } from './Icons';
import { UserRole, ViewState, ClassSummary } from '../types';
import { COLORS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  role: UserRole;
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
  onRoleToggle: () => void;
  onLogout: () => void;
  selectedClass: ClassSummary | null;
  onBackToClasses: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, role, currentView, onViewChange, onRoleToggle, onLogout, selectedClass, onBackToClasses }) => {
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
  const navItems = [
    { id: 'HOME' as ViewState, label: 'Home', icon: Home },
    { id: 'GRADES_LIST' as ViewState, label: 'Grades', icon: GraduationCap },
    { id: 'ASSIGNMENT_LIST' as ViewState, label: 'Assignments', icon: BookOpen },
    { id: 'METRICS_LIST' as ViewState, label: 'Metrics', icon: MessageSquare },
  ];

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
              onClick={() => { if (isClassSelect) return; if (selectedClass) onBackToClasses(); else onViewChange('HOME'); }}
            >
              <svg viewBox="0 0 24 24" fill="black" className="w-6 h-6">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold" style={{ color: '#333' }}>Lyrning</h1>
            <div className="h-8 w-[1px] bg-gray-300 mx-2"></div>
            <span className="text-gray-600 font-medium">
              {isClassSelect ? 'My Classes' : selectedClass ? `${selectedClass.class_name}${selectedClass.semester ? ` · ${selectedClass.semester}` : ''}` : 'Home'}
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
                src={role === UserRole.TEACHER ? "https://picsum.photos/seed/teacher/100" : "https://picsum.photos/seed/student/100"} 
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

        {/* Navigation — hide when on class select landing */}
        {!isClassSelect ? (
          <>
            <nav className="bg-white border-b border-gray-100 flex justify-start px-8">
              {navItems.map((item) => {
                const isActive = 
                  currentView === item.id || 
                  (item.id === 'GRADES_LIST' && (currentView === 'STUDENT_GRADES' || currentView === 'GRADES_LIST')) ||
                  (item.id === 'METRICS_LIST' && (currentView === 'STUDENT_METRICS' || currentView === 'METRICS_LIST')) ||
                  (item.id === 'ASSIGNMENT_LIST' && (currentView === 'ASSIGNMENT_VIEW' || currentView === 'ASSIGNMENT_EDIT'));

                return (
                  <button
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    className={`px-12 py-3 text-sm font-medium transition-colors border-b-4 ${
                      isActive 
                      ? 'text-black' 
                      : 'text-gray-500 hover:text-gray-700'
                    }`}
                    style={{ 
                      backgroundColor: isActive ? COLORS.primary : 'transparent',
                      borderColor: isActive ? COLORS.primary : 'transparent'
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
            {/* Teacher class subtab: Home | Info */}
            {role === UserRole.TEACHER && selectedClass && (
              <nav className="bg-gray-50 border-b border-gray-100 flex justify-start px-8 py-2 gap-1">
                <button
                  type="button"
                  onClick={() => onViewChange('HOME')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    currentView === 'HOME' ? 'bg-white text-black shadow-sm border border-gray-200' : 'text-gray-600 hover:text-black hover:bg-white/70'
                  }`}
                >
                  Home
                </button>
                <button
                  type="button"
                  onClick={() => onViewChange('CLASS_INFO')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    currentView === 'CLASS_INFO' ? 'bg-white text-black shadow-sm border border-gray-200' : 'text-gray-600 hover:text-black hover:bg-white/70'
                  }`}
                >
                  Info
                </button>
              </nav>
            )}
          </>
        ) : null}
      </div>

      {/* Main Content */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
};

export default Layout;
