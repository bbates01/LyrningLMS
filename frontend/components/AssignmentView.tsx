import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  ImageIcon, 
  Code, 
  Mic, 
  ArrowRight, 
  CheckCircle2,
  Circle,
  HelpCircle
} from './Icons';
import { Assignment } from '../types';
import { chatWithTutor } from '../services/aiService';
import { type AssignmentQuestionPreview } from '../services/api';

interface AssignmentViewProps {
  assignment: Assignment;
  onViewTeacherMode: () => void;
  questionsPreview?: AssignmentQuestionPreview[];
}

const AssignmentView: React.FC<AssignmentViewProps> = ({ assignment, onViewTeacherMode, questionsPreview = [] }) => {
  const [messages, setMessages] = useState<{role: 'user' | 'tutor', content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    const tutorResponse = await chatWithTutor(
      userMsg, 
      messages.map(m => ({ role: m.role, content: m.content })),
      assignment.aiInstructions || ""
    );

    setMessages(prev => [...prev, { role: 'tutor', content: tutorResponse }]);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-250px)]">
      {/* Assignment Content */}
      <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-4">
        <h2 className="text-3xl font-bold text-black">{assignment.title}</h2>
        
        <div className="bg-white border border-gray-200 rounded-3xl p-10 shadow-sm relative">
          {questionsPreview.length > 0 ? (
            <div className="space-y-8">
              {questionsPreview.map((q, idx) => (
                <div key={q.questionId || idx} className="space-y-3">
                  <p className="font-semibold text-black">
                    {q.sortOrder}. {q.questionText}
                    {q.questionType === 'select_all_that_apply' && (
                      <span className="ml-2 text-sm font-normal text-gray-500 italic">(Select all that apply)</span>
                    )}
                  </p>
                  <ul className="list-none space-y-2 pl-0">
                    {q.options.map((opt, oidx) => (
                      <li key={oidx} className="text-gray-700">
                        <span className={opt.isCorrect ? 'font-medium text-green-700' : ''}>
                          {String.fromCharCode(65 + oidx)}. {opt.optionText}
                          {opt.isCorrect ? ' (Correct)' : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="prose max-w-none text-black leading-relaxed whitespace-pre-wrap font-medium">
              {assignment.content || 'No questions for this assignment yet.'}
            </div>
          )}

          <div className="mt-12 flex items-center gap-4">
            <div className="flex-1 relative">
              <input 
                type="text" 
                placeholder="Submit Answers Here" 
                className="w-full bg-gray-50 border border-gray-300 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-[#ba3638]/30 transition-all text-black font-semibold"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 bg-gray-200 p-2 rounded-full hover:bg-gray-300 transition-colors">
                <ArrowRight className="w-5 h-5 text-black" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Tutor Sidebar */}
      <div className="w-full lg:w-[450px] flex flex-col gap-4">
        <div className="flex-1 bg-white border border-gray-100 rounded-3xl shadow-sm flex flex-col overflow-hidden">
          {/* Messages area */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 px-6">
                <div className="w-16 h-16 bg-[#ba3638]/10 rounded-2xl flex items-center justify-center">
                  <HelpCircle className="w-8 h-8 text-[#ba3638]" />
                </div>
                <div>
                  <h4 className="font-bold text-lg text-black">AI Tutor Assistant</h4>
                  <p className="text-gray-600 text-sm">Need help with a problem? Ask me anything about the assignment.</p>
                </div>
              </div>
            )}
            
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'tutor' && (
                  <div className="mr-2 mt-1">
                    <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="black" className="w-5 h-5">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                      </svg>
                    </div>
                  </div>
                )}
                <div 
                  className={`max-w-[85%] rounded-2xl p-4 text-sm font-medium ${
                    m.role === 'user' 
                      ? 'bg-[#ba3638]/10 text-black rounded-tr-none border border-[#ba3638]/20' 
                      : 'bg-gray-100 text-black rounded-tl-none border border-gray-200'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start items-center gap-2 text-gray-500 text-sm animate-pulse px-4">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                Tutor is thinking...
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="p-6 border-t border-gray-100">
             <div className="relative bg-gray-50 border border-gray-200 rounded-2xl p-4">
                <textarea 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder="Ask for a hint..." 
                  className="w-full bg-transparent resize-none h-20 focus:outline-none text-black text-sm font-medium placeholder:text-gray-400"
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="flex gap-4 text-gray-500">
                    <button className="hover:text-[#ba3638]"><ImageIcon className="w-5 h-5" /></button>
                    <button className="hover:text-[#ba3638]"><Code className="w-5 h-5" /></button>
                    <button className="hover:text-[#ba3638]"><Mic className="w-5 h-5" /></button>
                  </div>
                  <button 
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className={`p-2 rounded-full transition-all ${isLoading || !input.trim() ? 'bg-gray-200 text-gray-400' : 'bg-gray-800 text-white hover:bg-black'}`}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
             </div>
          </div>
        </div>

        <button 
          onClick={onViewTeacherMode}
          className="w-full py-3 bg-gray-100 text-black border border-gray-200 rounded-2xl hover:bg-gray-200 transition-colors font-bold text-sm"
        >
          View as Teacher
        </button>
      </div>
    </div>
  );
};

export default AssignmentView;