
import React, { useRef, useState } from 'react';
import { Pencil, Plus, Upload, CheckCircle2 } from './Icons';
import { generateAssignment } from '../services/geminiService';
import { uploadAssignmentPdf } from '../services/api';

interface Props {
  classId: number;
  teacherId: number;
}

interface UploadedFile {
  name: string;
  assignmentId: number;
}

const AssignmentEditor: React.FC<Props> = ({ classId, teacherId }) => {
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [result, setResult] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    const fileNames = uploadedFiles.map((f) => f.name);
    const generated = await generateAssignment(title || 'Algebra Basics', fileNames);
    setResult(generated);
    setIsGenerating(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-selected if needed
    e.target.value = '';

    if (!title.trim()) {
      setUploadError('Please enter an assignment title before uploading a file.');
      return;
    }

    setUploadError('');
    setIsUploading(true);

    const res = await uploadAssignmentPdf(classId, teacherId, file, title.trim());

    setIsUploading(false);

    if (!res.success || res.assignmentId == null) {
      setUploadError(res.error || 'Upload failed. Please try again.');
      return;
    }

    setUploadedFiles((prev) => [...prev, { name: file.name, assignmentId: res.assignmentId! }]);
  };

  return (
    <div className="space-y-12">
      <div className="flex items-center gap-2 border-b-2 border-gray-900 pb-2 max-w-md">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ADD ASSIGNMENT TITLE"
          className="text-2xl font-bold bg-transparent focus:outline-none flex-1 placeholder:text-gray-300"
        />
        <Pencil className="w-6 h-6 text-gray-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left Column: AI Result */}
        <div className="space-y-6">
          <button className="flex items-center gap-3 text-2xl font-medium text-gray-800 hover:text-red-500 transition-colors">
            <Plus className="w-8 h-8" />
            Add Custom Question
          </button>

          <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100 min-h-[500px]">
            <h3 className="text-2xl font-bold mb-6">Result:</h3>
            <div className="prose max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <div className="w-12 h-12 border-4 border-red-200 border-t-red-500 rounded-full animate-spin mb-4"></div>
                  Generating assignment content...
                </div>
              ) : result ? result : (
                <div className="text-gray-400 italic">
                  Complete the instructions on the right to generate content using AI.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Controls */}
        <div className="space-y-12">
          {/* Upload Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-2xl font-medium text-gray-800">
              <Upload className="w-8 h-8" />
              Upload Class Material
            </div>
            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100 space-y-4">
              {uploadedFiles.length === 0 && !isUploading && (
                <p className="text-gray-400 italic text-sm">No files uploaded yet.</p>
              )}
              {uploadedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center gap-3 text-gray-600">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 shrink-0">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                    <path d="M14 2v6h6" />
                  </svg>
                  <span className="truncate text-sm">{file.name}</span>
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                </div>
              ))}
              {isUploading && (
                <div className="flex items-center gap-3 text-gray-400 text-sm">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-red-400 rounded-full animate-spin shrink-0" />
                  Uploading...
                </div>
              )}
              {uploadError && (
                <p className="text-red-500 text-sm">{uploadError}</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {isUploading ? 'Uploading...' : 'Choose PDF'}
              </button>
            </div>
          </div>

          {/* AI Instructions */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-2xl font-medium text-gray-800">
              <div className="w-8 h-8 border-2 border-gray-800 rotate-45 flex items-center justify-center">
                <div className="w-4 h-4 border border-gray-800 rotate-45"></div>
              </div>
              Instructions for AI
            </div>
            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100 relative">
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Please make 7 questions and 1 multiple choice based on the material"
                className="w-full bg-transparent resize-none h-40 focus:outline-none text-gray-700 text-lg"
              />
              <button
                onClick={handleGenerate}
                className="mt-4 px-8 py-3 bg-gray-200 text-black border border-gray-300 rounded-full hover:bg-gray-300 transition-all flex items-center gap-2 font-medium"
              >
                {isGenerating ? 'Generating...' : 'Generate with AI'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-8 right-8">
        <button className="flex items-center gap-2 bg-white px-6 py-3 rounded-full border border-gray-200 shadow-lg hover:shadow-xl transition-all">
          <div className="w-5 h-5 rounded-full border border-gray-400 flex items-center justify-center text-[10px]">★</div>
          View Student View
        </button>
      </div>
    </div>
  );
};

export default AssignmentEditor;
