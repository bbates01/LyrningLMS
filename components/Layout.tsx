
import React from 'react';
import { Home, GraduationCap, BookOpen, MessageSquare, ChevronDown } from './Icons';
import { UserRole, ViewState } from '../types';
import { COLORS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  role: UserRole;
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
  onRoleToggle: () => void;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, role, currentView, onViewChange, onRoleToggle, onLogout }) => {
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
              onClick={() => onViewChange('HOME')}
            >
              <svg viewBox="0 0 24 24" fill="black" className="w-6 h-6">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold" style={{ color: '#333' }}>Lyrning</h1>
            <div className="h-8 w-[1px] bg-gray-300 mx-2"></div>
            <span className="text-gray-600 font-medium">Winter 2026 - Algebra II</span>
          </div>

          <div className="flex items-center gap-4">
            {role === UserRole.TEACHER && (
              <button 
                onClick={onRoleToggle}
                className="text-xs px-2 py-1 bg-gray-100 rounded text-black hover:bg-gray-200 transition-colors font-medium border border-gray-200"
              >
                Switch Role
              </button>
            )}
            <div className="flex items-center gap-2 group relative cursor-pointer">
              <img 
                src={role === UserRole.TEACHER ? "https://picsum.photos/seed/teacher/100" : "https://picsum.photos/seed/student/100"} 
                alt="Profile" 
                className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
              />
              <ChevronDown className="w-4 h-4 text-gray-400" />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 hidden group-hover:block transition-all">
                <button 
                  onClick={onLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-50 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Navigation */}
        <nav className="bg-white border-b border-gray-100 flex justify-start px-8">
          {navItems.map((item) => {
            // Logic for active state
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
      </div>

      {/* Main Content */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
};

export default Layout;
