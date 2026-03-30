import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchAdminFilterOptions,
  fetchAdminGlobalMetrics,
  type AdminFilterOptions,
  type AdminGlobalMetricsFilters,
  type ClassMetricAveragesPayload,
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

type MetricKey = 'accuracy' | 'aiDependency' | 'understanding';

const METRIC_META: Record<MetricKey, { label: string; color: string }> = {
  accuracy: { label: 'Accuracy', color: '#2563eb' },
  aiDependency: { label: 'AI Dependency', color: '#dc2626' },
  understanding: { label: 'Understanding', color: '#16a34a' },
};

const EMPTY_FILTERS: AdminGlobalMetricsFilters = {
  subjectCodes: [],
  semesters: [],
  periods: [],
  teacherIds: [],
};

function fmtScore(v: number | null): string {
  return v == null ? '--' : `${Math.round(v)}%`;
}

function fmtWeekRange(start: string, end: string): string {
  if (!start?.trim() && !end?.trim()) return '';
  try {
    const s = new Date(start);
    const e = new Date(end);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return '';
    return `${s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  } catch {
    return '';
  }
}

function MultiStringFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (v: string) => {
    if (selected.includes(v)) onChange(selected.filter((x) => x !== v));
    else onChange([...selected, v].sort());
  };
  return (
    <div className="min-w-[200px] max-w-[240px]">
      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{label}</label>
      <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-300 text-sm p-2 space-y-1.5 bg-white">
        {options.length === 0 ? (
          <p className="text-slate-400 text-xs">No options match other filters</p>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs text-blue-600 hover:underline"
            >
              Clear all
            </button>
            {options.map((opt) => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
                <span className="truncate">{opt}</span>
              </label>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function MultiTeacherFilter({
  teachers,
  selectedIds,
  onChange,
}: {
  teachers: AdminFilterOptions['teachers'];
  selectedIds: number[];
  onChange: (next: number[]) => void;
}) {
  const toggle = (id: number) => {
    if (selectedIds.includes(id)) onChange(selectedIds.filter((x) => x !== id));
    else onChange([...selectedIds, id].sort((a, b) => a - b));
  };
  return (
    <div className="min-w-[220px] max-w-[280px]">
      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Teachers</label>
      <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-300 text-sm p-2 space-y-1.5 bg-white">
        {teachers.length === 0 ? (
          <p className="text-slate-400 text-xs">No teachers match other filters</p>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs text-blue-600 hover:underline"
            >
              Clear all
            </button>
            {teachers.map((t) => (
              <label key={t.teacherId} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(t.teacherId)}
                  onChange={() => toggle(t.teacherId)}
                />
                <span className="truncate">
                  {t.lastName}, {t.firstName}
                </span>
              </label>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

interface AdminGlobalMetricsProps {
  adminToken: string;
}

const AdminGlobalMetrics: React.FC<AdminGlobalMetricsProps> = ({ adminToken }) => {
  const [filters, setFilters] = useState<AdminGlobalMetricsFilters>(EMPTY_FILTERS);
  const [options, setOptions] = useState<AdminFilterOptions | null>(null);
  const [data, setData] = useState<ClassMetricAveragesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('accuracy');

  const filterKey = useMemo(
    () =>
      [
        filters.subjectCodes.slice().sort().join('\u0001'),
        filters.semesters.slice().sort().join('\u0001'),
        filters.periods.slice().sort().join('\u0001'),
        filters.teacherIds.slice().sort((a, b) => a - b).join(','),
      ].join('|'),
    [filters]
  );

  useEffect(() => {
    let cancelled = false;
    fetchAdminFilterOptions(adminToken, filters)
      .then((o) => {
        if (!cancelled) setOptions(o);
      })
      .catch(() => {
        if (!cancelled) setOptions(null);
      });
    return () => {
      cancelled = true;
    };
  }, [adminToken, filterKey]);

  useEffect(() => {
    if (!options) return;
    setFilters((prev) => {
      const next: AdminGlobalMetricsFilters = {
        subjectCodes: prev.subjectCodes.filter((s) => options.subjectCodes.includes(s)),
        semesters: prev.semesters.filter((s) => options.semesters.includes(s)),
        periods: prev.periods.filter((p) => options.periods.includes(p)),
        teacherIds: prev.teacherIds.filter((id) => options.teachers.some((t) => t.teacherId === id)),
      };
      if (
        next.subjectCodes.length === prev.subjectCodes.length &&
        next.semesters.length === prev.semesters.length &&
        next.periods.length === prev.periods.length &&
        next.teacherIds.length === prev.teacherIds.length &&
        next.subjectCodes.every((v, i) => v === prev.subjectCodes[i]) &&
        next.semesters.every((v, i) => v === prev.semesters[i]) &&
        next.periods.every((v, i) => v === prev.periods[i]) &&
        next.teacherIds.every((v, i) => v === prev.teacherIds[i])
      ) {
        return prev;
      }
      return next;
    });
  }, [options]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchAdminGlobalMetrics(adminToken, filters);
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load global metrics.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [adminToken, filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const chartData = useMemo(() => {
    if (!data?.weekly?.length) return [];
    return data.weekly.map((h, index) => ({
      weekLabel: `Week ${index + 1}`,
      value:
        selectedMetric === 'accuracy'
          ? h.accuracy
          : selectedMetric === 'aiDependency'
            ? h.aiDependency
            : h.understanding,
    }));
  }, [data?.weekly, selectedMetric]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Global metrics</h2>
        <p className="text-sm text-slate-600 mt-1">
          Averages across student weekly metrics. Pick any combination of subjects, semesters, periods, and
          teachers; each list only shows values that still exist given your other choices.
        </p>
      </div>

      {options && (
        <div className="flex flex-wrap gap-4 items-start bg-white border border-slate-200 rounded-2xl p-4">
          <MultiStringFilter
            label="Subjects"
            options={options.subjectCodes}
            selected={filters.subjectCodes}
            onChange={(subjectCodes) => setFilters((f) => ({ ...f, subjectCodes }))}
          />
          <MultiStringFilter
            label="Semesters"
            options={options.semesters}
            selected={filters.semesters}
            onChange={(semesters) => setFilters((f) => ({ ...f, semesters }))}
          />
          <MultiStringFilter
            label="Periods"
            options={options.periods}
            selected={filters.periods}
            onChange={(periods) => setFilters((f) => ({ ...f, periods }))}
          />
          <MultiTeacherFilter
            teachers={options.teachers}
            selectedIds={filters.teacherIds}
            onChange={(teacherIds) => setFilters((f) => ({ ...f, teacherIds }))}
          />
          <div className="flex flex-col justify-end gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 whitespace-nowrap"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm hover:bg-slate-50 whitespace-nowrap"
            >
              Clear filters
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : !data?.weekly?.length ? (
        <p className="text-slate-600">No metrics match these filters yet.</p>
      ) : (
        <>
          {data.currentAverages && data.currentWeek && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Latest period (global average)</p>
                <p className="text-sm text-slate-700">
                  {fmtWeekRange(data.currentWeek.weekStartDate, data.currentWeek.weekEndDate) ||
                    `Week ${data.currentWeek.weekNumber}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-800">
                  Accuracy {fmtScore(data.currentAverages.accuracy)}
                </span>
                <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-red-50 text-red-800">
                  AI Dependency {fmtScore(data.currentAverages.aiDependency)}
                </span>
                <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-800">
                  Understanding {fmtScore(data.currentAverages.understanding)}
                </span>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex flex-wrap gap-2 mb-3">
              {(['understanding', 'accuracy', 'aiDependency'] as MetricKey[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMetric(m)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    selectedMetric === m ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {METRIC_META[m].label}
                </button>
              ))}
            </div>
            <h3 className="text-lg font-semibold text-center text-slate-900 mb-2">
              Global average: {METRIC_META[selectedMetric].label} (up to 8 weeks)
            </h3>
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

          <div className="rounded-2xl border border-slate-200 overflow-x-auto bg-white">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="p-2 font-semibold text-slate-700">Week #</th>
                  <th className="p-2 font-semibold text-slate-700">Dates</th>
                  <th className="p-2 font-semibold text-blue-800">Accuracy</th>
                  <th className="p-2 font-semibold text-red-800">AI dependency</th>
                  <th className="p-2 font-semibold text-green-800">Understanding</th>
                </tr>
              </thead>
              <tbody>
                {data.weekly.map((w) => (
                  <tr key={`${w.weekStartDate}-${w.weekNumber}`} className="border-b border-slate-100">
                    <td className="p-2 text-slate-800">{w.weekNumber}</td>
                    <td className="p-2 text-slate-600 whitespace-nowrap">
                      {fmtWeekRange(w.weekStartDate, w.weekEndDate) || '—'}
                    </td>
                    <td className="p-2">{fmtScore(w.accuracy)}</td>
                    <td className="p-2">{fmtScore(w.aiDependency)}</td>
                    <td className="p-2">{fmtScore(w.understanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminGlobalMetrics;
