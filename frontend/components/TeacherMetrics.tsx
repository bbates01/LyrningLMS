import React, { useEffect, useMemo, useState } from 'react';
import {
  fetchClassMetricStudents,
  fetchStudentMetricHistory,
  type ClassMetricStudentSummary,
  type StudentMetricHistoryPoint,
} from '../services/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface TeacherMetricsProps {
  classId: number;
}

type MetricKey = 'accuracy' | 'aiDependency' | 'understanding';
type MetricsLevel = 'student_list' | 'student_detail';
type SortField = 'name' | MetricKey;
type SortDirection = 'asc' | 'desc';

const METRIC_META: Record<MetricKey, { label: string; color: string }> = {
  accuracy: { label: 'Accuracy', color: '#2563eb' },
  aiDependency: { label: 'AI Dependency', color: '#dc2626' },
  understanding: { label: 'Understanding', color: '#16a34a' },
};

function metricBadgeClass(metric: MetricKey): string {
  if (metric === 'accuracy') return 'bg-blue-50 text-blue-700';
  if (metric === 'aiDependency') return 'bg-red-50 text-red-700';
  return 'bg-green-50 text-green-700';
}

function fmtScore(v: number | null): string {
  return v == null ? '--' : `${Math.round(v)}%`;
}

const TeacherMetrics: React.FC<TeacherMetricsProps> = ({ classId }) => {
  const STUDENTS_PER_PAGE = 8;
  const [level, setLevel] = useState<MetricsLevel>('student_list');
  const [students, setStudents] = useState<ClassMetricStudentSummary[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<ClassMetricStudentSummary | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('accuracy');
  const [showLearnMore, setShowLearnMore] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentPage, setStudentPage] = useState(1);
  const [history, setHistory] = useState<StudentMetricHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchClassMetricStudents(classId)
      .then((data) => {
        if (!cancelled) setStudents(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load metrics.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [classId]);

  const selectedStudentName = useMemo(() => {
    if (!selectedStudent) return '';
    return `${selectedStudent.firstName} ${selectedStudent.lastName}`;
  }, [selectedStudent]);

  const sortedStudents = useMemo(() => {
    const getNumericMetric = (s: ClassMetricStudentSummary, metric: MetricKey): number => {
      const val =
        metric === 'accuracy'
          ? s.currentWeek.accuracy
          : metric === 'aiDependency'
            ? s.currentWeek.aiDependency
            : s.currentWeek.understanding;
      // Put missing values at the end in asc and start in desc by mapping to +/-infinity.
      if (val == null) return sortDirection === 'asc' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
      return Number(val);
    };

    const search = studentSearch.trim().toLowerCase();
    const filtered = !search
      ? students
      : students.filter((s) => {
          const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
          return fullName.includes(search) || s.username.toLowerCase().includes(search);
        });

    return [...filtered].sort((a, b) => {
      if (sortField === 'name') {
        const aName = `${a.lastName}, ${a.firstName}`.toLowerCase();
        const bName = `${b.lastName}, ${b.firstName}`.toLowerCase();
        const cmp = aName.localeCompare(bName);
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      const aVal = getNumericMetric(a, sortField);
      const bVal = getNumericMetric(b, sortField);
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [students, sortField, sortDirection, studentSearch]);

  const totalStudentPages = Math.max(1, Math.ceil(sortedStudents.length / STUDENTS_PER_PAGE));

  const paginatedStudents = useMemo(() => {
    const start = (studentPage - 1) * STUDENTS_PER_PAGE;
    return sortedStudents.slice(start, start + STUDENTS_PER_PAGE);
  }, [sortedStudents, studentPage]);

  useEffect(() => {
    setStudentPage(1);
  }, [classId, sortField, sortDirection, studentSearch]);

  useEffect(() => {
    if (studentPage > totalStudentPages) {
      setStudentPage(totalStudentPages);
    }
  }, [studentPage, totalStudentPages]);

  const openStudentDetail = async (student: ClassMetricStudentSummary) => {
    setSelectedStudent(student);
    setLevel('student_detail');
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStudentMetricHistory(classId, student.studentId);
      setHistory(data.history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load student metrics.');
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const chartData = useMemo(() => {
    const recentHistory = history.slice(-8);
    return recentHistory.map((h, index) => ({
      weekLabel: `Week ${index + 1}`,
      value:
        selectedMetric === 'accuracy'
          ? h.accuracy
          : selectedMetric === 'aiDependency'
            ? h.aiDependency
            : h.understanding,
    }));
  }, [history, selectedMetric]);

  const lastThreeWeekAverages = useMemo(() => {
    const recent = history.slice(-3);
    const avg = (values: Array<number | null>) => {
      const nums = values.filter((v): v is number => v != null);
      if (nums.length === 0) return null;
      return nums.reduce((sum, n) => sum + n, 0) / nums.length;
    };
    return {
      understanding: avg(recent.map((h) => h.understanding)),
      aiDependency: avg(recent.map((h) => h.aiDependency)),
      accuracy: avg(recent.map((h) => h.accuracy)),
    };
  }, [history]);

  const learnMoreModal = showLearnMore ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => setShowLearnMore(false)}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-100 p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-bold text-black">How metrics work</h3>
          <button
            type="button"
            onClick={() => setShowLearnMore(false)}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            x
          </button>
        </div>
        <div className="space-y-3 text-sm text-gray-700">
          <div className="rounded-xl border border-gray-200 p-3">
            <p className="font-semibold text-gray-900">Accuracy</p>
            <p>
              Accuracy reflects how consistently a student gets answers correct on graded work. It is a performance
              signal focused on correctness and outcome quality across assignments.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 p-3">
            <p className="font-semibold text-gray-900">AI Dependency</p>
            <p>
              AI Dependency estimates how much a student leans on AI during the learning process. It is intended to
              capture reliance patterns, not just final correctness, so teachers can spot over-reliance or healthy use.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 p-3">
            <p className="font-semibold text-gray-900">Understanding</p>
            <p>
              Understanding measures learning growth across attempts. It increases when a student meaningfully improves
              from earlier attempts to later attempts, especially when that improvement is sustained.
            </p>
            <p>
              Concept:
              <span className="block mt-1 font-mono text-xs bg-gray-100 rounded px-2 py-1">
                Bigger jump from attempt 1 to later attempts = higher understanding
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  if (loading && level === 'student_list') {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-[#ba3638] rounded-full animate-spin" />
      </div>
    );
  }

  if (error && level === 'student_list') {
    return <p className="text-red-500 text-center py-10">{error}</p>;
  }

  if (level === 'student_list') {
    return (
      <>
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-4xl font-bold text-black">Metrics</h2>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search for student..."
                className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-700"
              />
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700"
                title="Sort by"
              >
                <option value="name">Sort: Name</option>
                <option value="accuracy">Sort: Accuracy</option>
                <option value="aiDependency">Sort: AI Dependency</option>
                <option value="understanding">Sort: Understanding</option>
              </select>
              <select
                value={sortDirection}
                onChange={(e) => setSortDirection(e.target.value as SortDirection)}
                className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700"
                title="Sort direction"
              >
                {sortField === 'name' ? (
                  <>
                    <option value="asc">A to Z</option>
                    <option value="desc">Z to A</option>
                  </>
                ) : (
                  <>
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </>
                )}
              </select>
              <button
                type="button"
                onClick={() => setShowLearnMore(true)}
                className="px-3 py-2 rounded-lg border border-slate-300 bg-slate-100 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-100"
              >
                Learn more about metrics
              </button>
            </div>
          </div>
          {students.length === 0 ? (
            <p className="text-gray-400 italic">No students enrolled in this class yet.</p>
          ) : (
            <div className="space-y-3">
              {paginatedStudents.map((s) => (
                <button
                  key={s.studentId}
                  type="button"
                  onClick={() => openStudentDetail(s)}
                  className="w-full text-left bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-black">{s.firstName} {s.lastName}</p>
                      <p className="text-xs text-gray-500">@{s.username}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${metricBadgeClass('accuracy')}`}>
                        Accuracy {fmtScore(s.currentWeek.accuracy)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${metricBadgeClass('aiDependency')}`}>
                        AI Dependency {fmtScore(s.currentWeek.aiDependency)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${metricBadgeClass('understanding')}`}>
                        Understanding {fmtScore(s.currentWeek.understanding)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
              {totalStudentPages > 1 && (
                <div className="pt-1 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Page {studentPage} of {totalStudentPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStudentPage((p) => Math.max(1, p - 1))}
                      disabled={studentPage === 1}
                      className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentPage((p) => Math.min(totalStudentPages, p + 1))}
                      disabled={studentPage === totalStudentPages}
                      className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {learnMoreModal}
      </>
    );
  }

  if (level === 'student_detail' && selectedStudent) {
    return (
      <>
        <div className="space-y-3 animate-fadeIn w-full max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setLevel('student_list')}
              className="inline-flex items-center px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:text-black hover:bg-gray-50"
            >
              ← Back to students
            </button>
            <button
              type="button"
              onClick={() => setShowLearnMore(true)}
              className="px-3 py-2 rounded-lg border border-slate-300 bg-slate-100 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-100"
            >
              Learn more about metrics
            </button>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-black">{selectedStudentName}</h2>
            <p className="text-sm text-gray-500 mt-1">@{selectedStudent.username}</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-[#ba3638] rounded-full animate-spin" />
            </div>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : (
            <div className="bg-[#f4f4f5] border border-gray-200 rounded-2xl p-3.5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl md:text-2xl font-bold text-black">
                  Student Metrics: {selectedStudentName}
                </h3>
                <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-700 text-xs font-semibold flex items-center justify-center">
                  {selectedStudent.firstName[0]}{selectedStudent.lastName[0]}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[205px_1fr] gap-3">
                <div className="bg-white/60 rounded-2xl overflow-hidden border border-gray-200">
                  <div className="px-3 py-2 border-b border-gray-200 bg-white text-lg font-bold text-black">
                    Last three weeks:
                  </div>
                  <div className="p-3 space-y-3">
                    <button
                      type="button"
                      onClick={() => setSelectedMetric('understanding')}
                      className={`w-full text-left border-b border-gray-200 pb-2 rounded-lg px-1 ${
                        selectedMetric === 'understanding' ? 'bg-green-50' : ''
                      }`}
                    >
                      <div className="text-3xl font-bold text-green-700">{fmtScore(lastThreeWeekAverages.understanding)}</div>
                      <div className="text-base text-gray-700 mt-1">Understanding</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMetric('aiDependency')}
                      className={`w-full text-left border-b border-gray-200 pb-2 rounded-lg px-1 ${
                        selectedMetric === 'aiDependency' ? 'bg-red-50' : ''
                      }`}
                    >
                      <div className="text-3xl font-bold text-green-700">{fmtScore(lastThreeWeekAverages.aiDependency)}</div>
                      <div className="text-base text-gray-700 mt-1">AI Dependency</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMetric('accuracy')}
                      className={`w-full text-left rounded-lg px-1 ${
                        selectedMetric === 'accuracy' ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="text-3xl font-bold text-green-700">{fmtScore(lastThreeWeekAverages.accuracy)}</div>
                      <div className="text-base text-gray-700 mt-1">Accuracy</div>
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(['understanding', 'accuracy', 'aiDependency'] as MetricKey[]).map((metric) => (
                      <button
                        key={metric}
                        type="button"
                        onClick={() => setSelectedMetric(metric)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          selectedMetric === metric ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {METRIC_META[metric].label}
                      </button>
                    ))}
                  </div>
                  <h4 className="text-lg md:text-xl font-semibold text-center text-black mb-2.5">
                    {METRIC_META[selectedMetric].label} Over Time (8 Weeks) - {selectedStudentName}
                  </h4>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid stroke="#e5e7eb" />
                        <XAxis dataKey="weekLabel" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value: number | null) => `${Math.round(Number(value ?? 0))}%`} />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={METRIC_META[selectedMetric].color}
                          strokeWidth={3}
                          dot={{ r: 4, fill: METRIC_META[selectedMetric].color }}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        {learnMoreModal}
      </>
    );
  }

  return null;
};

export default TeacherMetrics;
