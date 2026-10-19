import React, { useState } from 'react';
import { BookOpen, CheckSquare, Square } from 'lucide-react';
import type { TestData } from '../../../services/testsService';

interface ExamInstructionsProps {
  testDetail: TestData;
  onAccept: (accepted: boolean) => void;
}

export const ExamInstructions: React.FC<ExamInstructionsProps> = ({ testDetail, onAccept }) => {
  const [accepted, setAccepted] = useState(false);

  const toggleAccept = () => {
    const next = !accepted;
    setAccepted(next);
    onAccept(next);
  };

  return (
    <div className="flex flex-col gap-6">
      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
        <BookOpen className="text-purple-600" />
        Exam Instructions
      </h3>

      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 h-64 overflow-y-auto custom-scrollbar text-sm text-slate-600 space-y-4">
        <div>
          <h4 className="font-bold text-slate-800 mb-1">General Rules</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>The test contains {testDetail.questions?.length || 0} questions and is {testDetail.duration} minutes long.</li>
            <li>Once started, the timer cannot be paused.</li>
            <li>Ensure you have a stable internet connection before proceeding.</li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-bold text-slate-800 mb-1">Marking Scheme</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>Total Marks: {testDetail.total_marks || 0}</li>
            {testDetail.negative_marking?.enabled ? (
              <li className="text-rose-600 font-semibold">Negative marking is enabled: -{testDetail.negative_marking.value} marks for each incorrect answer.</li>
            ) : (
              <li>No negative marking for this test.</li>
            )}
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-slate-800 mb-1">Security & Violations</h4>
          <ul className="list-disc pl-5 space-y-1">
            {testDetail.security_settings?.require_fullscreen && <li>Exiting fullscreen mode will be recorded as a violation.</li>}
            {testDetail.security_settings?.require_webcam && <li>Your webcam feed is being monitored. Multiple faces or absence from screen may result in disqualification.</li>}
            <li>Switching tabs or opening other applications is strictly prohibited.</li>
            <li>Multiple violations will result in automatic submission of the test.</li>
          </ul>
        </div>
      </div>

      <div 
        className="flex items-start gap-3 p-4 bg-purple-50/50 border border-purple-100 rounded-xl cursor-pointer hover:bg-purple-50 transition-colors"
        onClick={toggleAccept}
      >
        <button className="mt-0.5 focus:outline-none shrink-0 text-purple-600">
          {accepted ? <CheckSquare size={20} /> : <Square size={20} />}
        </button>
        <p className="text-sm font-semibold text-slate-700 leading-snug">
          I confirm that I have read and understood the instructions. I will attempt this examination honestly and understand that violations may result in disqualification.
        </p>
      </div>
    </div>
  );
};
