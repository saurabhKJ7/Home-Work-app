import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";

interface MathProblem {
  id: string;
  question: string;
  answer: number;
  input_example?: any;
  expected_output?: any;
  validation_tests?: Array<{ input: any; expectedOutput: any }>;
}

interface MathQuestionProps {
  problems: MathProblem[];
  onSubmit: (answers: { [key: string]: number }) => void;
  isReadOnly?: boolean;
  showResults?: boolean;
  showTests?: boolean;
  userAnswers?: { [key: string]: number };
  perQuestionTests?: Record<string, { passed: number; total: number }>;
  perQuestionTestDetails?: Record<string, Array<{ input: any; expected: any; actual: any; passed: boolean }>>;
}

const MathQuestion = ({ problems, onSubmit, isReadOnly = false, showResults = false, showTests = false, userAnswers = {}, perQuestionTests = {}, perQuestionTestDetails = {} }: MathQuestionProps) => {
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
                  // type="number"
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

              </div>
              {showResults && showTests && (
                <div className="text-sm text-muted-foreground">
                  Tests passed: {perQuestionTests[problem.id]?.passed ?? 0}/{perQuestionTests[problem.id]?.total ?? Math.min(5, problem.validation_tests?.length || 5)}
                </div>
              )}
              {showResults && showTests && perQuestionTestDetails[problem.id] && (
                <div className="mt-2 border rounded-md p-2 bg-muted/30">
                  <div className="text-xs font-medium mb-1">Test details</div>
                  <ul className="space-y-1 text-xs">
                    {perQuestionTestDetails[problem.id]!.map((d, idx) => (
                      <li key={idx} className={d.passed ? 'text-success' : 'text-destructive'}>
                        <span className="font-semibold">{d.passed ? 'PASS' : 'FAIL'}</span>: expected {JSON.stringify(d.expected)} got {JSON.stringify(d.actual)} for input {JSON.stringify(d.input)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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