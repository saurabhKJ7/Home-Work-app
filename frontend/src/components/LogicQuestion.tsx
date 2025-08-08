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
  answer: string | number;
}

interface LogicQuestionProps {
  problems: LogicProblem[];
  onSubmit: (answers: { [key: string]: string | number }) => void;
  isReadOnly?: boolean;
  showResults?: boolean;
  userAnswers?: { [key: string]: string | number };
}

const LogicQuestion = ({ problems, onSubmit, isReadOnly = false, showResults = false, userAnswers = {} }: LogicQuestionProps) => {
  const [answers, setAnswers] = useState<{ [key: string]: string | number }>(userAnswers);

  const handleAnswerChange = (problemId: string, value: string | number) => {
    if (isReadOnly) return;
    
    setAnswers(prev => ({
      ...prev,
      [problemId]: value
    }));
  };

  const isCorrect = (problemId: string) => {
    const problem = problems.find(p => p.id === problemId);
    return problem && answers[problemId]?.toString() === problem.answer.toString();
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
                <span>Logic Problem {index + 1}</span>
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
                          className={showResults ? (
                            option === problem.answer.toString()
                              ? "border-success text-success"
                              : answers[problem.id] === option && option !== problem.answer.toString()
                              ? "border-destructive text-destructive"
                              : ""
                          ) : ""}
                        />
                        <Label 
                          htmlFor={`${problem.id}-${optionIndex}`}
                          className={`cursor-pointer ${showResults && option === problem.answer.toString() ? 'text-success font-medium' : ''}`}
                        >
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ) : (
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
                  {showResults && !isCorrect(problem.id) && (
                    <span className="text-success font-medium">
                      Correct: {problem.answer}
                    </span>
                  )}
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