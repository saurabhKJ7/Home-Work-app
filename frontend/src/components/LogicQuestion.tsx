import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Brain } from "lucide-react";

interface LogicProblem {
  id: string;
  question: string;
  type: 'text' | 'multiple-choice';
  options?: string[];
  answer: any;
  input_example?: any;
  expected_output?: any;
  validation_tests?: Array<{ input: any; expectedOutput: any }>;
}

interface LogicQuestionProps {
  problems: LogicProblem[];
  onSubmit: (answers: { [key: string]: any }) => void;
  isReadOnly?: boolean;
  showResults?: boolean;
  showTests?: boolean;
  userAnswers?: { [key: string]: any };
  perQuestionTests?: Record<string, { passed: number; total: number }>;
  perQuestionTestDetails?: Record<string, Array<{ input: any; expected: any; actual: any; passed: boolean }>>;
  hintsByQuestion?: Record<string, string>;
  // UI controls used by teacher preview
  hideAnswerInput?: boolean;
  hideStatusIcons?: boolean;
  questionNumberOverride?: number;
}

const LogicQuestion = ({ problems, onSubmit, isReadOnly = false, showResults = false, showTests = false, userAnswers = {}, perQuestionTests = {}, perQuestionTestDetails = {}, hintsByQuestion = {}, hideAnswerInput = false, hideStatusIcons = false, questionNumberOverride }: LogicQuestionProps) => {
  const [answers, setAnswers] = useState<{ [key: string]: any }>(userAnswers);

  const handleAnswerChange = (problemId: string, value: string | number) => {
    if (isReadOnly) return;
    
    setAnswers(prev => ({
      ...prev,
      [problemId]: value
    }));
  };

  const isCorrect = (problemId: string) => {
    const problem = problems.find(p => p.id === problemId);
    if (!problem) return false;
    // Permissive UI comparison
    return String(answers[problem.id]) === String((problem as any).answer);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        {problems.map((problem, index) => (
          <Card key={problem.id} className="transition-all duration-200 hover:shadow-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                  <Brain className="w-4 h-4" />
                </div>
                <span>Logic Problem {questionNumberOverride ?? (index + 1)}</span>
                {showResults && !hideStatusIcons && (
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
              <p className="text-lg font-medium leading-relaxed">{problem.question}</p>
              
              {problem.type === 'multiple-choice' && problem.options ? (
                <div className="space-y-3">
                  <RadioGroup
                    value={answers[problem.id]?.toString()}
                    onValueChange={(value) => handleAnswerChange(problem.id, value)}
                    disabled={isReadOnly}
                  >
                    {problem.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center space-x-2">
                        <RadioGroupItem 
                          value={option} 
                          id={`${problem.id}-${optionIndex}`}
                          className={showResults && answers[problem.id] === option ? (
                            isCorrect(problem.id) 
                              ? "border-success text-success"
                              : "border-destructive text-destructive"
                          ) : ""}
                        />
                        <Label 
                          htmlFor={`${problem.id}-${optionIndex}`}
                          className="cursor-pointer"
                        >
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ) : (
                !hideAnswerInput && (
                  <div className="flex items-center space-x-3">
                    <span className="text-muted-foreground">Answer:</span>
                    <Input
                      type="text"
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
                )
              )}
              {showResults && showTests && (
                <div className="text-sm text-muted-foreground">
                  Tests passed: {perQuestionTests[problem.id]?.passed ?? 0}/{perQuestionTests[problem.id]?.total ?? Math.min(5, problem.validation_tests?.length || 5)}
                </div>
              )}
              {/* Hints removed */}
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

export default LogicQuestion;