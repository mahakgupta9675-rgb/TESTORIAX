import { supabase } from '../lib/supabaseClient';
import type { Question } from '../components/builder/QuestionTypes';

export const aiService = {
  async generateTest(
    topic: string, 
    difficulty: 'easy' | 'medium' | 'hard' | 'mixed', 
    numQuestions: number,
    patternText?: string
  ) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error("Authentication required. Please log in to generate tests.");
    }

    const selectedQuestionTypes = ['mcq', 'fillup', 'true_false', 'coding', 'match'];

    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        topic: topic.trim(),
        difficulty: difficulty === 'mixed' ? 'medium' : difficulty,
        totalQuestions: numQuestions,
        selectedQuestionTypes,
        patternText: patternText || ''
      })
    });

    if (!response.ok) {
      let errMessage = 'Failed to generate questions.';
      try {
        const errData = await response.json();
        errMessage = errData.error || errMessage;
      } catch {}
      throw new Error(errMessage);
    }

    const rawQuestions = await response.json();
    if (!Array.isArray(rawQuestions)) {
      throw new Error('Invalid response format received from AI endpoint.');
    }

    const questions: Question[] = rawQuestions.map((q: any, idx: number) => {
      const qId = `ai-gen-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`;
      const rawType = String(q.questionType || '').toLowerCase();
      
      let type: Question['type'] = 'mcq';
      if (rawType === 'mcq') type = 'mcq';
      else if (rawType === 'fillup' || rawType === 'fillups') type = 'fillups';
      else if (rawType === 'true_false' || rawType === 'true-false') type = 'true-false';
      else if (rawType === 'coding') type = 'coding';
      else if (rawType === 'match' || rawType === 'matching') type = 'matching';

      const baseQ: any = {
        id: qId,
        type,
        text: q.question || q.problemStatement || '',
        points: q.marks || 5,
        difficulty: q.difficulty || difficulty,
        explanation: q.explanation || ''
      };

      if (type === 'mcq') {
        const options = Array.isArray(q.options) && q.options.length > 0 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'];
        const ansIndex = options.findIndex((opt: string) => 
          String(opt).trim().toLowerCase() === String(q.correctAnswer || '').trim().toLowerCase()
        );
        baseQ.mcqData = {
          options,
          correctOptionIndex: ansIndex >= 0 ? ansIndex : 0
        };
      } else if (type === 'true-false') {
        const ansStr = String(q.correctAnswer).toLowerCase();
        baseQ.trueFalseData = {
          correctAnswer: ansStr === 'true' || ansStr === 'yes' || ansStr === 't' || q.correctAnswer === true
        };
      } else if (type === 'fillups') {
        baseQ.fillupsData = {
          sentence: q.question || '',
          answers: q.correctAnswer ? [String(q.correctAnswer)] : ['']
        };
      } else if (type === 'coding') {
        baseQ.codingData = {
          language: Array.isArray(q.languages) && q.languages.length > 0 ? q.languages[0] : 'javascript',
          starterCode: q.starterCode || 'function solution() {\n  // Write code here\n}',
          solutionCode: '',
          testCases: Array.isArray(q.testCases) ? q.testCases : [{ input: q.sampleInput || '', expectedOutput: q.sampleOutput || '' }]
        };
      } else if (type === 'matching') {
        baseQ.matchingData = {
          pairs: Array.isArray(q.answer) ? q.answer : (Array.isArray(q.left) ? q.left.map((l: string, i: number) => ({ left: l, right: (q.right || [])[i] || '' })) : [])
        };
      }

      return baseQ as Question;
    });

    const estimatedTime = questions.reduce((sum: number, q: Question) => {
      if (q.type === 'coding') return sum + 10;
      if (q.type === 'custom') return sum + 5;
      if (q.type === 'fillups') return sum + 2;
      if (q.type === 'matching') return sum + 3;
      return sum + 1.5; 
    }, 0);

    const totalPoints = questions.reduce((sum: number, q: Question) => sum + (q.points || 5), 0);

    return {
      title: `${topic} Assessment`,
      topic,
      difficulty,
      questions,
      estimatedTime: Math.round(estimatedTime),
      totalPoints
    };
  }
};

export default aiService;
