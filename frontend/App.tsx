import React, { useState, useEffect, useRef, useCallback } from 'react';
import Layout from './components/Layout';
import Login from './components/Login';
import ClassSelect from './components/ClassSelect';
import ClassInfo from './components/ClassInfo';
import AssignmentView from './components/AssignmentView';
import AssignmentEditor from './components/AssignmentEditor';
import StudentLogin from './components/StudentLogin';
import StudentAssignmentPage from './components/StudentAssignmentPage';
import TeacherStudentPreview from './components/TeacherStudentPreview';
import TeacherGrades from './components/TeacherGrades';
import TeacherMetrics from './components/TeacherMetrics';
import AdminLogin from './components/AdminLogin';
import AdminLayout from './components/AdminLayout';
import AdminClassSelect from './components/AdminClassSelect';
import AdminClassDetail from './components/AdminClassDetail';
import AdminGlobalMetrics from './components/AdminGlobalMetrics';
import Home from './components/Home';
import Contact from './components/Contact';
import { ViewState, UserSession, Assignment, ClassSummary, UserRole } from './types';
import { BookOpen, Trash2 } from './components/Icons';
import { fetchClassAssignments, fetchAssignmentQuestions, deleteAssignment, updateAssignment, type AssignmentQuestionPreview } from './services/api';

const SESSION_STORAGE_KEY = 'lyrning_session';

function loadStoredSession(): UserSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (!data || typeof data.role !== 'string') return null;
    if (data.role === 'ADMIN') {
      if (typeof data.adminToken !== 'string' || data.userId == null) return null;
      return {
        role: UserRole.ADMIN,
        userId: Number(data.userId),
        userName: typeof data.userName === 'string' ? data.userName : undefined,
        adminToken: data.adminToken,
      };
    }
    if (data.userId != null) return data as unknown as UserSession;
  } catch {
    // ignore
  }
  return null;
}

function getInitialView(): ViewState {
  const s = loadStoredSession();
  if (s?.role === UserRole.ADMIN) return 'ADMIN_CLASS_SELECT';
  if (s) return 'CLASS_SELECT';
  return 'LOGIN';
}

const ASSIGNMENT_CATEGORIES: { label: string; types: string[]; createTypeDb: string }[] = [
  // Note: "Exams" shows both Exam + Quiz. We default new items to `quiz`.
  { label: 'Exams', types: ['Exam', 'Quiz'], createTypeDb: 'quiz' },
  { label: 'Assignments', types: ['Homework'], createTypeDb: 'homework' },
  { label: 'Labs', types: ['Lab'], createTypeDb: 'lab' },
  { label: 'Projects', types: ['Project'], createTypeDb: 'project' },
];

function mapApiAssignmentToAssignment(row: {
  assignment_id: number;
  assignment_name: string;
  description?: string | null;
  type?: string | null;
  max_points?: number;
  due_date?: string | null;
  assignment_link?: string | null;
  ai_params?: string | null;
  allowed_submissions?: number;
  attempt_scoring_policy?: 'latest' | 'highest' | 'average' | string | null;
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
    dueDateRaw: row.due_date ?? null,
    content: row.description || undefined,
    assignmentLink: row.assignment_link || undefined,
    aiInstructions: row.ai_params || undefined,
    maxPoints: row.max_points ?? 100,
    allowedSubmissions: row.allowed_submissions ?? 1,
    attemptScoringPolicy:
      row.attempt_scoring_policy === 'highest' || row.attempt_scoring_policy === 'average'
        ? row.attempt_scoring_policy
        : 'latest',
  };
}

function studentLoginUrl(classId: number, assignmentId: string | number): string {
  return `${window.location.origin}/student/login?class=${classId}&assignment=${assignmentId}`;
}

function CopyStudentLinkButton({ classId, assignmentId }: { classId: number; assignmentId: string | number }) {
  const [copied, setCopied] = useState(false);
  const fullUrl = studentLoginUrl(classId, assignmentId);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = fullUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`ml-2 p-2 rounded-lg transition-colors shrink-0 ${
        copied ? 'text-green-500 bg-green-50' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'
      }`}
      title={copied ? 'Copied!' : 'Copy student link'}
    >
      {copied ? (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      )}
    </button>
  );
}

