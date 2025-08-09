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
import { getActivityById, submitAttempt, postJson, validateSubmission } from "@/lib/api";
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

  const handleSubmit = async (answers: any) => {
    console.log('[Submit] User answers:', answers);
    console.log('[Submit] Activity payload:', activity);
    if (!token || !activity || !id) return;
    
    const endTime = new Date();
    const timeSpent = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
    
    console.log('Activity:', activity);
    console.log('Submitting answers:', answers);
    
    // Execute validation function(s) from activity - handle multiple questions
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
        // Multiple questions - validate each answer with its corresponding function
        const questionResults = {} as any;
        let totalCorrect = 0;
        let totalQuestions = 0;
        let totalTests = 0;
        let totalTestsPassed = 0;
        let overallFeedback = [];
        
        for (const [questionId, validationCode] of Object.entries(validationFunctions)) {
          if (answers.hasOwnProperty(questionId)) {
            totalQuestions++;
            
            try {
              // Get input example and expected output from activity
              const questionIdx = Number(questionId) - 1;
              const questionNode = (activity.content?.math || activity.content?.logic)?.[questionIdx] || {};
              const inputExample = questionNode.input_example;
              const questionValidationTests = questionNode.validation_tests || [];
              console.log(`[Submit] Q${questionId} input_example:`, inputExample);
              console.log(`[Submit] Q${questionId} validation_tests:`, questionValidationTests);

              // Create function to validate answer
              const validateAnswer = new Function(`
                ${validationCode}
                 const funcName = ${validationCode};
            return eval(funcName);
              `);
              const actualAnswer = validateAnswer()(inputExample);
              const expectedAnswer = actualAnswer;
              console.log(`[Submit] Q${questionId} evaluated expectedAnswer from code:`, expectedAnswer);
              
              // Get user's answer for this specific question
              const userAnswer = answers[questionId];
              const userNum = typeof userAnswer === 'string' ? parseFloat(userAnswer) : userAnswer;
              const expectedNum = typeof expectedAnswer === 'string' ? parseFloat(expectedAnswer) : expectedAnswer;
              
              const isCorrect = !isNaN(userNum) && !isNaN(actualAnswer) && Math.abs(userNum - actualAnswer) < 0.0001;
              // Evaluate LLM-provided validation tests for this question using the generated function
              let passedCountForQuestion = 0;
              let testsCountForQuestion = 0;
              const testDetails: Array<{ input: any; expected: any; actual: any; passed: boolean }> = [];
              if (Array.isArray(questionValidationTests) && questionValidationTests.length > 0) {
                const runFunc = validateAnswer();
                for (const t of questionValidationTests) {
                  try {
                    const out = runFunc(t.input);
                    const pass = Math.abs(out - t.expectedOutput) < 0.0001;
                    totalTests++;
                    testsCountForQuestion++;
                    if (pass) { passedCountForQuestion++; totalTestsPassed++; }
                    testDetails.push({ input: t.input, expected: t.expectedOutput, actual: out, passed: pass });
                  } catch (err) {
                    console.warn(`[Submit] Q${questionId} test execution error:`, err);
                    totalTests++;
                    testsCountForQuestion++;
                    testDetails.push({ input: t.input, expected: t.expectedOutput, actual: undefined, passed: false });
                  }
                }
                console.log(`[Submit] Q${questionId} tests passed: ${passedCountForQuestion}/${questionValidationTests.length}`);
              } else {
                console.log(`[Submit] Q${questionId} has no validation tests to run.`);
              }
              
              questionResults[questionId] = {
                is_correct: isCorrect,
                user_answer: userAnswer,
                expected_answer: expectedAnswer,
                tests_passed: passedCountForQuestion,
                tests_total: testsCountForQuestion || (Array.isArray(questionValidationTests) ? questionValidationTests.length : 0),
                test_details: testDetails
              };
              
              if (isCorrect) {
                totalCorrect++;
                overallFeedback.push(`Question ${questionId}: Correct!`);
              } else {
                overallFeedback.push(`Question ${questionId}: Incorrect.`);
              }
              
              console.log(`[Submit] Q${questionId}: User=${userNum}, Expected=${expectedNum}, Correct=${isCorrect}`);
              
            } catch (error) {
              console.error(`Error validating question ${questionId}:`, error);
              questionResults[questionId] = {
                is_correct: false,
                error: error.message
              };
              overallFeedback.push(`Question ${questionId}: Validation error.`);
            }
          }
        }
        
        // Overall result
        const overallCorrect = totalCorrect === totalQuestions && totalQuestions > 0;
        const scorePercentage = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
        
        validationResult = {
          is_correct: overallCorrect,
          feedback: `Score: ${totalCorrect}/${totalQuestions} (${scorePercentage.toFixed(1)}%) - ${overallFeedback.join(' ')}. Tests passed: ${totalTestsPassed}/${totalTests}`,
          confidence_score: scorePercentage / 100,
          metadata: {
            question_results: questionResults,
            total_correct: totalCorrect,
            total_questions: totalQuestions,
            total_tests: totalTests,
            total_tests_passed: totalTestsPassed
          }
        };
        
      } else {
        // Single question validation (legacy)
              // Get validation functions and test cases from enhanced ui_config
      let finalValidationFunction = activity.validation_function;
      let validationTests = [];
      let inputExamples = [];
      let expectedOutputs = [];
      
      // Try to get validation data from ui_config
      if (activity.content?.validation_data) {
        validationTests = activity.content.validation_data.test_cases || [];
        inputExamples = activity.content.validation_data.input_examples || [];
        expectedOutputs = activity.content.validation_data.expected_outputs || [];
      }
        
        // Create validation function that uses test cases
        finalValidationFunction = `
          function evaluate(params) {
            try {
              const { submission } = params;
              
              // Get validation tests
              const validationTests = ${JSON.stringify(validationTests)};
              
              // Run all test cases
              const testResults = validationTests.map(test => {
                try {
                  // Execute the actual validation function for each test
                  ${activity.validation_function}
                  const actualOutput = calculateAnswer(test.input);
                  const expectedOutput = test.expectedOutput;
                  
                  // Compare with expected output
                  const isCorrect = Math.abs(actualOutput - expectedOutput) < 0.0001;
                  return { isCorrect, input: test.input, expected: expectedOutput, actual: actualOutput };
                } catch (e) {
                  return { isCorrect: false, error: e.message };
                }
              });
              
              // Check user's answer against their test case
              let userAnswer;
              if (typeof submission === 'object') {
                const keys = Object.keys(submission);
                if (keys.length > 0) {
                  userAnswer = submission[keys[0]];
                }
              } else {
                userAnswer = submission;
              }
              
              // Convert to number for comparison
              const userNum = typeof userAnswer === 'string' ? parseFloat(userAnswer) : userAnswer;
              
              // Find matching test case for user's answer
              const matchingTest = testResults.find(test => 
                Math.abs(test.actual - userNum) < 0.0001
              );
              
              const isCorrect = Boolean(matchingTest?.isCorrect);
              
              // Calculate confidence based on test case results
              const passedTests = testResults.filter(t => t.isCorrect).length;
              const confidence = passedTests / testResults.length;
              
              return {
                is_correct: isCorrect,
                feedback: isCorrect ? 'Correct! Well done!' : 'Not quite right. Please try again.',
                confidence_score: confidence,
                metadata: {
                  test_results: testResults,
                  passed_tests: passedTests,
                  total_tests: testResults.length
                }
              };
            } catch (error) {
              console.error('Validation error:', error);
              return {
                is_correct: false,
                feedback: "Error in validation: " + error.message,
                confidence_score: 0
              };
            }
          }
          
          return evaluate(arguments[0]);
        `;
        
        validationResult = ValidationService.executeValidation(finalValidationFunction, {
          submission: answers,
          global_context_variables: { attempt_number: 1 }
        });
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
        perQuestionTests[qid] = { passed: (info as any).tests_passed || 0, total: (info as any).tests_total || 0 };
        if ((info as any).test_details) {
          perQuestionTestDetails[qid] = (info as any).test_details as any;
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
      perQuestionTestDetails
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
      
      setSubmissionResult(result);
      setIsSubmitted(true);

      toast({
        title: "Assignment Submitted!",
        description: `You scored ${result.score.percentage}% - ${result.feedback} ${typeof result.testsPassed === 'number' ? `(Tests passed: ${result.testsPassed}/${result.totalTests})` : ''}`,
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
              <GridPuzzle
                gridData={activity.content.grid}
                onSubmit={handleSubmit}
                isReadOnly={isSubmitted}
                correctAnswer={isSubmitted ? activity.content.answer : undefined}
              />
            )}

            {activity.type === 'Mathematical' && (
              <MathQuestion
                problems={activity.content.math}
                onSubmit={handleSubmit}
                isReadOnly={isSubmitted}
                showResults={isSubmitted}
                userAnswers={submissionResult?.userAnswers}
                perQuestionTests={submissionResult?.perQuestionTests}
                perQuestionTestDetails={submissionResult?.perQuestionTestDetails}
              />
            )}

            {activity.type === 'Logical' && (
              <LogicQuestion
                problems={activity.content.logic}
                onSubmit={handleSubmit}
                isReadOnly={isSubmitted}
                showResults={isSubmitted}
                userAnswers={submissionResult?.userAnswers}
                perQuestionTests={submissionResult?.perQuestionTests}
                perQuestionTestDetails={submissionResult?.perQuestionTestDetails}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ActivityDetail;