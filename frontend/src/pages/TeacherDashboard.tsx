import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ActivityCard, { Activity } from "@/components/ActivityCard";
import GridPuzzle from "@/components/GridPuzzle";
import MathQuestion from "@/components/MathQuestion";
import LogicQuestion from "@/components/LogicQuestion";
import { PlusCircle, Eye, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { postJson, fetchActivities, createActivity, deleteActivity } from "@/lib/api";
import useSpeechToText from "@/hooks/use-speech-to-text";
import { Mic, Square } from "lucide-react";

// Mock data for activities
const mockActivities: Activity[] = [
  {
    id: "1",
    title: "Basic Sudoku Challenge",
    worksheetLevel: "Grade 5",
    type: "Grid-based",
    difficulty: "Easy",
    problemStatement: "Complete this 9x9 Sudoku puzzle by filling in the missing numbers. Each row, column, and 3x3 box must contain all digits from 1 to 9.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    title: "Algebra Fundamentals",
    worksheetLevel: "Grade 8",
    type: "Mathematical",
    difficulty: "Medium",
    problemStatement: "Solve these algebraic equations and show your work. Focus on isolating variables and understanding the order of operations.",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "3",
    title: "Pattern Recognition",
    worksheetLevel: "Grade 6",
    type: "Logical",
    difficulty: "Hard",
    problemStatement: "Identify patterns in sequences and logical relationships. Use deductive reasoning to solve these brain teasers.",
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  }
];

// Helper function to create dynamic content based on generated questions
const createDynamicContent = (questions: any[], activityType: string) => {
  const content: any = {};
  
  if (activityType === 'Grid-based') {
    // Handle grid-based questions
    content.grid = questions.map((q: any, index: number) => ({
      id: String(index + 1),
      question: q.question,
      question_id: q.question_id,
      initial_grid: q.initial_grid,
      solution_grid: q.solution_grid,
      validation_function: q.validation_function,
      grid_size: q.grid_size,
      difficulty: q.difficulty,
      feedback_hints: q.feedback_hints || []
    }));
  } else if (activityType === 'Mathematical') {
    content.math = questions.map((q: any, index: number) => ({
      id: String(index + 1),
      question: q.question,
      answer: 0, // Will be calculated from validation function
      code: q.code,
      question_id: q.question_id,
      input_example: q.input_example,
      expected_output: q.expected_output,
      validation_tests: q.validation_tests || []
    }));
  } else if (activityType === 'Logical') {
    content.logic = questions.map((q: any, index: number) => ({
      id: String(index + 1),
      question: q.question,
      type: "text" as const,
      answer: "",
      code: q.code,
      question_id: q.question_id,
      input_example: q.input_example,
      expected_output: q.expected_output,
      validation_tests: q.validation_tests || []
    }));
  }
  
  return content;
};

const TeacherDashboard = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [previewActivity, setPreviewActivity] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  // Removed meta-validation UI
  const [isLoading, setIsLoading] = useState(true);
  // Teacher-selected tests and responses for preview validation
  const [teacherSelectedTests, setTeacherSelectedTests] = useState<Record<string, any[]>>({});
  const [teacherResponses, setTeacherResponses] = useState<Record<string, string[]>>({});
  const { toast } = useToast();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  
  // Verify that the user is a teacher, redirect if not
  useEffect(() => {
    if (user && user.role !== 'teacher') {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the Teacher Dashboard",
        variant: "destructive"
      });
      navigate("/");
    }
  }, [user, navigate, toast]);
  
  // Fetch activities from the server
  useEffect(() => {
    const loadActivities = async () => {
      if (!token || !user) return;
      
      try {
        setIsLoading(true);
        const data = await fetchActivities(token);
        
        // Map backend data to our Activity interface
        const mappedActivities: Activity[] = data.map((item: any) => ({
          id: item.id,
          title: item.title,
          worksheetLevel: item.worksheet_level,
          type: item.type as any,
          difficulty: item.difficulty as any,
          problemStatement: item.problem_statement,
          createdAt: item.created_at,
          userId: item.user_id // Store the user_id
        }));
        
        // Only show activities created by this teacher
        const teacherActivities = mappedActivities.filter(activity => activity.userId === user.id);
        setActivities(teacherActivities);
      } catch (error) {
        console.error('Failed to fetch activities:', error);
        toast({
          title: "Failed to load activities",
          description: "Please try refreshing the page",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadActivities();
  }, [token, toast, user]);

  const [formData, setFormData] = useState({
    worksheetLevel: '',
    title: '',
    problemStatement: '',
    type: '',
    difficulty: '',
    numQuestions: 1
  });

  // Voice input for problem statement (browser SpeechRecognition)
  const speech = useSpeechToText({ language: 'en-US', interimResults: true, continuous: false });
  useEffect(() => {
    if (speech.transcript && !isGenerating) {
      setFormData(prev => ({ ...prev, problemStatement: (prev.problemStatement ? prev.problemStatement + ' ' : '') + speech.transcript }));
    }
  }, [speech.transcript, isGenerating]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Helpers to evaluate validation tests in preview
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

  const runTestsForQuestion = (
    code: string,
    tests: any[] = [],
    inputExample?: any
  ): { passed: number; total: number; details: Array<{ input: any; expected: any; actual: any; passed: boolean }>; metrics: {
    accuracy_score: number;
    false_positive_count: number;
    false_negative_count: number;
    edge_case_failures: any[];
    confidence_level: 'high' | 'medium' | 'low';
    improvement_suggestions: string[];
  } } => {
    try {
      const { name, params } = extractFunctionMeta(code);
      const fn: any = new Function(`${code}; return ${name};`)();
      const callWithInput = (input: any) => {
        if (input && typeof input === 'object' && !Array.isArray(input)) {
          if (params.length > 1) {
            const args = params.map(p => (input as any)[p]);
            return fn(...args);
          }
          if (params.length === 1) {
            const only = params[0];
            const value = (input as any)[only] !== undefined ? (input as any)[only] : Object.values(input)[0];
            return fn(value);
          }
        }
        return fn(input);
      };
      let passed = 0;
      let total = 0;
      const details: Array<{ input: any; expected: any; actual: any; passed: boolean }> = [];
      // Only consider the first 5 tests on the frontend
      for (const t of tests.slice(0, 5)) {
        total++;
        try {
          const out = callWithInput(t.input);
          const ok = deepEqual(out, t.expectedOutput);
          if (ok) passed++;
          details.push({ input: t.input, expected: t.expectedOutput, actual: out, passed: ok });
        } catch (e) {
          console.warn('[Generate][Preview] Test execution error:', e);
          details.push({ input: t.input, expected: t.expectedOutput, actual: undefined, passed: false });
        }
      }
      const failures = details.filter(d => !d.passed);
      const isEdgeCase = (inp: any) => {
        if (inp == null) return true;
        if (Array.isArray(inp)) return inp.length === 0;
        if (typeof inp === 'object') {
          const keys = Object.keys(inp);
          return keys.length === 0 || keys.some(k => (inp as any)[k] == null || (Array.isArray((inp as any)[k]) && (inp as any)[k].length === 0));
        }
        if (typeof inp === 'string') return inp.trim() === '';
        return false;
      };
      const edge_case_failures = failures.filter(f => isEdgeCase(f.input));
      const accuracy = total > 0 ? passed / total : 0;
      const confidence_level: 'high' | 'medium' | 'low' = accuracy >= 0.9 ? 'high' : accuracy >= 0.7 ? 'medium' : 'low';
      const improvement_suggestions: string[] = [];
      if (edge_case_failures.length > 0) improvement_suggestions.push('Add handling for null/empty inputs and malformed shapes');
      if (failures.length > 0 && edge_case_failures.length !== failures.length) improvement_suggestions.push('Review core logic; some normal cases are failing');
      if (total === 0) improvement_suggestions.push('No tests available; add at least 5 tests');
      return { passed, total, details, metrics: {
        accuracy_score: accuracy,
        false_positive_count: 0,
        false_negative_count: failures.length,
        edge_case_failures,
        confidence_level,
        improvement_suggestions,
      } };
    } catch (e) {
      console.warn('[Generate][Preview] Unable to evaluate tests for question:', e);
      return { passed: 0, total: Math.min(5, Array.isArray(tests) ? tests.length : 0), details: [], metrics: {
        accuracy_score: 0,
        false_positive_count: 0,
        false_negative_count: Math.min(5, Array.isArray(tests) ? tests.length : 0),
        edge_case_failures: [],
        confidence_level: 'low',
        improvement_suggestions: ['Fix runtime errors; tests could not be executed']
      } };
    }
  };

  const pickRandomTests = (tests: any[] = [], count = 5): any[] => {
    const arr = Array.isArray(tests) ? [...tests] : [];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, Math.min(count, arr.length));
  };

  const parseTeacherValue = (val: string): any => {
    if (val == null) return val;
    const trimmed = String(val).trim();
    if (!trimmed.length) return trimmed;
    try {
      return JSON.parse(trimmed);
    } catch {
      const num = Number(trimmed);
      if (!Number.isNaN(num)) return num;
      return trimmed;
    }
  };

  const handleGenerateActivity = async () => {
    if (!formData.title || !formData.type || !formData.difficulty) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    if (!token) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create activities.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const data = await postJson("/generate-code", 
        { 
          user_query: formData.problemStatement || formData.title, 
          type: formData.type,
          num_questions: formData.numQuestions
        },
        token
      );
      console.log('[Generate] Raw response from /generate-code:', data);
      
      // Handle new response format with multiple questions
      const questions = data?.questions || [];
      const totalQuestions = data?.total_questions || 1;
      console.log(`[Generate] Received ${questions.length} question(s). Example first question:`, questions[0]);
      if (questions[0]?.validation_tests) {
        console.log('[Generate] Sample validation tests for Q1:', questions[0].validation_tests);
      } else {
        console.log('[Generate] No validation tests found on Q1 payload');
      }
      
      if (questions.length === 0) {
        throw new Error("No questions were generated");
      }

      // Build preview content dynamically based on generated questions
      const previewContent = createDynamicContent(questions, formData.type);

      // Store all questions for activity creation
      previewContent.questions = questions;
      previewContent.totalQuestions = totalQuestions;
      console.log('[Generate] Preview content composed:', previewContent);

      const newPreview = {
        ...formData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        content: previewContent,
        questions: questions
      };
      // Select up to 5 random tests per question and initialize teacher response fields
      const selected: Record<string, any[]> = {};
      const responses: Record<string, string[]> = {};
      
      if (formData.type === 'Mathematical' && previewContent.math) {
        for (const item of previewContent.math) {
          const sample = pickRandomTests(item.validation_tests, 5);
          selected[item.id] = sample;
          responses[item.id] = sample.map(() => '');
        }
      } else if (formData.type === 'Logical' && previewContent.logic) {
        for (const item of previewContent.logic) {
          const sample = pickRandomTests(item.validation_tests, 5);
          selected[item.id] = sample;
          responses[item.id] = sample.map(() => '');
        }
      } else if (formData.type === 'Grid-based' && previewContent.grid) {
        // For grid-based, we don't need random tests - the validation is the grid itself
        for (const item of previewContent.grid) {
          selected[item.id] = [];
          responses[item.id] = [];
        }
      }
      setTeacherSelectedTests(selected);
      setTeacherResponses(responses);
      // Clear any previous per-question results; they will be set after clicking Run Test Cases
      (newPreview as any).perQuestionTests = {};
      (newPreview as any).perQuestionTestDetails = {};
      console.log('[Generate] New preview object:', newPreview, { selected });

      // For single question, set problem statement to the question
      if (questions.length === 1) {
        newPreview.problemStatement = questions[0].question;
        if (!formData.problemStatement) {
          setFormData(prev => ({ ...prev, problemStatement: questions[0].question }));
        }
      } else {
        // For multiple questions, use a combined title
        newPreview.problemStatement = `${totalQuestions} questions generated`;
      }

      setPreviewActivity(newPreview);
      
      // Save all questions to localStorage for ActivityDetail
      questions.forEach((q: any, index: number) => {
        try { 
          localStorage.setItem(`activity:${newPreview.id}:question:${index}:code`, q.code);
          localStorage.setItem(`activity:${newPreview.id}:question:${index}:question`, q.question);
        } catch {}
      });
      
      toast({ 
        title: "Activity Generated!", 
        description: `Generated ${totalQuestions} question${totalQuestions > 1 ? 's' : ''}. Review in the preview area.`
      });
    } catch (e: any) {
      toast({ title: "Generation failed", description: e?.message || "Backend error", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublishActivity = async () => {
    if (!previewActivity || !token) return;
    
    try {
      // Prepare activity data for API
      const activityData = {
        title: previewActivity.title,
        worksheet_level: previewActivity.worksheetLevel,
        type: previewActivity.type,
        difficulty: previewActivity.difficulty,
        problem_statement: previewActivity.problemStatement,
        ui_config: previewActivity.content,
        validation_function: previewActivity.content.validationFunction,
        correct_answers: {},
        questions: previewActivity.questions || null // Pass questions array for multiple activities
      };
      
      // Send to backend - backend will return single activity with multiple questions
      const createdActivity = await createActivity(activityData, token);
      
      // Update local state with new activity
      const newActivity: Activity = {
        id: createdActivity.id,
        title: createdActivity.title,
        worksheetLevel: createdActivity.worksheet_level,
        type: createdActivity.type as any,
        difficulty: createdActivity.difficulty as any,
        problemStatement: createdActivity.problem_statement,
        createdAt: createdActivity.created_at
      };

      setActivities(prev => [newActivity, ...prev]);
      setPreviewActivity(null);
      setFormData({
        worksheetLevel: '',
        title: '',
        problemStatement: '',
        type: '',
        difficulty: '',
        numQuestions: 1
      });

      const questionCount = previewActivity.questions ? previewActivity.questions.length : 1;
      toast({
        title: "Activity Published!",
        description: `Your activity with ${questionCount} question${questionCount > 1 ? 's' : ''} is now available to students.`
      });
    } catch (error) {
      console.error('Failed to publish activity:', error);
      toast({
        title: "Failed to publish activity",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleDeleteActivity = async (id: string) => {
    if (!token) return;
    
    try {
      await deleteActivity(id, token);
      setActivities(prev => prev.filter(a => a.id !== id));
      toast({
        title: "Activity Deleted",
        description: "The activity has been removed from your dashboard."
      });
    } catch (error) {
      console.error('Failed to delete activity:', error);
      toast({
        title: "Failed to delete activity",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-subtle-gradient">
      <div className="container mx-auto p-6 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-hero-gradient bg-clip-text text-transparent">
            Teacher Dashboard
          </h1>
          <p className="text-muted-foreground">Create engaging activities for your students</p>
        </div>

        <Tabs defaultValue="create" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create Activity</TabsTrigger>
            <TabsTrigger value="manage">Manage Activities</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Create Form */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <PlusCircle className="w-5 h-5" />
                    <span>Create New Activity</span>
                  </CardTitle>
                  <CardDescription>
                    Fill in the details to generate an interactive learning activity
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="worksheetLevel">Worksheet Level</Label>
                    <Input
                      id="worksheetLevel"
                      placeholder="e.g., Grade 5, High School, Advanced"
                      value={formData.worksheetLevel}
                      onChange={(e) => handleInputChange('worksheetLevel', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Activity Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Basic Algebra Challenge"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="problemStatement">Problem Statement</Label>
                    <Textarea
                      id="problemStatement"
                      placeholder="Describe the learning objective and instructions..."
                      value={formData.problemStatement}
                      onChange={(e) => handleInputChange('problemStatement', e.target.value)}
                      rows={4}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant={speech.isRecording ? 'destructive' : 'outline'}
                        onClick={() => {
                          if (!speech.isSupported) {
                            toast({ title: 'Voice input not supported', description: 'Your browser does not support speech recognition. Try Chrome, or we can add server-side transcription.', variant: 'destructive' });
                            return;
                          }
                          if (speech.isRecording) speech.stop(); else { speech.reset(); speech.start(); }
                        }}
                      >
                        {speech.isRecording ? (<><Square className="w-4 h-4 mr-2" /> Stop</>) : (<><Mic className="w-4 h-4 mr-2" /> Speak prompt</>)}
                      </Button>
                      <div className="text-xs text-muted-foreground">
                        {speech.isSupported ? `Language: ${speech.language}` : 'SpeechRecognition unavailable'}
                      </div>
                    </div>
                    {(speech.interimTranscript || speech.transcript) && (
                      <div className="text-xs p-2 bg-muted/30 rounded border">
                        <div className="font-medium mb-1">Live transcript</div>
                        <div className="text-muted-foreground">
                          {speech.interimTranscript || speech.transcript}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Activity Type</Label>
                      <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Grid-based">Grid-based</SelectItem>
                          <SelectItem value="Mathematical">Mathematical</SelectItem>
                          <SelectItem value="Logical">Logical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Difficulty Level</Label>
                      <Select value={formData.difficulty} onValueChange={(value) => handleInputChange('difficulty', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Easy">Easy</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="numQuestions">Number of Questions</Label>
                      <Input
                        id="numQuestions"
                        type="number"
                        min="1"
                        max="10"
                        value={formData.numQuestions}
                        onChange={(e) => handleInputChange('numQuestions', parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={handleGenerateActivity} 
                    disabled={isGenerating}
                    className="w-full"
                    variant="hero"
                  >
                    {isGenerating ? (
                      <>
                        <Wand2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Generate Activity
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Preview Area */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Eye className="w-5 h-5" />
                    <span>Preview Activity</span>
                  </CardTitle>
                  <CardDescription>
                    Review your activity before publishing to students
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {previewActivity ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-accent rounded-lg">
                        <h3 className="font-semibold">{previewActivity.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {previewActivity.type} • {previewActivity.difficulty}
                        </p>
                        <p className="text-sm mt-2">{previewActivity.problemStatement}</p>
                      </div>

                      {previewActivity.type === 'Grid-based' && Array.isArray(previewActivity.content.grid) && (
                        <div className="space-y-4">
                          {previewActivity.content.grid.map((gridItem: any) => (
                            <div key={gridItem.id} className="space-y-2">
                              <div className="p-3 bg-muted/20 rounded">
                                <h4 className="font-medium mb-2">Grid Puzzle {gridItem.id}</h4>
                                <p className="text-sm text-muted-foreground mb-3">{gridItem.question}</p>
                                <div className="text-xs text-muted-foreground mb-2">
                                  Grid Size: {gridItem.grid_size?.rows || 'N/A'}x{gridItem.grid_size?.cols || 'N/A'} | 
                                  Difficulty: {gridItem.difficulty || 'Unknown'}
                                </div>
                                <div className="scale-75 origin-top-left">
                                  <GridPuzzle 
                                    gridData={gridItem.initial_grid || []} 
                                    gridSize={gridItem.grid_size}
                                    onSubmit={() => {}} 
                                    isReadOnly 
                                  />
                                </div>
                                <div className="mt-2">
                                  <details className="text-xs">
                                    <summary className="cursor-pointer text-muted-foreground">View Solution Grid</summary>
                                    <div className="mt-2 p-2 bg-muted/10 rounded">
                                      <pre className="text-xs">{JSON.stringify(gridItem.solution_grid, null, 2)}</pre>
                                    </div>
                                  </details>
                                </div>
                                <div className="mt-2">
                                  <details className="text-xs">
                                    <summary className="cursor-pointer text-muted-foreground">View Validation Function</summary>
                                    <div className="mt-2 p-2 bg-muted/10 rounded">
                                      <pre className="text-xs">{gridItem.validation_function}</pre>
                                    </div>
                                  </details>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {previewActivity.type === 'Mathematical' && Array.isArray(previewActivity.content.math) && (
                        <div className="space-y-4">
                          {previewActivity.content.math.map((item: any, idx: number) => {
                            const perQuestionTests = previewActivity.perQuestionTests || {};
                            const perQuestionTestDetails = previewActivity.perQuestionTestDetails || {};
                            const testsRecord: Record<string, { passed: number; total: number }> = {};
                            const detailsRecord: Record<string, Array<{ input: any; expected: any; actual: any; passed: boolean }>> = {};
                            if (perQuestionTests[item.id]) testsRecord[item.id] = perQuestionTests[item.id];
                            if (perQuestionTestDetails[item.id]) detailsRecord[item.id] = perQuestionTestDetails[item.id];
                            return (
                              <div key={item.id} className="space-y-2">
                                <MathQuestion
                                  problems={[item]}
                                  onSubmit={() => {}}
                                  isReadOnly
                                  showResults={false}
                                  showTests={false}
                                  perQuestionTests={testsRecord}
                                  perQuestionTestDetails={detailsRecord}
                                  hideAnswerInput
                                  hideStatusIcons
                                  questionNumberOverride={idx + 1}
                                />
                                <div className="border rounded-md p-3">
                                  <div className="font-medium mb-2">Teacher Test Inputs (Question {item.id})</div>
                                  {(teacherSelectedTests[item.id] || []).map((t, idx) => (
                                    <div key={idx} className="flex items-center gap-2 py-1">
                                      <div className="text-xs text-muted-foreground">Input:</div>
                                      <code className="text-xs bg-muted/40 px-1.5 py-0.5 rounded">{JSON.stringify(t.input)}</code>
                                      <div className="text-xs ml-3">Your expected output:</div>
                                      <Input
                                        value={teacherResponses[item.id]?.[idx] ?? ''}
                                        onChange={(e) => {
                                          setTeacherResponses(prev => ({
                                            ...prev,
                                            [item.id]: (prev[item.id] || []).map((v, i) => i === idx ? e.target.value : v)
                                          }));
                                        }}
                                        placeholder="Type value (number/JSON)"
                                      />
                                    </div>
                                  ))}
                                  <div className="pt-2">
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        const tests = (teacherSelectedTests[item.id] || []).map((t: any, i: number) => {
                                          const teacherVal = (teacherResponses[item.id] || [])[i];
                                          const hasTeacher = teacherVal !== undefined && String(teacherVal).trim() !== '';
                                          return {
                                            input: t.input,
                                            expectedOutput: hasTeacher ? parseTeacherValue(teacherVal) : t.expectedOutput
                                          };
                                        });
                                        const res = runTestsForQuestion(item.code, tests, item.input_example);
                                        setPreviewActivity((prev: any) => ({
                                          ...prev,
                                          perQuestionTests: { ...(prev?.perQuestionTests || {}), [item.id]: { passed: res.passed, total: res.total } },
                                          perQuestionTestDetails: { ...(prev?.perQuestionTestDetails || {}), [item.id]: res.details },
                                          perQuestionMetrics: { ...(prev?.perQuestionMetrics || {}), [item.id]: res.metrics }
                                        }));
                                      }}
                                    >
                                      Run Test Cases
                                    </Button>
                                    {previewActivity?.perQuestionMetrics?.[item.id] && (
                                    <div className="mt-2 text-xs text-muted-foreground">
                                        <div>accuracy_score: {previewActivity.perQuestionMetrics[item.id].accuracy_score?.toFixed ? previewActivity.perQuestionMetrics[item.id].accuracy_score.toFixed(2) : previewActivity.perQuestionMetrics[item.id].accuracy_score}</div>
                                        <div>false_positive_count: {previewActivity.perQuestionMetrics[item.id].false_positive_count}</div>
                                        <div>false_negative_count: {previewActivity.perQuestionMetrics[item.id].false_negative_count}</div>
                                        <div>confidence_level: {previewActivity.perQuestionMetrics[item.id].confidence_level}</div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {previewActivity.type === 'Logical' && Array.isArray(previewActivity.content.logic) && (
                        <div className="space-y-4">
                          {previewActivity.content.logic.map((item: any, idx: number) => {
                            const perQuestionTests = previewActivity.perQuestionTests || {};
                            const perQuestionTestDetails = previewActivity.perQuestionTestDetails || {};
                            const testsRecord: Record<string, { passed: number; total: number }> = {};
                            const detailsRecord: Record<string, Array<{ input: any; expected: any; actual: any; passed: boolean }>> = {};
                            if (perQuestionTests[item.id]) testsRecord[item.id] = perQuestionTests[item.id];
                            if (perQuestionTestDetails[item.id]) detailsRecord[item.id] = perQuestionTestDetails[item.id];
                            return (
                              <div key={item.id} className="space-y-2">
                                <LogicQuestion
                                  problems={[item]}
                                  onSubmit={() => {}}
                                  isReadOnly
                                  showResults={false}
                                  showTests={false}
                                  perQuestionTests={testsRecord}
                                  perQuestionTestDetails={detailsRecord}
                                  hideAnswerInput
                                  hideStatusIcons
                                  questionNumberOverride={idx + 1}
                                />
                                <div className="border rounded-md p-3">
                                  <div className="font-medium mb-2">Teacher Test Inputs (Question {item.id})</div>
                                  {(teacherSelectedTests[item.id] || []).map((t, idx) => (
                                    <div key={idx} className="flex items-center gap-2 py-1">
                                      <div className="text-xs text-muted-foreground">Input:</div>
                                      <code className="text-xs bg-muted/40 px-1.5 py-0.5 rounded">{JSON.stringify(t.input)}</code>
                                      <div className="text-xs ml-3">Your expected output:</div>
                                      <Input
                                        value={teacherResponses[item.id]?.[idx] ?? ''}
                                        onChange={(e) => {
                                          setTeacherResponses(prev => ({
                                            ...prev,
                                            [item.id]: (prev[item.id] || []).map((v, i) => i === idx ? e.target.value : v)
                                          }));
                                        }}
                                        placeholder="Type value (number/JSON)"
                                      />
                                    </div>
                                  ))}
                                  <div className="pt-2">
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        const tests = (teacherSelectedTests[item.id] || []).map((t: any, i: number) => {
                                          const teacherVal = (teacherResponses[item.id] || [])[i];
                                          const hasTeacher = teacherVal !== undefined && String(teacherVal).trim() !== '';
                                          return {
                                            input: t.input,
                                            expectedOutput: hasTeacher ? parseTeacherValue(teacherVal) : t.expectedOutput
                                          };
                                        });
                                        const res = runTestsForQuestion(item.code, tests, item.input_example);
                                        setPreviewActivity((prev: any) => ({
                                          ...prev,
                                          perQuestionTests: { ...(prev?.perQuestionTests || {}), [item.id]: { passed: res.passed, total: res.total } },
                                          perQuestionTestDetails: { ...(prev?.perQuestionTestDetails || {}), [item.id]: res.details }
                                        }));
                                      }}
                                    >
                                      Run Test Cases
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Per-question teacher inputs and run buttons are rendered inline above */}

                      <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
                        <Button onClick={handlePublishActivity} variant="success" className="w-full">
                          Publish Activity
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Wand2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Generate an activity to see the preview</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="manage" className="space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Published Activities</CardTitle>
                <CardDescription>
                  Manage your created activities and track student progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="mt-2 text-sm text-muted-foreground">Loading activities...</p>
                  </div>
                ) : activities.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activities.map((activity) => (
                      <ActivityCard
                        key={activity.id}
                        activity={activity}
                        onDelete={handleDeleteActivity}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <PlusCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No activities created yet</p>
                    <p className="text-sm">Create your first activity to get started</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TeacherDashboard;