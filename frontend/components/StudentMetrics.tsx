
import React, { useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LabelList
} from 'recharts';
import { Student, StudentStats } from '../types';
import { MOCK_STATS, COLORS } from '../constants';

interface StudentMetricsProps {
  student: Student;
}

const StudentMetrics: React.FC<StudentMetricsProps> = ({ student }) => {
  const [activeMetric, setActiveMetric] = useState<'understanding' | 'dependency' | 'engagement'>('engagement');
  const stats = MOCK_STATS; // In a real app, fetch based on student.id

  const metricConfig = {
    understanding: {
      label: 'Understanding Over Time (6 Weeks)',
      color: '#3b82f6', // Blue
      yLabel: 'Understanding Score',
      value: stats.understanding,
      data: stats.history.understanding
    },
    dependency: {
      label: 'AI Dependency Over Time (6 Weeks)',
      color: '#f87171', // Red/Pink
      yLabel: 'AI Dependency Percentage',
      value: stats.dependency,
      data: stats.history.dependency
    },
    engagement: {
      label: 'Engagement Over Time (6 Weeks)',
      color: '#4ade80', // Green
      yLabel: 'Engagement Percentage',
      value: stats.engagement,
      data: stats.history.engagement
    }
  };

  const current = metricConfig[activeMetric];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <h2 className="text-4xl font-bold text-gray-900">Student Metrics: {student.name}</h2>
        <img src={student.avatar} className="w-12 h-12 rounded-full" alt={student.name} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar Cards */}
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
            <h3 className="text-xl font-semibold mb-6 text-gray-900">Last three weeks:</h3>
            
            <div 
              className={`space-y-4 cursor-pointer transition-all ${activeMetric === 'understanding' ? 'scale-105' : 'opacity-70'}`}
              onClick={() => setActiveMetric('understanding')}
            >
              <div className="text-6xl font-bold text-blue-500">{stats.understanding}%</div>
              <div className="text-lg text-gray-700">Understanding</div>
            </div>

            <div className="h-px bg-gray-200 my-6"></div>

            <div 
              className={`space-y-4 cursor-pointer transition-all ${activeMetric === 'dependency' ? 'scale-105' : 'opacity-70'}`}
              onClick={() => setActiveMetric('dependency')}
            >
              <div className="text-6xl font-bold" style={{ color: COLORS.primary }}>{stats.dependency}%</div>
              <div className="text-lg text-gray-700">AI Dependency</div>
            </div>

            <div className="h-px bg-gray-200 my-6"></div>

            <div 
              className={`space-y-4 cursor-pointer transition-all ${activeMetric === 'engagement' ? 'scale-105' : 'opacity-70'}`}
              onClick={() => setActiveMetric('engagement')}
            >
              <div className="text-6xl font-bold text-green-500">{stats.engagement}%</div>
              <div className="text-lg text-gray-700">Engagement</div>
            </div>
          </div>
        </div>

        {/* Chart Area */}
        <div className="lg:col-span-2 bg-gray-50 rounded-2xl p-8 border border-gray-100 flex flex-col items-center">
          <h3 className="text-2xl font-semibold mb-12 text-center text-gray-900">
            {current.label} - {student.name}
          </h3>
          
          <div className="w-full h-[400px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={current.data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                  dataKey="week" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6b7280', fontSize: 14 }}
                  tickFormatter={(val) => activeMetric === 'engagement' ? val : `Week ${val}`}
                />
                <YAxis 
                  domain={[0, 100]} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6b7280', fontSize: 14 }}
                  label={{ 
                    value: current.yLabel, 
                    angle: -90, 
                    position: 'insideLeft', 
                    style: { textAnchor: 'middle', fill: '#6b7280', fontWeight: 500 } 
                  }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [`${value}%`, 'Score']}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={current.color} 
                  strokeWidth={4} 
                  dot={{ r: 8, fill: current.color, strokeWidth: 0 }}
                  activeDot={{ r: 10, strokeWidth: 0 }}
                >
                  <LabelList 
                    dataKey="value" 
                    position="top" 
                    offset={15} 
                    style={{ fill: '#333', fontWeight: 'bold', fontSize: 16 }} 
                  />
                </Line>
              </LineChart>
            </ResponsiveContainer>
            
            {activeMetric === 'engagement' && (
               <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 text-gray-500 font-medium">Weeks</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentMetrics;
