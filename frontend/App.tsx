import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Login from './components/Login';
import ClassSelect from './components/ClassSelect';
import ClassInfo from './components/ClassInfo';
import AssignmentView from './components/AssignmentView';
import AssignmentEditor from './components/AssignmentEditor';
import { ViewState, UserSession, Assignment, ClassSummary } from './types';
import { BookOpen, Trash2 } from './components/Icons';
import { fetchClassAssignments } from './services/api';

const ASSIGNMENT_CATEGORIES: { label: string; types: string[] }[] = [
  { label: 'Exams', types: ['Exam', 'Quiz'] },
  { label: 'Assignments', types: ['Homework'] },
  { label: 'Labs', types: ['Lab'] },
  { label: 'Projects', types: ['Project'] },
];

function mapApiAssignmentToAssignment(row: {
  assignment_id: number;
  assignment_name: string;
  description?: string | null;
  type?: string | null;
  max_points?: number;
  due_date?: string | null;
}): Assignment {
  const typeStr = (row.type || 'homework').toLowerCase();
  const typeMap: Record<string, string> = {
    homework: 'Homework',
    quiz: 'Quiz',
    project: 'Project',
    lab: 'Lab',
    exam: 'Exam',
    essay: 'Homework',
  };
  const due = row.due_date
    ? new Date(row.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';
  return {
    id: String(row.assignment_id),
    title: row.assignment_name,
    description: row.description || undefined,
    type: typeMap[typeStr] || typeStr,
    dueDate: due,
    content: row.description || undefined,
  };
}

const App: React.FC = () => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [view, setView] = useState<ViewState>('LOGIN');
  const [selectedClass, setSelectedClass] = useState<ClassSummary | null>(null);
  const [classAssignments, setClassAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  useEffect(() => {
    if (!selectedClass) {
      setClassAssignments([]);
      return;
    }
    let cancelled = false;
    fetchClassAssignments(selectedClass.class_id)
      .then((rows) => {
        if (!cancelled) setClassAssignments(rows.map(mapApiAssignmentToAssignment));
      })
      .catch(() => {
        if (!cancelled) setClassAssignments([]);
      });
    return () => { cancelled = true; };
  }, [selectedClass?.class_id]);

  const handleLogin = (newSession: UserSession) => {
    setSession(newSession);
    setView('CLASS_SELECT');
    setSelectedClass(null);
  };

  const handleLogout = () => {
    setSession(null);
    setView('LOGIN');
    setSelectedClass(null);
    setSelectedAssignment(null);
  };

  const handleSelectClass = (cls: ClassSummary) => {
    setSelectedClass(cls);
    setView('ASSIGNMENT_LIST');
  };

  const handleBackToClasses = () => {
    setSelectedClass(null);
    setView('CLASS_SELECT');
    setSelectedAssignment(null);
  };

  const handleDeleteAssignment = (assignmentId: string) => {
    // TODO: call delete API endpoint when backend is ready
    setClassAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
  };

  const renderAssignmentList = () => (
    <div className="space-y-10 animate-fadeIn">
      <h2 className="text-4xl font-bold text-black">Assignments</h2>

      {ASSIGNMENT_CATEGORIES.map(({ label, types }) => {
        const items = classAssignments.filter((a) => types.includes(a.type));
        return (
          <div key={label} className="space-y-3">
            {/* Category header */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
              <h3 className="text-lg font-semibold text-gray-700">{label}</h3>
              <button
                type="button"
                onClick={() => setView('ASSIGNMENT_EDIT')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors"
              >
                <span className="text-base leading-none">+</span> Add
              </button>
            </div>

            {/* Assignment rows */}
            {items.length === 0 ? (
              <p className="text-gray-400 text-sm italic px-1">No {label.toLowerCase()} yet.</p>
            ) : (
              <div className="space-y-2">
                {items.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm hover:shadow-md transition-all group"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAssignment(a);
                        setView('ASSIGNMENT_VIEW');
                      }}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center text-red-400 shrink-0 group-hover:bg-red-400 group-hover:text-white transition-all">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-black group-hover:text-red-500 transition-colors truncate">
                          {a.title}
                        </p>
                        {a.dueDate && (
                          <p className="text-xs text-gray-500 mt-0.5">Due: {a.dueDate}</p>
                        )}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAssignment(a.id)}
                      className="ml-4 p-2 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                      title="Delete assignment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  if (!session || view === 'LOGIN') {
    return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (view) {
      case 'CLASS_SELECT':
        return (
          <ClassSelect
            userId={session.userId!}
            onSelectClass={handleSelectClass}
          />
        );
      case 'CLASS_INFO':
        return selectedClass ? <ClassInfo classInfo={selectedClass} /> : null;
      case 'ASSIGNMENT_LIST':
        return renderAssignmentList();
      case 'ASSIGNMENT_EDIT':
        return (
          <AssignmentEditor
            classId={selectedClass?.class_id ?? 0}
            teacherId={session.userId ?? 0}
          />
        );
      case 'ASSIGNMENT_VIEW':
        return selectedAssignment
          ? <AssignmentView assignment={selectedAssignment} onViewTeacherMode={() => setView('ASSIGNMENT_EDIT')} />
          : null;
      default:
        return null;
    }
  };

  return (
    <Layout
      currentView={view}
      onViewChange={setView}
      onLogout={handleLogout}
      selectedClass={selectedClass}
      onBackToClasses={handleBackToClasses}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
