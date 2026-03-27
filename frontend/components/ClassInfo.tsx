import React from 'react';
import { ClassSummary } from '../types';
import StudentPasswordsCard from './StudentPasswordsCard';
import { updateClass, deleteClass } from '../services/api';

interface ClassInfoProps {
  classInfo: ClassSummary;
  teacherId: number;
  teacherUsername?: string;
  onClassUpdated?: (updated: ClassSummary) => void;
  onClassDeleted?: () => void;
}

const ClassInfo: React.FC<ClassInfoProps> = ({
  classInfo,
  teacherId,
  teacherUsername,
  onClassUpdated,
  onClassDeleted,
}) => {
  const [showEdit, setShowEdit] = React.useState(false);
  const [savingEdit, setSavingEdit] = React.useState(false);
  const [editError, setEditError] = React.useState('');
  const [className, setClassName] = React.useState(classInfo.class_name);
  const [subjectCode, setSubjectCode] = React.useState(classInfo.subject_code || '');
  const [semester, setSemester] = React.useState(classInfo.semester || '');
  const [period, setPeriod] = React.useState(classInfo.period || '');
  const [room, setRoom] = React.useState(classInfo.room_number || '');
  const [classCode, setClassCode] = React.useState(classInfo.class_code || '');
  const [deleteView, setDeleteView] = React.useState(false);
  const [showFinalDeletePopup, setShowFinalDeletePopup] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState('');
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    setClassName(classInfo.class_name);
    setSubjectCode(classInfo.subject_code || '');
    setSemester(classInfo.semester || '');
    setPeriod(classInfo.period || '');
    setRoom(classInfo.room_number || '');
    setClassCode(classInfo.class_code || '');
  }, [classInfo]);

  const handleSaveEdit = async () => {
    setEditError('');
    if (!className.trim() || !subjectCode.trim()) {
      setEditError('Class name and subject code are required.');
      return;
    }
    setSavingEdit(true);
    try {
      const res = await updateClass(classInfo.class_id, {
        teacherId,
        className: className.trim(),
        subjectCode: subjectCode.trim().toUpperCase(),
        semester,
        period,
        roomNumber: room,
        classCode,
      });
      if (!res.success || !res.class) {
        setEditError(res.error || 'Failed to update class.');
        return;
      }
      onClassUpdated?.(res.class as ClassSummary);
      setShowEdit(false);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteClass = async () => {
    setDeleteError('');
    setDeleting(true);
    try {
      const res = await deleteClass(classInfo.class_id, teacherId);
      if (!res.success) {
        setDeleteError(res.error || 'Failed to delete class.');
        return;
      }
      onClassDeleted?.();
    } finally {
      setDeleting(false);
    }
  };

  if (deleteView) {
    return (
      <>
        <div className="space-y-6 animate-fadeIn max-w-3xl">
          <h2 className="text-4xl font-bold text-black">Delete Class?</h2>
          <div className="bg-white border border-red-200 rounded-2xl shadow-sm p-6 space-y-3">
            <p className="text-lg font-semibold text-red-700">
              This action cannot be undone.
            </p>
            <p className="text-gray-700">
              Deleting <span className="font-semibold">{classInfo.class_name}</span> will permanently remove the class and its related data.
            </p>
            {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteView(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel / Go Back
              </button>
              <button
                type="button"
                onClick={() => setShowFinalDeletePopup(true)}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
        {showFinalDeletePopup && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => !deleting && setShowFinalDeletePopup(false)}
          >
            <div
              className="w-full max-w-md bg-white rounded-2xl border border-red-200 shadow-xl p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-red-700">Final confirmation</h3>
              <p className="text-gray-800">
                This cannot be undone. Are you absolutely sure you want to permanently delete this class?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFinalDeletePopup(false)}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteClass}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {deleting ? 'Deleting...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl">
      <h2 className="text-4xl font-bold text-black">Class info</h2>
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 space-y-6">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Class name</p>
            <p className="text-xl font-bold text-black mt-1 break-words">{classInfo.class_name}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Subject</p>
            <p className="text-lg text-black mt-1 break-words">{classInfo.subject_code}</p>
            {classInfo.subject_description && (
              <p className="text-gray-600 mt-1">{classInfo.subject_description}</p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            {classInfo.period && (
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Period</p>
                <p className="text-black mt-1">{classInfo.period}</p>
              </div>
            )}
            {classInfo.semester && (
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Semester</p>
                <p className="text-black mt-1">{classInfo.semester}</p>
              </div>
            )}
            {classInfo.room_number && (
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Room</p>
                <p className="text-black mt-1">{classInfo.room_number}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <StudentPasswordsCard
        teacherUsername={teacherUsername}
        classId={classInfo.class_id}
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setEditError('');
            setShowEdit(true);
          }}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Edit class
        </button>
        <button
          type="button"
          onClick={() => {
            setDeleteError('');
            setDeleteView(true);
          }}
          className="px-3 py-2 rounded-lg border border-red-300 text-sm font-medium text-red-700 hover:bg-red-50"
        >
          Delete class
        </button>
      </div>

      {showEdit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !savingEdit && setShowEdit(false)}
        >
          <div
            className="w-full max-w-xl bg-white rounded-2xl border border-gray-200 shadow-xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-black">Edit class</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Class name</label>
                <input value={className} onChange={(e) => setClassName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject code</label>
                <input value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class code</label>
                <input value={classCode} onChange={(e) => setClassCode(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                <input value={semester} onChange={(e) => setSemester(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                <input value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                <input value={room} onChange={(e) => setRoom(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
            </div>
            {editError && <p className="text-sm text-red-600">{editError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowEdit(false)} disabled={savingEdit} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700">
                Cancel
              </button>
              <button type="button" onClick={handleSaveEdit} disabled={savingEdit} className="px-4 py-2 rounded-lg bg-gray-900 text-white">
                {savingEdit ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassInfo;
