import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import GridPuzzle from "@/components/GridPuzzle";
import MathQuestion from "@/components/MathQuestion";
import LogicQuestion from "@/components/LogicQuestion";
import { ArrowLeft, Clock, CheckCircle, XCircle, Trophy, RotateCcw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getActivityById, submitAttempt, postJson, validateSubmission, selectHint } from "@/lib/api";
import { ValidationService } from "@/lib/validation";

// Mock activity data with content
const mockActivityContent = {
  "1": {
    id: "1",
    title: "Basic Sudoku Challenge",
    worksheetLevel: "Grade 5",
    type: "Grid-based",
    difficulty: "Easy",
    problemStatement: "Complete this 9x9 Sudoku puzzle by filling in the missing numbers. Each row, column, and 3x3 box must contain all digits from 1 to 9.",
    content: {
      grid: [
        [5, 3, 0, 0, 7, 0, 0, 0, 0],
        [6, 0, 0, 1, 9, 5, 0, 0, 0],
        [0, 9, 8, 0, 0, 0, 0, 6, 0],
        [8, 0, 0, 0, 6, 0, 0, 0, 3],
        [4, 0, 0, 8, 0, 3, 0, 0, 1],
        [7, 0, 0, 0, 2, 0, 0, 0, 6],
        [0, 6, 0, 0, 0, 0, 2, 8, 0],
        [0, 0, 0, 4, 1, 9, 0, 0, 5],
        [0, 0, 0, 0, 8, 0, 0, 7, 9]
      ],
      answer: [
        [5, 3, 4, 6, 7, 8, 9, 1, 2],
        [6, 7, 2, 1, 9, 5, 3, 4, 8],
        [1, 9, 8, 3, 4, 2, 5, 6, 7],
        [8, 5, 9, 7, 6, 1, 4, 2, 3],
        [4, 2, 6, 8, 5, 3, 7, 9, 1],
        [7, 1, 3, 9, 2, 4, 8, 5, 6],
        [9, 6, 1, 5, 3, 7, 2, 8, 4],
        [2, 8, 7, 4, 1, 9, 6, 3, 5],
        [3, 4, 5, 2, 8, 6, 1, 7, 9]
      ]
    }
  },
  "2": {
    id: "2",
    title: "Algebra Fundamentals",
    worksheetLevel: "Grade 8",
    type: "Mathematical",
    difficulty: "Medium",
    problemStatement: "Solve these algebraic equations and show your work. Focus on isolating variables and understanding the order of operations.",
    content: {
      math: [
        { id: "1", question: "Solve for x: 2x + 5 = 13", answer: 4 },
        { id: "2", question: "What is 15% of 80?", answer: 12 },
        { id: "3", question: "If y = 3x - 2 and x = 5, what is y?", answer: 13 },
        { id: "4", question: "Solve: 4(x - 3) = 16", answer: 7 },
        { id: "5", question: "What is the value of x in: x/3 + 7 = 12?", answer: 15 }
      ]
    }
  },
  "3": {
    id: "3",
    title: "Pattern Recognition",
    worksheetLevel: "Grade 6",
    type: "Logical",
    difficulty: "Hard",
    problemStatement: "Identify patterns in sequences and logical relationships. Use deductive reasoning to solve these brain teasers.",
    content: {
      logic: [
        { id: "1", question: "What comes next in the sequence: 2, 6, 18, 54, ?", type: "text" as const, answer: "162" },
        { id: "2", question: "If all cats are animals and some animals are pets, which is true?", type: "multiple-choice" as const, options: ["All cats are pets", "Some cats might be pets", "No cats are pets", "All pets are cats"], answer: "Some cats might be pets" },
        { id: "3", question: "Complete the pattern: A1, C3, E5, G7, ?", type: "text" as const, answer: "I9" },
        { id: "4", question: "Which number doesn't belong: 4, 9, 16, 20, 25?", type: "multiple-choice" as const, options: ["4", "9", "16", "20"], answer: "20" }
      ]
    }
  }
};

const ActivityDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, token } = useAuth();
  
  const [activity, setActivity] = useState<any>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [startTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);

  // Verify that the user is a student, redirect if not
  useEffect(() => {
    if (user && user.role !== 'student') {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access student activities",
        variant: "destructive"
      });
      navigate("/");
    }
  }, [user, navigate, toast]);

  useEffect(() => {
    const fetchActivity = async () => {
      if (!id || !token) return;
      
      try {
        setIsLoading(true);
        const activityData = await getActivityById(id, token);
        console.log('Backend activity data:', activityData);
        console.log('UI Config from backend:', activityData.ui_config);
        
        // Transform the data to match our component's expected format
        const transformedActivity = {
          id: activityData.id,
          title: activityData.title,
          worksheetLevel: activityData.worksheet_level,
          type: activityData.type,
          difficulty: activityData.difficulty,
          problemStatement: activityData.problem_statement,
          createdAt: activityData.created_at,
          userId: activityData.user_id,
          content: activityData.ui_config || {},
          validation_function: activityData.validation_function,
          input_example: activityData.input_example,
          expected_output: activityData.expected_output
        };
        
        // If we don't have content from the backend, create single-question content based on activity
        if (!transformedActivity.content || Object.keys(transformedActivity.content).length === 0) {
          console.log('No ui_config found, creating single-question fallback content');
          
          // Check if this is a legacy activity with mock data
          if (mockActivityContent[id as keyof typeof mockActivityContent]) {
            transformedActivity.content = mockActivityContent[id as keyof typeof mockActivityContent].content;
          } else {
            // Create single-question content based on the activity's problem statement
            if (transformedActivity.type === 'Grid-based') {
              transformedActivity.content = {
                grid: [
                  [5, 3, 0, 0, 7, 0, 0, 0, 0],
                  [6, 0, 0, 1, 9, 5, 0, 0, 0],
                  [0, 9, 8, 0, 0, 0, 0, 6, 0],
                  [8, 0, 0, 0, 6, 0, 0, 0, 3],
                  [4, 0, 0, 8, 0, 3, 0, 0, 1],
                  [7, 0, 0, 0, 2, 0, 0, 0, 6],
                  [0, 6, 0, 0, 0, 0, 2, 8, 0],
                  [0, 0, 0, 4, 1, 9, 0, 0, 5],
                  [0, 0, 0, 0, 8, 0, 0, 7, 9]
                ]
              };
            } else if (transformedActivity.type === 'Mathematical') {
              // Create SINGLE question based on activity's problem statement
              transformedActivity.content = {
                math: [
                  { 
                    id: "1", 
                    question: transformedActivity.problemStatement || "Math problem", 
                    answer: 0 
                  }
                ]
              };
            } else if (transformedActivity.type === 'Logical') {
              // Create SINGLE logic question based on activity's problem statement
              transformedActivity.content = {
                logic: [
                  { 
                    id: "1", 
                    question: transformedActivity.problemStatement || "Logic problem", 
                    type: "text" as const, 
                    answer: "" 
                  }
                ]
              };
            }
          }
        }
        
        setActivity(transformedActivity);
      } catch (error) {
        console.error('Failed to fetch activity:', error);
        toast({
          title: "Failed to load activity",
          description: "Please try again later",
          variant: "destructive"
        });
        navigate('/student');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchActivity();
  }, [id, token, navigate, toast]);

  const calculateScore = (userAnswers: any, correctAnswers: any, type: string) => {
    if (type === 'Grid-based') {
      let correct = 0;
      let total = 0;
      for (let i = 0; i < correctAnswers.length; i++) {
        for (let j = 0; j < correctAnswers[i].length; j++) {
          total++;
          if (userAnswers[i][j] === correctAnswers[i][j]) {
            correct++;
          }
        }
      }
      return { correct, total, percentage: Math.round((correct / total) * 100) };
    } else if (type === 'Mathematical') {
      let correct = 0;
      correctAnswers.forEach((problem: any) => {
        if (userAnswers[problem.id] === problem.answer) {
          correct++;
        }
      });
      return { correct, total: correctAnswers.length, percentage: Math.round((correct / correctAnswers.length) * 100) };
    } else if (type === 'Logical') {
      let correct = 0;
      correctAnswers.forEach((problem: any) => {
        if (userAnswers[problem.id]?.toString() === problem.answer.toString()) {
          correct++;
        }
      });
      return { correct, total: correctAnswers.length, percentage: Math.round((correct / correctAnswers.length) * 100) };
    }
    return { correct: 0, total: 0, percentage: 0 };
  };

  // Helper: deep equality for comparing outputs
  const deepEqual = (a: any, b: any): boolean => {
    if (typeof a === 'number' && typeof b === 'number') {
      return Math.abs(a - b) < 1e-6;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      const aKeys = Object.keys(a);
      const bKeys = Object.keys(b);
      if (aKeys.length !== bKeys.length) return false;
      for (const k of aKeys) {
        if (!deepEqual(a[k], b[k])) return false;
      }
      return true;
    }
    return String(a) === String(b);
  };

  // Helper: extract function name and params from code
  const extractFunctionMeta = (code: string): { name: string; params: string[] } => {
    let name = 'calculateAnswer';
    let params: string[] = [];
    const fnMatch = code.match(/function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/);
    if (fnMatch) {
      name = fnMatch[1];
      params = fnMatch[2].split(',').map(s => s.trim()).filter(Boolean);
      return { name, params };
    }
    const arrowMatch = code.match(/const\s+([a-zA-Z0-9_]+)\s*=\s*\(([^)]*)\)\s*=>/);
    if (arrowMatch) {
      name = arrowMatch[1];
      params = arrowMatch[2].split(',').map(s => s.trim()).filter(Boolean);
    }
    return { name, params };
  };

  // Helper: build callable and invoke with either object or positional args
  const evaluateCodeWithInput = (code: string, input: any): any => {
    const { name, params } = extractFunctionMeta(code);
    const fn: any = new Function(`${code}; return ${name};`)();
    if (params.length > 1 && input && typeof input === 'object' && !Array.isArray(input)) {
      const args = params.map(p => (input as any)[p]);
      return fn(...args);
    }
    return fn(input);
  };

  const handleSubmit = async (answers: any) => {
    console.log('[Submit] User answers:', answers);
    console.log('[Submit] Activity payload:', activity);
    if (!token || !activity || !id) return;
    
    const endTime = new Date();
    const timeSpent = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
    
    console.log('Activity:', activity);
    console.log('Submitting answers:', answers);
    
    // Grid-based: validate by executing validation function(s) with the submitted grid
    if (activity.type === 'Grid-based') {
      let validationResult: any = {
        is_correct: false,
        feedback: '',
        confidence_score: 0,
        metadata: {}
      };
      try {
        // Collect validation function code blocks
        let codes: string[] = [];
        try {
          const vfMap = JSON.parse(activity.validation_function || '');
          if (vfMap && typeof vfMap === 'object') {
            codes = Object.values(vfMap as Record<string, string>).map(String);
          }
        } catch {
          if (typeof activity.validation_function === 'string' && activity.validation_function.trim()) {
            codes = [activity.validation_function];
          }
        }

        // Fallback: if no codes found, mark as error
        if (!codes.length) {
          throw new Error('No validation function available for this grid activity');
        }

        // Evaluate all available validators; consider correct if any returns true
        let anyError = false;
        const errors: string[] = [];
        let isCorrect = false;
        for (const code of codes) {
          try {
            const result = evaluateCodeWithInput(String(code), answers);
            // Accept various truthy formats from validators
            const ok = (typeof result === 'boolean') ? result
              : (result && typeof result === 'object' && 'isValid' in result) ? Boolean((result as any).isValid)
              : (typeof result === 'number') ? result === 1
              : false;
            if (ok) {
              isCorrect = true;
              break;
            }
          } catch (e: any) {
            anyError = true;
            errors.push(String(e?.message || e));
          }
        }

        validationResult = {
          is_correct: isCorrect,
          feedback: isCorrect ? 'Correct! Well done!' : (anyError ? 'Validation error. Please check your grid and try again.' : 'Grid solution is incorrect. Try again.'),
          confidence_score: isCorrect ? 1 : 0,
          metadata: { errors }
        };
      } catch (error: any) {
        validationResult = {
          is_correct: false,
          feedback: 'Error validating grid submission.',
          confidence_score: 0,
          metadata: { error: String(error?.message || error) }
        };
      }

      const scoreData = {
        correct: validationResult.is_correct ? 1 : 0,
        total: 1,
        percentage: validationResult.is_correct ? 100 : 0
      };

      const result = {
        score: scoreData,
        timeSpent,
        userAnswers: answers,
        feedback: validationResult.feedback,
        testsPassed: undefined,
        totalTests: undefined,
        perQuestionTests: {},
        perQuestionTestDetails: {},
        hintsByQuestion: {}
      };

      try {
        await submitAttempt(id, {
          submission: answers,
          time_spent_seconds: timeSpent,
          is_correct: validationResult.is_correct,
          score_percentage: scoreData.percentage,
          feedback: validationResult.feedback,
          confidence_score: validationResult.confidence_score || 0
        }, token);
      } catch (error) {
        console.error('Error submitting attempt:', error);
      }

      setSubmissionResult(result);
      setIsSubmitted(true);
      toast({
        title: 'Assignment Submitted!',
        description: `You scored ${result.score.percentage}% - ${result.feedback}`,
        variant: result.score.percentage >= 60 ? 'default' : 'destructive'
      });
      return; // Do not continue with non-grid flow
    }
    
      // Execute validation function(s) from activity - handle multiple questions (non-grid)
    let validationResult;
    try {
      if (!activity.validation_function) {
        console.log('No validation function found in activity');
        throw new Error("No validation function available");
      }
      
      console.log('[Submit] Validation function(s) string (may be single or JSON of many):', activity.validation_function);
      console.log('[Submit] Submitting answers for validation:', answers);
      
      // Check if we have multiple validation functions (JSON format)
      let validationFunctions;
      try {
        validationFunctions = JSON.parse(activity.validation_function);
        console.log('Parsed multiple validation functions:', validationFunctions);
      } catch (error) {
        console.log('error:', error);
        // Single validation function (legacy format)
        validationFunctions = null;
      }

      
      if (validationFunctions && typeof validationFunctions === 'object') {
        // Multiple questions - evaluate each with stored input example and compare to student answer
        const questionResults = {} as any;
        let totalCorrect = 0;
        let totalQuestions = 0;
        let overallFeedback: string[] = [];

        for (const [questionId, validationCode] of Object.entries(validationFunctions)) {
          if (answers.hasOwnProperty(questionId)) {
            totalQuestions++;
            try {
              const questionIdx = Number(questionId) - 1;
              const questionNode = (activity.content?.math || activity.content?.logic)?.[questionIdx] || {};
              const inputExample = questionNode.input_example ?? activity.input_example;
              console.log(`[Submit] Q${questionId} input_example:`, inputExample);

              const expectedAnswer = evaluateCodeWithInput(String(validationCode), inputExample);
              console.log(`[Submit] Q${questionId} evaluated expectedAnswer from code:`, expectedAnswer);

              // Normalize user answer
              const userAnswer = (answers as any)[questionId];
              const isCorrect = deepEqual(userAnswer, expectedAnswer);

              questionResults[questionId] = {
                is_correct: isCorrect,
                user_answer: userAnswer,
                expected_answer: expectedAnswer
              };

              overallFeedback.push(`Question ${questionId}: ${isCorrect ? 'Correct!' : 'Incorrect.'}`);
              if (isCorrect) totalCorrect++;
            } catch (error: any) {
              console.error(`Error validating question ${questionId}:`, error);
              questionResults[questionId] = { is_correct: false, error: String(error?.message || error) };
              overallFeedback.push(`Question ${questionId}: Validation error.`);
            }
          }
        }

        const scorePercentage = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
        validationResult = {
          is_correct: totalCorrect === totalQuestions && totalQuestions > 0,
          feedback: `Score: ${totalCorrect}/${totalQuestions} (${scorePercentage.toFixed(1)}%) - ${overallFeedback.join(' ')}`,
          confidence_score: scorePercentage / 100,
          metadata: {
            question_results: questionResults,
            total_correct: totalCorrect,
            total_questions: totalQuestions
          }
        };

      } else {
        // Single question validation (legacy)
        try {
          const code = String(activity.validation_function || '');
          const inputExample = activity.input_example ?? activity.content?.math?.[0]?.input_example ?? activity.content?.logic?.[0]?.input_example;

          const expectedAnswer = evaluateCodeWithInput(code, inputExample);

          // Determine user's single answer
          let userAnswer: any = answers;
          if (answers && typeof answers === 'object' && !Array.isArray(answers)) {
            const keys = Object.keys(answers);
            if (keys.length > 0) userAnswer = (answers as any)[keys[0]];
          }

          const isCorrect = deepEqual(userAnswer, expectedAnswer);
          validationResult = {
            is_correct: isCorrect,
            feedback: isCorrect ? 'Correct! Well done!' : 'Not quite right. Please try again.',
            confidence_score: isCorrect ? 1 : 0,
            metadata: { expected_answer: expectedAnswer, user_answer: userAnswer }
          };
        } catch (err: any) {
          console.error('Validation error (single question):', err);
          validationResult = { is_correct: false, feedback: 'Error validating submission.', confidence_score: 0 };
        }
      }
      
      console.log('[Submit] Final validation result:', validationResult);
      
    } catch (error) {
      console.error('Error executing validation function:', error);
      validationResult = {
        is_correct: false,
        feedback: "Error validating submission: " + error.message,
        confidence_score: 0
      };
    }
    
    // Calculate score based on validation result
    let scoreData;
    if (validationResult.metadata && validationResult.metadata.total_questions) {
      // Multiple questions
      scoreData = {
        correct: validationResult.metadata.total_correct,
        total: validationResult.metadata.total_questions,
        percentage: (validationResult.metadata.total_correct / validationResult.metadata.total_questions) * 100
      };
    } else {
      // Single question
      scoreData = {
        correct: validationResult.is_correct ? 1 : 0,
        total: 1,
        percentage: validationResult.is_correct ? 100 : 0
      };
    }

    // Derive per-question tests map for UI
    const perQuestionTests: Record<string, { passed: number; total: number }> = {};
    const perQuestionTestDetails: Record<string, Array<{ input: any; expected: any; actual: any; passed: boolean }>> = {};
    if (validationResult?.metadata?.question_results) {
      for (const [qid, info] of Object.entries(validationResult.metadata.question_results as any)) {
        // Clamp totals to at most 5 for UI consistency
        const total = Math.min(5, Number((info as any).tests_total || 0));
        const passed = Math.min(total, Number((info as any).tests_passed || 0));
        perQuestionTests[qid] = { passed, total };
        if ((info as any).test_details) {
          perQuestionTestDetails[qid] = ((info as any).test_details as any[]).slice(0, 5);
        }
      }
    }

    const result = {
      score: scoreData,
      timeSpent,
      userAnswers: answers,
      feedback: validationResult.feedback || (validationResult.is_correct ? 'Correct!' : 'Incorrect. Try again.'),
      testsPassed: validationResult?.metadata?.total_tests_passed,
      totalTests: validationResult?.metadata?.total_tests,
      perQuestionTests,
      perQuestionTestDetails,
      hintsByQuestion: {}
    };
    console.log('[Submit] Summary:', result);

    try {
      // Submit attempt with validation results to the database
      await submitAttempt(id, {
        submission: answers,
        time_spent_seconds: timeSpent,
        is_correct: validationResult.is_correct,
        score_percentage: scoreData.percentage,
        feedback: validationResult.feedback,
        confidence_score: validationResult.confidence_score || 0
      }, token);
      
      // If not fully correct, fetch a hint per incorrect question
      try {
        if (!validationResult.is_correct) {
          const hintsByQuestion: Record<string, string> = {};
          if (typeof activity.validation_function === 'string') {
            // Multiple-questions case: validation_function may be JSON map
            try {
              const vfMap = JSON.parse(activity.validation_function);
              for (const qid of Object.keys(answers || {})) {
                // Only fetch hint if wrong
                const qRes = (validationResult.metadata?.question_results || {})[qid];
                if (!qRes || qRes.is_correct) continue;
                const res = await selectHint(id, (answers as any)[qid], token, qid);
                hintsByQuestion[qid] = res.hint;
              }
            } catch {
              // Single question fallback
              if (!validationResult.is_correct) {
                const firstKey = Object.keys(answers || {})[0];
                const res = await selectHint(id, firstKey ? (answers as any)[firstKey] : answers, token);
                hintsByQuestion['1'] = res.hint;
              }
            }
          }
          result.hintsByQuestion = hintsByQuestion;
        }
      } catch (e) {
        console.warn('Hint selection failed:', e);
      }
      
      setSubmissionResult(result);
      setIsSubmitted(true);

      toast({
        title: "Assignment Submitted!",
        description: `You scored ${result.score.percentage}% - ${result.feedback}`,
        variant: result.score.percentage >= 60 ? "default" : "destructive"
      });
      
    } catch (error) {
      console.error('Error submitting attempt:', error);
      toast({
        title: "Error saving attempt",
        description: "Could not save your attempt to the server",
        variant: "destructive"
      });
    }
  };

  const handleSubmit_ = async (answers: any) => {
    const answerMap={}
    const validation_function = JSON.parse(activity.validation_function);

    for (const key in answers){
      const validateAnswer = new Function(`
        ${validation_function[key]}
        
        // Find the function name dynamically
        const funcName = ${validation_function[key]};
            return eval(funcName);
        
    `);
    const input_example = activity.content.math[Number(key)-1].input_example;
      const actualAnswer = validateAnswer()(input_example);
      const compareAnswer=actualAnswer==answers[key];

      console.log('aaaaaaaaaaaaaaaaaaaaa:', actualAnswer,compareAnswer,answers[key]);


    }


  }

  const handleTryAgain = () => {
    setIsSubmitted(false);
    setSubmissionResult(null);
    window.location.reload();
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-easy-background text-easy border-easy/20';
      case 'medium': return 'bg-medium-background text-medium border-medium/20';
      case 'hard': return 'bg-hard-background text-hard border-hard/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-subtle-gradient flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-bold">Loading activity...</h2>
        </div>
      </div>
    );
  }
  
  if (!activity) {
    return (
      <div className="min-h-screen bg-subtle-gradient flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Activity not found</h2>
          <Button onClick={() => navigate('/student')}>
            Back to Portal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-subtle-gradient">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/student')} className="flex items-center space-x-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Portal</span>
          </Button>
          
          {!isSubmitted && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Started {startTime.toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        {/* Activity Header */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{activity.title}</CardTitle>
                <CardDescription className="text-lg mt-1">
                  {activity.worksheetLevel} • {activity.type}
                </CardDescription>
              </div>
              <Badge variant="outline" className={getDifficultyColor(activity.difficulty)}>
                {activity.difficulty}
              </Badge>
            </div>
            <p className="text-foreground/80 mt-4">{activity.problemStatement}</p>
          </CardHeader>
        </Card>

        {/* Submission Results */}
        {isSubmitted && submissionResult && (
          <Card className="shadow-elegant border-2 border-primary/20">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                {submissionResult.score.percentage >= 60 ? (
                  <Trophy className="w-8 h-8 text-warning" />
                ) : (
                  <XCircle className="w-8 h-8 text-destructive" />
                )}
                <CardTitle className="text-3xl">
                  {submissionResult.score.percentage}%
                </CardTitle>
              </div>
              <CardDescription className="text-lg">
                {submissionResult.feedback}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-success">
                    {submissionResult.score.correct}
                  </div>
                  <div className="text-sm text-muted-foreground">Correct</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-destructive">
                    {submissionResult.score.total - submissionResult.score.correct}
                  </div>
                  <div className="text-sm text-muted-foreground">Incorrect</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {formatTime(submissionResult.timeSpent)}
                  </div>
                  <div className="text-sm text-muted-foreground">Time Spent</div>
                </div>
              </div>
              
              <Progress 
                value={submissionResult.score.percentage} 
                className="h-3"
              />
              
              <div className="flex justify-center space-x-4 pt-4">
                <Button variant="outline" onClick={handleTryAgain}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={() => navigate('/student')}>
                  Back to Portal
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Activity Content */}
        <Card className="shadow-card">
          <CardContent className="pt-6">
            {activity.type === 'Grid-based' && (
              <div className="space-y-6">
                {Array.isArray(activity.content.grid) && activity.content.grid.length > 0 ? (
                  // New format: grid is an array of grid objects
                  activity.content.grid.map((gridItem: any, index: number) => (
                    <div key={gridItem.id || index} className="space-y-4">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold mb-2">{gridItem.question || `Grid Puzzle ${index + 1}`}</h3>
                        <div className="text-sm text-muted-foreground mb-4">
                          {gridItem.grid_size && `${gridItem.grid_size.rows}×${gridItem.grid_size.cols} Grid`}
                          {gridItem.difficulty && ` • ${gridItem.difficulty}`}
                        </div>
                      </div>
                      <GridPuzzle
                        gridData={gridItem.initial_grid || []}
                        gridSize={gridItem.grid_size}
                        onSubmit={(answers) => handleSubmit(answers)}
                        isReadOnly={isSubmitted}
                        correctAnswer={isSubmitted ? gridItem.solution_grid : undefined}
                      />
                    </div>
                  ))
                ) : (
                  // Legacy format: grid is directly a 2D array
                  <GridPuzzle
                    gridData={activity.content.grid || []}
                    onSubmit={handleSubmit}
                    isReadOnly={isSubmitted}
                    correctAnswer={isSubmitted ? activity.content.answer : undefined}
                  />
                )}
              </div>
            )}

            {activity.type === 'Mathematical' && (
              <MathQuestion
                problems={activity.content.math}
                onSubmit={handleSubmit}
                isReadOnly={isSubmitted}
                showResults={isSubmitted}
                showTests={false}
                userAnswers={submissionResult?.userAnswers}
                perQuestionTests={submissionResult?.perQuestionTests}
                perQuestionTestDetails={submissionResult?.perQuestionTestDetails}
                hintsByQuestion={submissionResult?.hintsByQuestion}
              />
            )}

            {activity.type === 'Logical' && (
              <LogicQuestion
                problems={activity.content.logic}
                onSubmit={handleSubmit}
                isReadOnly={isSubmitted}
                showResults={isSubmitted}
                showTests={false}
                userAnswers={submissionResult?.userAnswers}
                perQuestionTests={submissionResult?.perQuestionTests}
                perQuestionTestDetails={submissionResult?.perQuestionTestDetails}
                hintsByQuestion={submissionResult?.hintsByQuestion}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ActivityDetail;