const App: React.FC = () => {
  const [session, setSession] = useState<UserSession | null>(() => loadStoredSession());
  const [view, setView] = useState<ViewState>(getInitialView);
  const [selectedClass, setSelectedClass] = useState<ClassSummary | null>(null);
  const [classAssignments, setClassAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [assignmentQuestions, setAssignmentQuestions] = useState<AssignmentQuestionPreview[]>([]);
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteAssignmentError, setDeleteAssignmentError] = useState('');
  const [createdClassId, setCreatedClassId] = useState<number | null>(null);
  const [createdAssignmentId, setCreatedAssignmentId] = useState<number | null>(null);
  const [newAssignmentTypeDb, setNewAssignmentTypeDb] = useState<string>('homework');
  const isRestoringFromHistory = useRef(false);

  const refetchClassAssignments = useCallback(() => {
    if (!selectedClass) return;
    fetchClassAssignments(selectedClass.class_id)
      .then((rows) => setClassAssignments(rows.map(mapApiAssignmentToAssignment)))
      .catch(() => setClassAssignments([]));
  }, [selectedClass?.class_id]);

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

  // Sync app state with browser history so back/forward work in-app
  useEffect(() => {
    if (!session || view === 'LOGIN') return;
    if (session.role === UserRole.ADMIN) return;
    if (isRestoringFromHistory.current) {
      isRestoringFromHistory.current = false;
      return;
    }
    const state = {
      view,
      classId: selectedClass?.class_id ?? null,
      assignmentId: selectedAssignment?.id ?? null,
    };
    const current = window.history.state as { view?: string } | null;
    if (!current || typeof current.view === 'undefined') {
      window.history.replaceState(state, '', window.location.href);
    } else {
      window.history.pushState(state, '', window.location.href);
    }
  }, [session, view, selectedClass?.class_id, selectedAssignment?.id]);

  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      if (session?.role === UserRole.ADMIN) return;
      const s = e.state as { view?: ViewState; classId?: number | null; assignmentId?: string | null } | null;
      if (!s?.view) return;
      isRestoringFromHistory.current = true;
      setView(s.view);
      if (s.view === 'CLASS_SELECT') {
        setSelectedClass(null);
        setSelectedAssignment(null);
      } else {
        if (s.view === 'ASSIGNMENT_VIEW' && s.assignmentId != null && s.assignmentId !== '') {
          setSelectedAssignment((prev) =>
            classAssignments.find((a) => a.id === String(s!.assignmentId)) ?? prev ?? null
          );
        } else {
          setSelectedAssignment(null);
        }
        if (s.view === 'ASSIGNMENT_LIST' && selectedClass) {
          refetchClassAssignments();
        }
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [classAssignments, selectedClass, refetchClassAssignments, session?.role]);

  useEffect(() => {
    if ((view !== 'ASSIGNMENT_VIEW' && view !== 'VIEW_AS_STUDENT') || !selectedAssignment || !selectedClass) {
      setAssignmentQuestions([]);
      return;
    }
    let cancelled = false;
    fetchAssignmentQuestions(selectedClass.class_id, Number(selectedAssignment.id))
      .then((q) => { if (!cancelled) setAssignmentQuestions(q); })
      .catch(() => { if (!cancelled) setAssignmentQuestions([]); });
    return () => { cancelled = true; };
  }, [view, selectedAssignment?.id, selectedClass?.class_id]);

  const handleTeacherLogin = (newSession: UserSession) => {
    setSession(newSession);
    setView('CLASS_SELECT');
    setSelectedClass(null);
  };

  const handleAdminLogin = (newSession: UserSession) => {
    setSession(newSession);
    setView('ADMIN_CLASS_SELECT');
    setSelectedClass(null);
  };

  const handleAdminSelectClass = (cls: ClassSummary) => {
    setSelectedClass(cls);
    setView('ADMIN_CLASS_DETAIL');
  };

  const handleAdminBackToClasses = () => {
    setSelectedClass(null);
    setView('ADMIN_CLASS_SELECT');
  };

  const handleLogout = () => {
    try {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // ignore
    }
    setSession(null);
    setView('LOGIN');
    setSelectedClass(null);
    setSelectedAssignment(null);
    window.history.replaceState({}, '', '/');
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

  const handleDeleteAssignmentClick = (assignment: Assignment) => {
    setDeleteAssignmentError('');
    setAssignmentToDelete(assignment);
  };

  const handleDeleteAssignmentConfirm = async () => {
    if (!assignmentToDelete || !selectedClass) return;
    setIsDeleting(true);
    setDeleteAssignmentError('');
    try {
      const res = await deleteAssignment(selectedClass.class_id, Number(assignmentToDelete.id));
      if (res.success) {
        setClassAssignments((prev) => prev.filter((a) => a.id !== assignmentToDelete.id));
        setAssignmentToDelete(null);
        if (selectedAssignment?.id === assignmentToDelete.id) setSelectedAssignment(null);
      } else {
        setDeleteAssignmentError(res.error || 'Failed to delete assignment.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const renderAssignmentList = () => (
    <div className="space-y-10 animate-fadeIn">
      <h2 className="text-4xl font-bold text-black">Assignments</h2>

      {ASSIGNMENT_CATEGORIES.map(({ label, types, createTypeDb }) => {
        const items = classAssignments.filter((a) => types.includes(a.type));
        return (
          <div key={label} className="space-y-3">
            {/* Category header */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
              <h3 className="text-lg font-semibold text-gray-700">{label}</h3>
              <button
                type="button"
                onClick={() => {
                  setNewAssignmentTypeDb(createTypeDb);
                  setView('ASSIGNMENT_EDIT');
                }}
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
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all bg-[#ba3638]/10 text-[#ba3638] group-hover:bg-[#ba3638] group-hover:text-white">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-black transition-colors truncate group-hover:text-[#ba3638]">
                          {a.title}
                        </p>
                        {a.dueDate && (
                          <p className="text-xs text-gray-500 mt-0.5">Due: {a.dueDate}</p>
                        )}
                      </div>
                    </button>
                    {selectedClass && (
                      <CopyStudentLinkButton classId={selectedClass.class_id} assignmentId={a.id} />
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteAssignmentClick(a)}
                      className="ml-2 p-2 text-gray-300 hover:text-red-500 transition-colors shrink-0"
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

  if (window.location.pathname === '/student/login') {
    return <StudentLogin />;
  }

  const studentAssignmentMatch = window.location.pathname.match(/^\/student\/assignment\/(\d+)\/(\d+)$/);
  if (studentAssignmentMatch) {
    const classId = Number(studentAssignmentMatch[1]);
    const assignmentId = Number(studentAssignmentMatch[2]);
    if (Number.isFinite(classId) && Number.isFinite(assignmentId)) {
      return <StudentAssignmentPage classId={classId} assignmentId={assignmentId} />;
    }
  }

  if (window.location.pathname === '/contact') {
    return <Contact />;
  }

  if (session?.role === UserRole.ADMIN && session.adminToken) {
    return (
      <AdminLayout
        currentView={view}
        onViewChange={setView}
        onLogout={handleLogout}
        selectedClass={selectedClass}
        onBackToClasses={handleAdminBackToClasses}
        onOpenGlobalMetrics={() => {
          setSelectedClass(null);
          setView('ADMIN_GLOBAL_METRICS');
        }}
      >
        {view === 'ADMIN_CLASS_SELECT' && (
          <AdminClassSelect adminToken={session.adminToken} onSelectClass={handleAdminSelectClass} />
        )}
        {view === 'ADMIN_CLASS_DETAIL' && selectedClass && (
          <AdminClassDetail classId={selectedClass.class_id} adminToken={session.adminToken} />
        )}
        {view === 'ADMIN_GLOBAL_METRICS' && <AdminGlobalMetrics adminToken={session.adminToken} />}
      </AdminLayout>
    );
  }

  if (window.location.pathname === '/admin') {
    return <AdminLogin onLogin={handleAdminLogin} />;
  }

  if (window.location.pathname === '/login') {
    return <Login onLogin={handleTeacherLogin} />;
  }

  if (!session || view === 'LOGIN') {
    return <Home />;
  }

  const renderContent = () => {
    switch (view) {
      case 'CLASS_SELECT':
        return (
          <ClassSelect
            userId={session.userId!}
            onSelectClass={handleSelectClass}
            onClassCreated={handleSelectClass}
          />
        );
      case 'GRADES':
        return selectedClass ? <TeacherGrades classId={selectedClass.class_id} teacherId={session.userId ?? 0} /> : null;
      case 'METRICS':
        return selectedClass ? <TeacherMetrics classId={selectedClass.class_id} /> : null;
      case 'CLASS_INFO':
        return selectedClass ? (
          <ClassInfo
            classInfo={selectedClass}
            teacherId={session.userId ?? 0}
            teacherUsername={session.userName}
            onClassUpdated={(updatedClass) => setSelectedClass(updatedClass)}
            onClassDeleted={() => {
              setSelectedClass(null);
              setSelectedAssignment(null);
              setClassAssignments([]);
              setView('CLASS_SELECT');
            }}
          />
        ) : null;
      case 'ASSIGNMENT_LIST':
        return renderAssignmentList();
      case 'ASSIGNMENT_EDIT':
        return (
          <AssignmentEditor
            classId={selectedClass?.class_id ?? 0}
            teacherId={session.userId ?? 0}
            assignmentType={newAssignmentTypeDb}
            onAssignmentCreated={(classId, assignmentId) => {
              setCreatedClassId(classId);
              setCreatedAssignmentId(assignmentId);
              setView('ASSIGNMENT_CREATE_SUCCESS');
            }}
          />
        );
      case 'ASSIGNMENT_VIEW':
        return selectedAssignment && selectedClass
          ? (
            <AssignmentView
              assignment={selectedAssignment}
              classId={selectedClass.class_id}
              onViewAsStudent={() => setView('VIEW_AS_STUDENT')}
              onSaveAssignment={async (updates) => {
                if (!session.userId) return { success: false, error: 'Missing teacher session' };
                const res = await updateAssignment(
                  selectedClass.class_id,
                  Number(selectedAssignment.id),
                  {
                    teacherId: session.userId,
                    assignmentName: updates.assignmentName,
                    description: updates.description,
                    dueDate: updates.noDueDate ? '' : updates.dueDate,
                    aiParams: updates.aiParams,
                    maxPoints: updates.maxPoints,
                    allowedSubmissions: updates.allowedSubmissions,
                    attemptScoringPolicy: updates.attemptScoringPolicy,
                  }
                );
                if (!res.success) return { success: false, error: res.error || 'Failed to update assignment' };
                await refetchClassAssignments();
                return { success: true };
              }}
              questionsPreview={assignmentQuestions}
              onQuestionsUpdated={async () => {
                await refetchClassAssignments();
                const refreshedQuestions = await fetchAssignmentQuestions(selectedClass.class_id, Number(selectedAssignment.id));
                setAssignmentQuestions(refreshedQuestions);
              }}
            />
          )
          : null;
      case 'VIEW_AS_STUDENT':
        return selectedAssignment && selectedClass
          ? (
            <TeacherStudentPreview
              assignment={selectedAssignment}
              questionsPreview={assignmentQuestions}
              onBack={() => setView('ASSIGNMENT_VIEW')}
            />
          )
          : null;
      case 'ASSIGNMENT_CREATE_SUCCESS':
        return createdClassId != null && createdAssignmentId != null ? (
          <div className="space-y-6 max-w-xl">
            <h2 className="text-2xl font-bold text-gray-900">Assignment created</h2>
            <p className="text-gray-600">Share this link with students so they can open the assignment.</p>
            <div className="flex flex-wrap items-center gap-2 p-4 bg-gray-50 rounded-2xl border border-gray-200">
              <code className="flex-1 min-w-0 break-all text-sm text-gray-800">
                {studentLoginUrl(createdClassId, createdAssignmentId)}
              </code>
              <CopyStudentLinkButton classId={createdClassId} assignmentId={createdAssignmentId} />
            </div>
            <button
              type="button"
              onClick={() => {
                setCreatedClassId(null);
                setCreatedAssignmentId(null);
                refetchClassAssignments();
                setView('ASSIGNMENT_LIST');
              }}
              className="px-5 py-2.5 rounded-full bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
            >
              Back to assignments
            </button>
          </div>
        ) : (
          <div className="space-y-6 max-w-md">
            <h2 className="text-2xl font-bold text-gray-900">Assignment created</h2>
            <p className="text-gray-600">Your assignment has been saved.</p>
            <button
              type="button"
              onClick={() => { refetchClassAssignments(); setView('ASSIGNMENT_LIST'); }}
              className="px-5 py-2.5 rounded-full bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
            >
              Back to assignments
            </button>
          </div>
        );
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

      {assignmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !isDeleting && setAssignmentToDelete(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-gray-900 font-medium mb-2">Delete &quot;{assignmentToDelete.title}&quot; assignment?</p>
            <p className="text-sm text-gray-600 mb-4">This action cannot be undone.</p>
            {deleteAssignmentError && (
              <p className="text-sm font-medium mb-3" style={{ color: '#ba3638' }}>
                {deleteAssignmentError}
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setAssignmentToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-full border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
              >
                No
              </button>
              <button
                type="button"
                onClick={handleDeleteAssignmentConfirm}
                disabled={isDeleting}
                className="px-4 py-2 rounded-full text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#ba3638' }}
              >
                {isDeleting ? 'Deleting…' : 'Yes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
