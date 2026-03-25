
import React, { useEffect, useState, useMemo } from 'react';
import { fetchClassAssignments, fetchStudentAssignment } from '../services/api';

interface StudentGradesProps {
  classId: number;
  studentName: string;
  studentAvatar?: string;
  token: string;
}

interface AssignmentWithGrade {
  assignmentId: number;
  assignmentName: string;
  type: string | null;
  dueDate: string | null;
  maxPoints: number;
  pointsEarned: number | null;
  percentage: number | null;
  letterGrade: string | null;
}

const StudentGrades: React.FC<StudentGradesProps> = ({
  classId,
  studentName,
  studentAvatar,
  token,
}) => {
  const [assignments, setAssignments] = useState<AssignmentWithGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadGrades = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetch all assignments for this class
        const assignmentRows = await fetchClassAssignments(classId);

        // Fetch grade for each assignment
        const gradesData = await Promise.all(
          assignmentRows.map(async (assignment) => {
            try {
              const payload = await fetchStudentAssignment(
                classId,
                assignment.assignment_id,
                token
              );
              return {
                assignmentId: assignment.assignment_id,
                assignmentName: assignment.assignment_name,
                type: assignment.type || null,
                dueDate: assignment.due_date || null,
                maxPoints: assignment.max_points || 100,
                pointsEarned: payload.grade?.pointsEarned ?? null,
                percentage: payload.grade?.percentage ?? null,
                letterGrade: payload.grade?.letterGrade ?? null,
              };
            } catch {
              // If unable to fetch grade, include assignment with null grades
              return {
                assignmentId: assignment.assignment_id,
                assignmentName: assignment.assignment_name,
                type: assignment.type || null,
                dueDate: assignment.due_date || null,
                maxPoints: assignment.max_points || 100,
                pointsEarned: null,
                percentage: null,
                letterGrade: null,
              };
            }
          })
        );

        setAssignments(gradesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load grades');
      } finally {
        setLoading(false);
      }
    };

    loadGrades();
  }, [classId, token]);

  // Calculate overall statistics
  const stats = useMemo(() => {
    const gradesWithScores = assignments.filter((a) => a.percentage !== null);
    if (gradesWithScores.length === 0) {
      return {
        overallPercentage: null,
        overallLetter: null,
        assignmentAvg: null,
      };
    }

    const totalPercentage =
      gradesWithScores.reduce((sum, a) => sum + (a.percentage || 0), 0) /
      gradesWithScores.length;
    const letterMap: Record<number, string> = {
      93: 'A',
      90: 'A-',
      87: 'B+',
      83: 'B',
      80: 'B-',
      77: 'C+',
      73: 'C',
      70: 'C-',
      67: 'D+',
      63: 'D',
      60: 'D-',
      0: 'F',
    };
    let letter = 'F';
    for (const [threshold, grade] of Object.entries(letterMap).sort(
      (a, b) => parseInt(b[0]) - parseInt(a[0])
    )) {
      if (totalPercentage >= parseInt(threshold)) {
        letter = grade;
        break;
      }
    }

    return {
      overallPercentage: Math.round(totalPercentage),
      overallLetter: letter,
      assignmentAvg: Math.round(totalPercentage),
    };
  }, [assignments]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <h2 className="text-4xl font-bold text-gray-900">Student Grades: {studentName}</h2>
          {studentAvatar && (
            <img
              src={studentAvatar}
              className="w-12 h-12 rounded-full"
              alt={studentName}
            />
          )}
        </div>
        <div className="text-gray-600">Loading grades...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <h2 className="text-4xl font-bold text-gray-900">Student Grades: {studentName}</h2>
          {studentAvatar && (
            <img
              src={studentAvatar}
              className="w-12 h-12 rounded-full"
              alt={studentName}
            />
          )}
        </div>
        <div className="text-red-600">Error loading grades: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <h2 className="text-4xl font-bold text-gray-900">Student Grades: {studentName}</h2>
        {studentAvatar && (
          <img
            src={studentAvatar}
            className="w-12 h-12 rounded-full"
            alt={studentName}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 h-full">
            <h3 className="text-2xl font-bold mb-8 text-gray-900">Grades:</h3>

            <div className="space-y-8">
              <div>
                <div className="text-7xl font-bold text-green-600">
                  {stats.overallPercentage !== null
                    ? `${stats.overallPercentage}% (${stats.overallLetter})`
                    : 'N/A'}
                </div>
                <div className="text-xl text-gray-600">Overall Grade</div>
              </div>

              <div>
                <div className="text-7xl font-bold text-green-600">
                  {stats.assignmentAvg !== null ? `${stats.assignmentAvg}%` : 'N/A'}
                </div>
                <div className="text-xl text-gray-600">Assignment Average</div>
              </div>

              <div>
                <div className="text-7xl font-bold text-green-600">
                  {assignments.length}
                </div>
                <div className="text-xl text-gray-600">Total Assignments</div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-gray-50 rounded-2xl p-8 border border-gray-100">
          <h3 className="text-xl font-bold mb-6 text-gray-900">
            Assignments — {studentName}
          </h3>

          {assignments.length === 0 ? (
            <div className="text-gray-600">No assignments yet for this class.</div>
          ) : (
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
                  {assignments.map((item) => (
                    <tr
                      key={item.assignmentId}
                      className="border-b border-gray-100 last:border-0 hover:bg-white transition-colors"
                    >
                      <td className="py-3 font-medium">{item.assignmentName}</td>
                      <td className="py-3">{item.type || 'Assignment'}</td>
                      <td className="py-3">{item.dueDate || 'N/A'}</td>
                      <td className="py-3 font-bold">
                        {item.pointsEarned !== null && item.percentage !== null
                          ? `${item.pointsEarned}/${item.maxPoints} (${item.percentage}%, ${item.letterGrade})` 
                          : 'Pending'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentGrades;
