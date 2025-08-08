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
import { getActivityById, submitAttempt, postJson } from "@/lib/api";

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
          content: activityData.ui_config || {}
        };
        
        // If we don't have content from the backend, use mock data based on type
        if (!transformedActivity.content || Object.keys(transformedActivity.content).length === 0) {
          if (mockActivityContent[id as keyof typeof mockActivityContent]) {
            transformedActivity.content = mockActivityContent[id as keyof typeof mockActivityContent].content;
          } else {
            // Default mock content based on type
            // Default content based on activity type
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
              transformedActivity.content = {
                math: [
                  { id: "1", question: "Solve for x: 2x + 5 = 13", answer: 4 },
                  { id: "2", question: "What is 15% of 80?", answer: 12 },
                  { id: "3", question: "If y = 3x - 2 and x = 5, what is y?", answer: 13 }
                ]
              };
            } else {
              transformedActivity.content = {
                logic: [
                  { id: "1", question: "What comes next in the sequence: 2, 6, 18, 54, ?", type: "text" as const, answer: "162" },
                  { id: "2", question: "If all cats are animals and some animals are pets, which is true?", type: "multiple-choice" as const, options: ["All cats are pets", "Some cats might be pets", "No cats are pets", "All pets are cats"], answer: "Some cats might be pets" }
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
    if (!token || !activity || !id) return;
    
    const endTime = new Date();
    const timeSpent = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
    
    let score;
    if (activity.type === 'Grid-based') {
      score = calculateScore(answers, activity.content.answer, activity.type);
    } else if (activity.type === 'Mathematical') {
      score = calculateScore(answers, activity.content.math, activity.type);
    } else {
      score = calculateScore(answers, activity.content.logic, activity.type);
    }

    const result = {
      score,
      timeSpent,
      userAnswers: answers,
      feedback: score.percentage >= 80 ? 'Excellent work!' : 
                score.percentage >= 60 ? 'Good effort!' : 
                'Keep practicing!'
    };

    try {
      // Submit attempt to the database
      await submitAttempt(id, {
        submission: answers,
        time_spent_seconds: timeSpent
      }, token);
      
      // Try backend feedback
      try {
        const generated_function = (() => {
          try { return localStorage.getItem(`activity:${activity.id}:code`) || "" } catch { return "" }
        })();
        const feedbackResponse = await postJson("/feedback-answer", {
          user_query: activity.problemStatement,
          generated_function,
          submission: answers,
          activity_type: activity.type,
        }, token);
        
        if (feedbackResponse) {
          result.feedback = feedbackResponse?.feedback || result.feedback;
          (result as any).confidence = feedbackResponse?.confidence_score;
        }
      } catch (error) {
        console.error('Error getting feedback:', error);
      }
    } catch (error) {
      console.error('Error submitting attempt:', error);
      toast({
        title: "Submission saved locally",
        description: "Could not save to server, but your results are available here",
        variant: "destructive"
      });
    }

    setSubmissionResult(result);
    setIsSubmitted(true);

    toast({
      title: "Assignment Submitted!",
      description: `You scored ${score.percentage}% - ${result.feedback}`,
      variant: score.percentage >= 60 ? "default" : "destructive"
    });
  };

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
              />
            )}

            {activity.type === 'Logical' && (
              <LogicQuestion
                problems={activity.content.logic}
                onSubmit={handleSubmit}
                isReadOnly={isSubmitted}
                showResults={isSubmitted}
                userAnswers={submissionResult?.userAnswers}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ActivityDetail;