import React from 'react';
import { ClassSummary } from '../types';
import StudentPasswordsCard from './StudentPasswordsCard';

interface ClassInfoProps {
  classInfo: ClassSummary;
}

const ClassInfo: React.FC<ClassInfoProps> = ({ classInfo }) => {
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

      <StudentPasswordsCard />
    </div>
  );
};

export default ClassInfo;
