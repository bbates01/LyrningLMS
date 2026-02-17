import React, { useState } from 'react';
import Layout from './components/Layout';
import Login from './components/Login';
import StudentMetrics from './components/StudentMetrics';
import StudentGrades from './components/StudentGrades';
import AssignmentView from './components/AssignmentView';
import AssignmentEditor from './components/AssignmentEditor';
import { UserRole, ViewState, Student, UserSession, Assignment } from './types';
import { MOCK_STUDENTS, MOCK_ASSIGNMENTS } from './constants';
import { BookOpen, CheckCircle2 } from './components/Icons';

const App: React.FC = () => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [view, setView] = useState<ViewState>('LOGIN');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(MOCK_STUDENTS[0]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  const handleLogin = (newSession: UserSession) => {
    setSession(newSession);
    setView('HOME');
    if (newSession.role === UserRole.STUDENT) {
      setSelectedStudent(newSession.studentData || MOCK_STUDENTS[0]);
    }
  };

  const handleLogout = () => {
    setSession(null);
    setView('LOGIN');
    setSelectedAssignment(null);
  };

  const toggleRole = () => {
    if (!session) return;
    const newRole = session.role === UserRole.TEACHER ? UserRole.STUDENT : UserRole.TEACHER;
    setSession({ 
      ...session, 
      role: newRole,
      studentData: newRole === UserRole.STUDENT ? MOCK_STUDENTS[0] : undefined
    });
  };

  const navigateToAssignment = (id: string) => {
    const assignment = MOCK_ASSIGNMENTS.find(a => a.id === id);
    if (assignment) {
      setSelectedAssignment(assignment);
      setView('ASSIGNMENT_VIEW');
    }
  };

  const renderHome = () => (
    <div className="space-y-8 animate-fadeIn">
      <div className="space-y-2">
        <h2 className="text-4xl font-bold text-black">Algebra II - Period 3</h2>
        <p className="text-2xl font-bold text-black">This week</p>
      </div>

      <div className="space-y-12 mt-12">
        {/* Monday */}
        <div className="space-y-4">
          <h3 className="text-xl text-gray-500 border-b border-gray-300 pb-2">Monday</h3>
          <div className="space-y-4">
             <div>
                <span className="italic text-black font-semibold">Description:</span>
                <p className="text-gray-700 mt-1">Review core algebra skills, including order of operations and solving basic linear equations to establish a strong foundation for the week.</p>
             </div>
             <div className="space-y-2">
                <span className="italic text-black font-semibold">Roadmap:</span>
                <div className="bg-gray-50 rounded-2xl p-6 space-y-3">
                  <button 
                    onClick={() => navigateToAssignment('active1')}
                    className="flex items-center gap-3 text-black hover:text-red-500 hover:underline transition-all text-left w-full font-medium"
                  >
                    <CheckCircle2 className="w-5 h-5 text-gray-400" /> Solving Linear Equations Practice
                  </button>
                  <button 
                    onClick={() => navigateToAssignment('hw1')}
                    className="flex items-center gap-3 text-black hover:text-red-500 hover:underline transition-all text-left w-full font-medium"
                  >
                    <CheckCircle2 className="w-5 h-5 text-gray-400" /> Order of Operations Review
                  </button>
                  {session?.role === UserRole.TEACHER && (
                    <div className="flex items-center gap-3 text-gray-500 cursor-pointer hover:text-gray-700 transition-colors">
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center text-[10px]">+</div> 
                      Add roadmap item
                    </div>
                  )}
                </div>
             </div>
          </div>
        </div>

        {/* Wednesday */}
        <div className="space-y-4">
          <h3 className="text-xl text-gray-500 border-b border-gray-300 pb-2">Wednesday</h3>
          <div className="space-y-4">
             <div>
                <span className="italic text-black font-semibold">Description:</span>
                <p className="text-gray-700 mt-1">Students practice graphing linear equations and explore slope as a rate of change using tables, graphs, and equations.</p>
             </div>
             <div className="space-y-2">
                <span className="italic text-black font-semibold">Roadmap:</span>
                <div className="bg-gray-50 rounded-2xl p-6 space-y-3">
                  <button 
                    onClick={() => navigateToAssignment('hw2')}
                    className="flex items-center gap-3 text-black hover:text-red-500 hover:underline transition-all text-left w-full font-medium"
                  >
                    <CheckCircle2 className="w-5 h-5 text-gray-400" /> Writing Equations from Graphs
                  </button>
                  <button 
                    onClick={() => navigateToAssignment('hw3')}
                    className="flex items-center gap-3 text-black hover:text-red-500 hover:underline transition-all text-left w-full font-medium"
                  >
                    <CheckCircle2 className="w-5 h-5 text-gray-400" /> Slope-Intercept Form Practice
                  </button>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStudentList = (targetView: ViewState) => {
    if (session?.role === UserRole.STUDENT) {
      if (targetView === 'GRADES_LIST') return <StudentGrades student={session.studentData!} />;
      return <StudentMetrics student={session.studentData!} />;
    }

    return (
      <div className="space-y-8 animate-fadeIn">
        <h2 className="text-4xl font-bold text-black">
          {targetView === 'GRADES_LIST' ? 'Student Grades' : 'Student Metrics'}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[0, 1].map(col => (
            <div key={col} className="bg-gray-50 rounded-2xl p-8 border border-gray-100 space-y-4">
              {MOCK_STUDENTS.slice(col * 20, (col + 1) * 20).map(s => (
                <div 
                  key={s.id} 
                  onClick={() => {
                    setSelectedStudent(s);
                    setView(targetView === 'GRADES_LIST' ? 'STUDENT_GRADES' : 'STUDENT_METRICS');
                  }}
                  className="text-lg text-black hover:text-red-500 cursor-pointer transition-colors font-medium"
                >
                  {s.name} – {s.course} ({s.period})
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAssignmentList = () => (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-bold text-black">Assignments</h2>
        {session?.role === UserRole.TEACHER && (
          <button 
            onClick={() => setView('ASSIGNMENT_EDIT')}
            className="px-6 py-2 bg-gray-200 text-black border border-gray-300 rounded-full hover:bg-gray-300 transition-colors flex items-center gap-2 font-medium"
          >
            Create New
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_ASSIGNMENTS.map(a => (
          <div 
            key={a.id}
            onClick={() => {
              setSelectedAssignment(a);
              setView('ASSIGNMENT_VIEW');
            }}
            className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col h-full"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-400 group-hover:bg-red-400 group-hover:text-white transition-all">
                <BookOpen className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold text-black uppercase tracking-widest bg-gray-100 px-2 py-1 rounded border border-gray-200">{a.type}</span>
            </div>
            <h3 className="text-xl font-bold mb-2 text-black group-hover:text-red-500 transition-colors">{a.title}</h3>
            {a.description && (
              <p className="text-gray-700 text-sm mb-4 line-clamp-2 flex-grow">
                {a.description}
              </p>
            )}
            <div className="pt-4 border-t border-gray-50 flex justify-between items-center mt-auto">
              <p className="text-black text-xs font-bold uppercase tracking-tighter">Due: {a.dueDate}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (!session || view === 'LOGIN') {
    return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (view) {
      case 'HOME': return renderHome();
      case 'GRADES_LIST': return renderStudentList('GRADES_LIST');
      case 'METRICS_LIST': return renderStudentList('METRICS_LIST');
      case 'STUDENT_METRICS': return selectedStudent ? <StudentMetrics student={selectedStudent} /> : null;
      case 'STUDENT_GRADES': return selectedStudent ? <StudentGrades student={selectedStudent} /> : null;
      case 'ASSIGNMENT_LIST': return renderAssignmentList();
      case 'ASSIGNMENT_EDIT': return session.role === UserRole.TEACHER ? <AssignmentEditor /> : renderAssignmentList();
      case 'ASSIGNMENT_VIEW': 
        const assignmentToShow = selectedAssignment || MOCK_ASSIGNMENTS[MOCK_ASSIGNMENTS.length - 1];
        return <AssignmentView assignment={assignmentToShow} onViewTeacherMode={() => setView('ASSIGNMENT_EDIT')} />;
      default: return renderHome();
    }
  };

  return (
    <Layout 
      role={session.role} 
      currentView={view} 
      onViewChange={setView} 
      onRoleToggle={toggleRole}
      onLogout={handleLogout}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;