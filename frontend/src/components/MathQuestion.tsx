import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";

interface MathProblem {
  id: string;
  question: string;
  answer: number;
}

interface MathQuestionProps {
  problems: MathProblem[];
  onSubmit: (answers: { [key: string]: number }) => void;
  isReadOnly?: boolean;
  showResults?: boolean;
  userAnswers?: { [key: string]: number };
}

const MathQuestion = ({ problems, onSubmit, isReadOnly = false, showResults = false, userAnswers = {} }: MathQuestionProps) => {
  const [answers, setAnswers] = useState<{ [key: string]: number }>(userAnswers);

  const handleAnswerChange = (problemId: string, value: string) => {
    if (isReadOnly) return;
    
    const numValue = value === '' ? 0 : parseFloat(value) || 0;
    setAnswers(prev => ({
      ...prev,
      [problemId]: numValue
    }));
  };

  const isCorrect = (problemId: string) => {
    const problem = problems.find(p => p.id === problemId);
    return problem && answers[problemId] === problem.answer;
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {problems.map((problem, index) => (
          <Card key={problem.id} className="transition-all duration-200 hover:shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2">
                <span className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </span>
                <span>Math Problem</span>
                {showResults && (
                  <div className="ml-auto">
                    {isCorrect(problem.id) ? (
                      <CheckCircle className="w-5 h-5 text-success" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive" />
                    )}
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-lg font-medium">{problem.question}</p>
              <div className="flex items-center space-x-3">
                <span className="text-muted-foreground">Answer:</span>
                <Input
                  type="number"
                  placeholder="Your answer"
                  value={answers[problem.id] || ''}
                  onChange={(e) => handleAnswerChange(problem.id, e.target.value)}
                  disabled={isReadOnly}
                  className={showResults ? (
                    isCorrect(problem.id) 
                      ? "border-success bg-success/5" 
                      : "border-destructive bg-destructive/5"
                  ) : ""}
                />
                {showResults && !isCorrect(problem.id) && (
                  <span className="text-success font-medium">
                    Correct: {problem.answer}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {!isReadOnly && (
        <div className="flex justify-center">
          <Button variant="hero" onClick={() => onSubmit(answers)} className="px-8">
            Submit Answers
          </Button>
        </div>
      )}
    </div>
  );
};

export default MathQuestion;