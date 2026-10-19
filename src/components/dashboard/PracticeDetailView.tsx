import React from 'react';
import { PublicTestDetailView } from '../discovery/PublicTestDetailView';

interface PracticeDetailViewProps {
  onNavigate: (view: any, param?: string) => void;
  testId: string;
}

export const PracticeDetailView: React.FC<PracticeDetailViewProps> = ({ onNavigate, testId }) => {
  return <PublicTestDetailView onNavigate={onNavigate} testId={testId} />;
};

export default PracticeDetailView;
