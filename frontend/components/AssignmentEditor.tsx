import React, { useState, useRef } from 'react';

<<<<<<< logan/upload-assignment-info
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
=======
const BRAND = '#D96B6B';
const BRAND_LIGHT = '#F2DADA';
const BG = '#FFFFFF';
const CARD = '#FFFFFF';
const INPUT_BG = '#F4F4F6';
const TEXT = '#1C2128';
const MUTED = '#8A8FA8';
const BORDER = '#E8E8EC';

export default function AssignmentEditor() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [specialRequest, setSpecialRequest] = useState('');
  const [files, setFiles] = useState([
    { name: 'classMaterial03-05-26.pdf', size: '2.4 MB' },
    { name: 'examplePracticeProblems03-05-26.pdf', size: '1.1 MB' },
  ]);
  const [isDragging, setIsDragging] = useState(false);
  const [showAIConfig, setShowAIConfig] = useState(false);
  const [aiConfig, setAiConfig] = useState({
    model: 'gemini-pro',
    temperature: 0.7,
    questionCount: 7,
    includeMultipleChoice: true,
    difficulty: 'medium',
  });
  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files).map(f => ({
      name: f.name,
      size: (f.size / 1024 / 1024).toFixed(1) + ' MB',
    }));
    setFiles(prev => [...prev, ...dropped]);
  };

  const handleFileInput = (e) => {
    const selected = Array.from(e.target.files).map(f => ({
      name: f.name,
      size: (f.size / 1024 / 1024).toFixed(1) + ' MB',
    }));
    setFiles(prev => [...prev, ...selected]);
  };

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  return (
    <div style={{
      minHeight: '100vh',
      background: BG,
      fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
>>>>>>> main

        /* ── Top nav bar ── */
        .lyr-nav {
          height: 56px;
          background: ${CARD};
          border-bottom: 1px solid ${BORDER};
          display: flex;
          align-items: center;
          padding: 0 32px;
          gap: 10px;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .lyr-nav-name {
          font-size: 18px; font-weight: 700; color: ${TEXT}; letter-spacing: -0.3px;
        }
        .lyr-nav-spacer { flex: 1; }

        /* ── Main single-col layout ── */
        .lyr-main {
          max-width: 860px;
          margin: 0 auto;
          padding: 40px 48px 80px;
        }

        /* ── Content area ── */
        .lyr-content {
          width: 100%;
        }

        .lyr-page-title {
          font-size: 26px; font-weight: 700; color: ${TEXT};
          letter-spacing: -0.5px; margin-bottom: 36px;
        }

        .lyr-section { margin-bottom: 32px; }

        .lyr-label-row {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 10px;
        }
        .lyr-label { font-size: 14px; font-weight: 700; color: ${TEXT}; }

        .lyr-input, .lyr-textarea {
          width: 100%;
          background: ${INPUT_BG};
          border: 1.5px solid transparent;
          border-radius: 12px;
          padding: 13px 16px;
          font-family: inherit; font-size: 15px; color: ${TEXT};
          outline: none; resize: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .lyr-input::placeholder, .lyr-textarea::placeholder { color: #BCBFCC; }
        .lyr-input:focus, .lyr-textarea:focus {
          border-color: ${BRAND};
          box-shadow: 0 0 0 3px ${BRAND_LIGHT};
        }
        .lyr-input-title {
          font-size: 20px; font-weight: 600;
        }
        .lyr-textarea { min-height: 120px; line-height: 1.65; }
        .lyr-textarea-sm { min-height: 90px; }

        /* Drop zone */
        .lyr-drop {
          background: ${INPUT_BG};
          border: 2px dashed #DDDFE8;
          border-radius: 12px;
          padding: 32px 24px;
          text-align: center;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
        }
        .lyr-drop:hover, .lyr-drop.dragging {
          border-color: ${BRAND}; background: #FDF6F6;
        }
        .lyr-upload-icon {
          width: 44px; height: 44px;
          background: ${BRAND_LIGHT}; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 12px;
        }
        .lyr-drop-main { font-size: 14px; color: ${TEXT}; font-weight: 500; margin-bottom: 3px; }
        .lyr-drop-main span { color: ${BRAND}; text-decoration: underline; }
        .lyr-drop-sub { font-size: 12px; color: ${MUTED}; }

        /* File list */
        .lyr-files { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
        .lyr-file {
          display: flex; align-items: center; gap: 10px;
          background: ${INPUT_BG}; border-radius: 10px; padding: 10px 13px;
        }
        .lyr-file-icon {
          width: 30px; height: 30px;
          background: ${BRAND}; border-radius: 8px;
          flex-shrink: 0; display: flex; align-items: center; justify-content: center;
        }
        .lyr-file-name {
          flex: 1; font-size: 13px; font-weight: 500; color: ${TEXT};
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .lyr-file-size { font-size: 12px; color: ${MUTED}; flex-shrink: 0; }
        .lyr-file-rm {
          background: none; border: none; cursor: pointer;
          color: ${MUTED}; padding: 3px; border-radius: 6px; display: flex;
          transition: color 0.15s, background 0.15s;
        }
        .lyr-file-rm:hover { color: ${BRAND}; background: ${BRAND_LIGHT}; }

        /* AI edit button */
          display: flex; align-items: center; gap: 5px;
          background: ${INPUT_BG}; border: none; border-radius: 8px;
          padding: 6px 11px;
          font-family: inherit; font-size: 12px; font-weight: 600;
          color: ${MUTED}; cursor: pointer;
          transition: background 0.15s, color 0.15s;
          letter-spacing: 0.1px;
        }
        .lyr-ai-btn:hover { color: ${TEXT}; background: #E4E5EA; }

        /* Create button */
        .lyr-create-btn {
          background: ${BRAND}; color: white;
          border: none; border-radius: 12px; padding: 14px 32px;
          font-family: inherit; font-size: 15px; font-weight: 700;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
          box-shadow: 0 4px 14px rgba(217,107,107,0.3);
        }
        .lyr-create-btn:hover {
          background: #C85F5F; transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(217,107,107,0.4);
        }
        .lyr-create-btn:active { transform: none; }

        /* ── Modal ── */
        .lyr-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.22);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          z-index: 300;
          animation: overlayIn 0.15s ease;
        }
        @keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }

        .lyr-modal {
          background: ${CARD};
          border-radius: 20px;
          padding: 28px;
          width: 100%; max-width: 420px;
          margin: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
          animation: modalIn 0.18s ease;
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .lyr-modal-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 22px;
        }
        .lyr-modal-title { font-size: 17px; font-weight: 700; color: ${TEXT}; }
        .lyr-modal-close {
          width: 30px; height: 30px;
          background: ${INPUT_BG}; border: none; border-radius: 8px;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          color: ${MUTED}; transition: background 0.15s, color 0.15s;
        }
        .lyr-modal-close:hover { background: #ECEDF0; color: ${TEXT}; }

        .cfg-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .cfg-span2 { grid-column: span 2; }
        .cfg-lbl {
          display: block; font-size: 10px; font-weight: 700;
          letter-spacing: 1.5px; text-transform: uppercase; color: ${MUTED}; margin-bottom: 6px;
        }
        .cfg-sel, .cfg-num {
          width: 100%; background: ${INPUT_BG}; border: none;
          border-radius: 9px; padding: 10px 12px;
          font-family: inherit; font-size: 14px; color: ${TEXT};
          outline: none; -webkit-appearance: none;
          transition: box-shadow 0.15s;
        }
        .cfg-sel:focus, .cfg-num:focus { box-shadow: 0 0 0 2px ${BRAND}; }
        .cfg-toggle-row { display: flex; align-items: center; justify-content: space-between; margin-top: 6px; }
        .cfg-toggle-text { font-size: 14px; color: ${TEXT}; }
        .cfg-pill {
          width: 44px; height: 26px; border-radius: 100px;
          border: none; cursor: pointer; position: relative; flex-shrink: 0;
          transition: background 0.2s;
        }
        .cfg-pill-thumb {
          position: absolute; width: 20px; height: 20px;
          border-radius: 50%; background: white; top: 3px;
          transition: left 0.2s; box-shadow: 0 1px 4px rgba(0,0,0,0.15);
        }
        .cfg-temp-val { font-size: 18px; font-weight: 700; color: ${BRAND}; }
        .cfg-temp-sub { font-size: 12px; color: ${MUTED}; margin-left: 4px; }
        input[type="range"] { width: 100%; accent-color: ${BRAND}; margin-top: 8px; display: block; }
        .lyr-modal-save {
          width: 100%; background: ${BRAND}; color: white;
          border: none; border-radius: 11px; padding: 13px;
          font-family: inherit; font-size: 15px; font-weight: 700;
          cursor: pointer; margin-top: 20px;
          transition: background 0.15s;
          box-shadow: 0 4px 12px rgba(217,107,107,0.28);
        }
        .lyr-modal-save:hover { background: #C85F5F; }
      `}</style>

      {/* Modal */}
      {showAIConfig && (
        <div className="lyr-overlay" onClick={() => setShowAIConfig(false)}>
          <div className="lyr-modal" onClick={e => e.stopPropagation()}>
            <div className="lyr-modal-header">
              <span className="lyr-modal-title">AI Configuration</span>
              <button className="lyr-modal-close" onClick={() => setShowAIConfig(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="cfg-grid">
              <div>
                <span className="cfg-lbl">Model</span>
                <select className="cfg-sel" value={aiConfig.model} onChange={e => setAiConfig({ ...aiConfig, model: e.target.value })}>
                  <option value="gemini-pro">Gemini Pro</option>
                  <option value="gemini-ultra">Gemini Ultra</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="claude-sonnet">Claude Sonnet</option>
                </select>
              </div>
              <div>
                <span className="cfg-lbl">Difficulty</span>
                <select className="cfg-sel" value={aiConfig.difficulty} onChange={e => setAiConfig({ ...aiConfig, difficulty: e.target.value })}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
              <div>
                <span className="cfg-lbl">Questions</span>
                <input type="number" className="cfg-num" min="1" max="30"
                  value={aiConfig.questionCount}
                  onChange={e => setAiConfig({ ...aiConfig, questionCount: parseInt(e.target.value) })} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span className="cfg-lbl">Multiple Choice</span>
                <div className="cfg-toggle-row">
                  <span className="cfg-toggle-text">{aiConfig.includeMultipleChoice ? 'On' : 'Off'}</span>
                  <button className="cfg-pill"
                    style={{ background: aiConfig.includeMultipleChoice ? BRAND : '#DDDFE8' }}
                    onClick={() => setAiConfig({ ...aiConfig, includeMultipleChoice: !aiConfig.includeMultipleChoice })}>
                    <span className="cfg-pill-thumb" style={{ left: aiConfig.includeMultipleChoice ? 21 : 3 }} />
                  </button>
                </div>
              </div>
              <div className="cfg-span2">
                <span className="cfg-lbl">
                  Creativity — <span className="cfg-temp-val">{aiConfig.temperature.toFixed(1)}</span>
                  <span className="cfg-temp-sub">{aiConfig.temperature < 0.4 ? 'Precise' : aiConfig.temperature < 0.7 ? 'Balanced' : 'Creative'}</span>
                </span>
                <input type="range" min="0" max="1" step="0.1" value={aiConfig.temperature}
                  onChange={e => setAiConfig({ ...aiConfig, temperature: parseFloat(e.target.value) })} />
              </div>
            </div>
            <button className="lyr-modal-save" onClick={() => setShowAIConfig(false)}>Save Settings</button>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="lyr-nav">
        <span className="lyr-nav-name">New Assignment</span>
        <div className="lyr-nav-spacer" />
      </nav>

      {/* Single-col body */}
      <div className="lyr-main">
        <div className="lyr-content">
          <div className="lyr-section">
            <div className="lyr-label-row">
              <label className="lyr-label">Assignment Title</label>
            </div>
<<<<<<< logan/upload-assignment-info
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
=======
            <input type="text" className="lyr-input lyr-input-title" value={title}
              onChange={e => setTitle(e.target.value)} placeholder="Untitled Assignment" />
          </div>

          <div className="lyr-section">
            <div className="lyr-label-row">
              <label className="lyr-label">Description</label>
>>>>>>> main
            </div>
            <textarea className="lyr-textarea" value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What should students know about this assignment?" />
          </div>

          <div className="lyr-section">
            <div className="lyr-label-row">
              <label className="lyr-label">Attachments</label>
            </div>
            <div className={`lyr-drop${isDragging ? ' dragging' : ''}`}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}>
              <div className="lyr-upload-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <div className="lyr-drop-main">Drop files here or <span>browse</span></div>
              <div className="lyr-drop-sub">PDF, DOCX, PNG — up to 25MB each</div>
              <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileInput} />
            </div>
<<<<<<< logan/upload-assignment-info
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
=======
            {files.length > 0 && (
              <div className="lyr-files">
                {files.map((file, idx) => (
                  <div key={idx} className="lyr-file">
                    <div className="lyr-file-icon">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                    </div>
                    <span className="lyr-file-name">{file.name}</span>
                    <span className="lyr-file-size">{file.size}</span>
                    <button className="lyr-file-rm" onClick={e => { e.stopPropagation(); removeFile(idx); }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lyr-section">
            <div className="lyr-label-row">
              <label className="lyr-label">AI Configuration</label>
              <button className="lyr-ai-btn" onClick={() => setShowAIConfig(true)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit
>>>>>>> main
              </button>
            </div>
          </div>

<<<<<<< logan/upload-assignment-info
      <div className="fixed bottom-8 right-8">
        <button className="flex items-center gap-2 bg-white px-6 py-3 rounded-full border border-gray-200 shadow-lg hover:shadow-xl transition-all">
          <div className="w-5 h-5 rounded-full border border-gray-400 flex items-center justify-center text-[10px]">★</div>
          View Student View
        </button>
=======
          <div className="lyr-section">
            <div className="lyr-label-row">
              <label className="lyr-label">Special Request</label>
            </div>
            <textarea className="lyr-textarea lyr-textarea-sm" value={specialRequest}
              onChange={e => setSpecialRequest(e.target.value)}
              placeholder="Any extra instructions? e.g. 'Focus on chapter 3', 'Add a word problem'..." />
          </div>

          <button className="lyr-create-btn">Create Assignment</button>
        </div>
>>>>>>> main
      </div>
    </div>
  );
}