import React, { useState, useRef } from 'react';
import { uploadAssignmentPdf } from '../services/api';

const BRAND = '#D96B6B';
const BRAND_LIGHT = '#F2DADA';
const BG = '#FFFFFF';
const CARD = '#FFFFFF';
const INPUT_BG = '#F4F4F6';
const TEXT = '#1C2128';
const MUTED = '#8A8FA8';
const BORDER = '#E8E8EC';

interface Props {
  classId: number;
  teacherId: number;
}

export default function AssignmentEditor({ classId, teacherId }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [specialRequest, setSpecialRequest] = useState('');
  const [files, setFiles] = useState<{ name: string; size: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showAIConfig, setShowAIConfig] = useState(false);
  const [aiConfig, setAiConfig] = useState({
    model: 'gemini-pro',
    temperature: 0.7,
    questionCount: 7,
    includeMultipleChoice: true,
    difficulty: 'medium',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files).map(f => ({
      name: f.name,
      size: (f.size / 1024 / 1024).toFixed(1) + ' MB',
    }));
    setFiles(prev => [...prev, ...dropped]);
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);

    for (const file of selected) {
      if (file.type === 'application/pdf' && title.trim()) {
        setIsUploading(true);
        setUploadError('');
        const res = await uploadAssignmentPdf(classId, teacherId, file, title.trim());
        setIsUploading(false);
        if (!res.success) {
          setUploadError(res.error || 'Upload failed.');
          continue;
        }
      }
      setFiles(prev => [...prev, {
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(1) + ' MB',
      }]);
    }
    e.target.value = '';
  };

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  return (
    <div style={{
      minHeight: '100vh',
      background: BG,
      fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

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

        .lyr-main {
          max-width: 860px;
          margin: 0 auto;
          padding: 40px 48px 80px;
        }

        .lyr-content { width: 100%; }

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
        .lyr-input-title { font-size: 20px; font-weight: 600; }
        .lyr-textarea { min-height: 120px; line-height: 1.65; }
        .lyr-textarea-sm { min-height: 90px; }

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

        .lyr-ai-btn {
          display: flex; align-items: center; gap: 5px;
          background: ${INPUT_BG}; border: none; border-radius: 8px;
          padding: 6px 11px;
          font-family: inherit; font-size: 12px; font-weight: 600;
          color: ${MUTED}; cursor: pointer;
          transition: background 0.15s, color 0.15s;
          letter-spacing: 0.1px;
        }
        .lyr-ai-btn:hover { color: ${TEXT}; background: #E4E5EA; }

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

        .lyr-error { color: #D96B6B; font-size: 13px; margin-top: 8px; }
      `}</style>

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

      <nav className="lyr-nav">
        <span className="lyr-nav-name">New Assignment</span>
        <div className="lyr-nav-spacer" />
      </nav>

      <div className="lyr-main">
        <div className="lyr-content">
          <div className="lyr-section">
            <div className="lyr-label-row">
              <label className="lyr-label">Assignment Title</label>
            </div>
            <input type="text" className="lyr-input lyr-input-title" value={title}
              onChange={e => setTitle(e.target.value)} placeholder="Untitled Assignment" />
          </div>

          <div className="lyr-section">
            <div className="lyr-label-row">
              <label className="lyr-label">Description</label>
            </div>
          )}

          <div className="lyr-section">
            <div className="lyr-label-row">
              <label className="lyr-label">Attachments</label>
            </div>
            <div className={`lyr-drop${isDragging ? ' dragging' : ''}`}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}>
              <div className="lyr-upload-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSelectAllThatApply}
                  onChange={(e) => setIncludeSelectAllThatApply(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Include &quot;select all that apply&quot; questions
              </label>
            </div>
            {isUploading && (
              <p style={{ color: MUTED, fontSize: 13, marginTop: 8 }}>Uploading...</p>
            )}
            {uploadError && (
              <p className="lyr-error">{uploadError}</p>
            )}
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
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Describe what kind of questions or assignment you want generated based on the uploaded material."
            className="w-full bg-gray-50 resize-none h-40 focus:outline-none text-gray-700 text-sm rounded-2xl p-4 border border-gray-200"
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="mt-2 px-6 py-2.5 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {isGenerating ? 'Generating…' : 'Generate with AI'}
          </button>
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
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowReview(false)}
              className="px-3 py-1.5 text-xs rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
            >
              Back to setup
            </button>
          </div>

          <div className="lyr-section">
            <div className="lyr-label-row">
              <label className="lyr-label">Special Request</label>
            </div>
            <textarea className="lyr-textarea lyr-textarea-sm" value={specialRequest}
              onChange={e => setSpecialRequest(e.target.value)}
              placeholder="Any extra instructions? e.g. 'Focus on chapter 3', 'Add a word problem'..." />
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !isSaving && setShowConfirmModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-gray-900 font-medium mb-2">Confirm Questions?</p>
            <p className="text-sm text-gray-600 mb-4">Any unsaved changes will not be applied.</p>
            {confirmError && <p className="text-sm mb-3" style={{ color: '#ba3638' }}>{confirmError}</p>}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSaving}
                className="px-4 py-2 rounded-full border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
              >
                No
              </button>
              <button
                type="button"
                onClick={handleConfirmYes}
                disabled={isSaving}
                className="px-4 py-2 rounded-full bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {isSaving ? 'Saving…' : 'Yes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
