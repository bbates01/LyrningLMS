
import React from 'react';
import { Student, Assignment } from '../types';
import { MOCK_ASSIGNMENTS, COLORS } from '../constants';

interface StudentGradesProps {
  student: Student;
}

const StudentGrades: React.FC<StudentGradesProps> = ({ student }) => {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <h2 className="text-4xl font-bold text-gray-900">Student Grades: {student.name}</h2>
        <img src={student.avatar} className="w-12 h-12 rounded-full" alt={student.name} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 h-full">
            <h3 className="text-2xl font-bold mb-8 text-gray-900">Grades:</h3>
            
            <div className="space-y-8">
              <div>
                <div className="text-7xl font-bold text-green-600">91% (A-)</div>
                <div className="text-xl text-gray-600">Overall Grade</div>
              </div>

              <div>
                <div className="text-7xl font-bold text-green-600">98%</div>
                <div className="text-xl text-gray-600">Assignments</div>
              </div>

              <div>
                <div className="text-7xl font-bold text-green-600">85%</div>
                <div className="text-xl text-gray-600">Exams</div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-gray-50 rounded-2xl p-8 border border-gray-100">
          <h3 className="text-xl font-bold mb-6 text-gray-900">Assignments — {student.name}</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-gray-500 text-sm border-b border-gray-200">
                  <th className="pb-4 font-semibold">Assignment</th>
                  <th className="pb-4 font-semibold">Type</th>
                  <th className="pb-4 font-semibold">Due Date</th>
                  <th className="pb-4 font-semibold">Score</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {MOCK_ASSIGNMENTS.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-white transition-colors">
                    <td className="py-3 font-medium">{item.title}</td>
                    <td className="py-3">{item.type}</td>
                    <td className="py-3">{item.dueDate}</td>
                    <td className="py-3 font-bold">{item.score || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentGrades;
