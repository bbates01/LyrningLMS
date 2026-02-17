
import React, { useState } from 'react';
import { Pencil, Plus, Upload, CheckCircle2 } from './Icons';
import { generateAssignment } from '../services/geminiService';
import { COLORS } from '../constants';

const AssignmentEditor: React.FC = () => {
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [result, setResult] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [files, setFiles] = useState(['classMaterial03-05-26.pdf', 'examplePracticeProblems03-05-26.pdf']);

  const handleGenerate = async () => {
    setIsGenerating(true);
    const generated = await generateAssignment(title || "Algebra Basics", files);
    setResult(generated);
    setIsGenerating(false);
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
            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100 space-y-3">
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center gap-3 text-gray-600">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                    <path d="M14 2v6h6" />
                  </svg>
                  {file}
                </div>
              ))}
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
