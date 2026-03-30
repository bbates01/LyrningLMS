import React, { useEffect, useMemo, useState } from 'react';
import { ClassSummary } from '../types';
import { fetchAdminAllClasses, type AdminClassRow } from '../services/api';

function toClassSummary(r: AdminClassRow): ClassSummary {
  return {
    class_id: Number(r.class_id),
    class_code: r.class_code,
    class_name: r.class_name,
    period: r.period,
    semester: r.semester,
    room_number: r.room_number,
    subject_code: r.subject_code,
    subject_description: r.subject_description ?? null,
    teacher_first_name: r.teacher_first_name,
    teacher_last_name: r.teacher_last_name,
  };
}

interface AdminClassSelectProps {
  adminToken: string;
  onSelectClass: (cls: ClassSummary) => void;
}

const AdminClassSelect: React.FC<AdminClassSelectProps> = ({ adminToken, onSelectClass }) => {
  const [rows, setRows] = useState<AdminClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAdminAllClasses(adminToken)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load classes.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [adminToken]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const teacher = `${r.teacher_first_name} ${r.teacher_last_name}`.toLowerCase();
      const blob = `${r.class_name} ${r.subject_code} ${r.class_code} ${teacher} ${r.semester ?? ''} ${r.period ?? ''}`.toLowerCase();
      return blob.includes(q);
    });
  }, [rows, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[280px]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <p className="text-red-600 text-center py-10">{error}</p>;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">All classes</h2>
        <p className="text-sm text-slate-600 mt-1">
          Read-only: open a class for metrics and grades. Teachers are shown on each card. Use <strong>Global metrics</strong> in the header for org-wide charts.
        </p>
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by class, subject, teacher, semester…"
        className="w-full max-w-xl px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-800"
      />

      {filtered.length === 0 ? (
        <p className="text-slate-500 italic">No classes match your search.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => {
            const cls = toClassSummary(r);
            return (
              <button
                key={r.class_id}
                type="button"
                onClick={() => onSelectClass(cls)}
                className="text-left bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
              >
                <p className="font-semibold text-slate-900 text-lg leading-snug">{r.class_name}</p>
                <p className="text-sm text-slate-600 mt-2">
                  <span className="font-medium text-slate-700">Teacher:</span>{' '}
                  {r.teacher_first_name} {r.teacher_last_name}
                </p>
                <p className="text-xs text-slate-500 mt-2 space-x-2">
                  <span>{r.subject_code}</span>
                  {r.semester && <span>· {r.semester}</span>}
                  {r.period && <span>· {r.period}</span>}
                </p>
                <p className="text-xs text-slate-400 mt-1 font-mono">{r.class_code}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminClassSelect;
