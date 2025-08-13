import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";

interface MathProblem {
  id: string;
  question: string;
  // Allow any shaped answer (number, string, array/matrix, object)
  answer?: any;
  input_example?: any;
  expected_output?: any;
  validation_tests?: Array<{ input: any; expectedOutput: any }>;
}

interface MathQuestionProps {
  problems: MathProblem[];
  onSubmit: (answers: { [key: string]: any }) => void;
  isReadOnly?: boolean;
  showResults?: boolean;
  showTests?: boolean;
  userAnswers?: { [key: string]: any };
  perQuestionTests?: Record<string, { passed: number; total: number }>;
  perQuestionTestDetails?: Record<string, Array<{ input: any; expected: any; actual: any; passed: boolean }>>;
  hintsByQuestion?: Record<string, string>;
  showStatus?: boolean; // controls green check / red cross icon
  showAnswerInput?: boolean; // controls the Answer input visibility
}

const MathQuestion = ({ problems, onSubmit, isReadOnly = false, showResults = false, showTests = false, userAnswers = {}, perQuestionTests = {}, perQuestionTestDetails = {}, hintsByQuestion = {}, showStatus = true, showAnswerInput = true }: MathQuestionProps) => {
  // Keep text inputs locally; parse to rich values on submit
  const initialText: { [key: string]: string } = Object.fromEntries(Object.entries(userAnswers).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]));
  const [answersText, setAnswersText] = useState<{ [key: string]: string }>(initialText);

  const parseUserInput = (value: string): any => {
    const trimmed = (value ?? '').trim();
    if (trimmed === '') return '';
    // Try JSON first for arrays/objects/numbers/strings
    try {
      // Allow bare numbers without quotes as well
      if (trimmed.startsWith('[') || trimmed.startsWith('{') || /^-?\d+(\.\d+)?$/.test(trimmed) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
        return JSON.parse(trimmed);
      }
    } catch {}
    // Fallback: try number
    const n = Number(trimmed);
    if (!Number.isNaN(n)) return n;
    // As-is string
    return trimmed;
  };

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

  const handleAnswerChange = (problemId: string, value: string) => {
    if (isReadOnly) return;
    setAnswersText(prev => ({
      ...prev,
      [problemId]: value
    }));
  };

  const isCorrect = (problemId: string) => {
    const problem = problems.find(p => p.id === problemId);
    if (!problem || typeof problem.answer === 'undefined') return undefined;
    const parsed = parseUserInput(answersText[problemId] ?? '');
    return deepEqual(parsed, problem.answer);
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
                {showStatus && showResults && typeof problems[index].answer !== 'undefined' && (
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
              {showAnswerInput && (
                <div className="flex items-center space-x-3">
                  <span className="text-muted-foreground">Answer:</span>
                  <Input
                    // type="number"
                    placeholder="Your answer"
                    value={answersText[problem.id] || ''}
                    onChange={(e) => handleAnswerChange(problem.id, e.target.value)}
                    disabled={isReadOnly}
                    className={showResults && typeof problem.answer !== 'undefined' ? (
                      isCorrect(problem.id)
                        ? "border-success bg-success/5"
                        : "border-destructive bg-destructive/5"
                    ) : ""}
                  />
                </div>
              )}
              {showResults && showTests && (
                <div className="text-sm text-muted-foreground">
                  Tests passed: {perQuestionTests[problem.id]?.passed ?? 0}/{perQuestionTests[problem.id]?.total ?? Math.min(5, problem.validation_tests?.length || 5)}
                </div>
              )}
              {showResults && hintsByQuestion[problem.id] && (
                <div className="mt-2 text-sm border rounded-md p-2 bg-warning/5 text-foreground">
                  <span className="font-medium">Hint:</span> {hintsByQuestion[problem.id]}
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
          <Button
            variant="hero"
            onClick={() => {
              const parsedAnswers: { [key: string]: any } = {};
              for (const [k, v] of Object.entries(answersText)) {
                parsedAnswers[k] = parseUserInput(v);
              }
              onSubmit(parsedAnswers);
            }}
            className="px-8"
          >
            Submit Answers
          </Button>
        </div>
      )}
    </div>
  );
};

export default MathQuestion;