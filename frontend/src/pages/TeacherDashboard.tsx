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
import { postJson } from "@/lib/api";

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

// Mock generated content
const mockGeneratedContent = {
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
  math: [
    { id: "1", question: "Solve for x: 2x + 5 = 13", answer: 4 },
    { id: "2", question: "What is 15% of 80?", answer: 12 },
    { id: "3", question: "If y = 3x - 2 and x = 5, what is y?", answer: 13 }
  ],
  logic: [
    { id: "1", question: "What comes next in the sequence: 2, 6, 18, 54, ?", type: "text" as const, answer: "162" },
    { id: "2", question: "If all cats are animals and some animals are pets, which is true?", type: "multiple-choice" as const, options: ["All cats are pets", "Some cats might be pets", "No cats are pets", "All pets are cats"], answer: "Some cats might be pets" }
  ]
};

const TeacherDashboard = () => {
  const [activities, setActivities] = useState<Activity[]>(mockActivities);
  const [previewActivity, setPreviewActivity] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
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

  const [formData, setFormData] = useState({
    worksheetLevel: '',
    title: '',
    problemStatement: '',
    type: '',
    difficulty: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
        { user_query: formData.problemStatement || formData.title },
        token
      );
      const validationFunction = data?.code || "";
      const newPreview = {
        ...formData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        // keep current mock UI content for demo, attach generated code
        content: { ...mockGeneratedContent, validationFunction },
      };
      setPreviewActivity(newPreview);
      // Save to localStorage so ActivityDetail can retrieve generated function by id if needed
      try { localStorage.setItem(`activity:${newPreview.id}:code`, validationFunction); } catch {}
      toast({ title: "Activity Generated!", description: "Review it in the preview area." });
    } catch (e: any) {
      toast({ title: "Generation failed", description: e?.message || "Backend error", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublishActivity = async () => {
    if (!previewActivity) return;

    const newActivity: Activity = {
      id: previewActivity.id,
      title: previewActivity.title,
      worksheetLevel: previewActivity.worksheetLevel,
      type: previewActivity.type,
      difficulty: previewActivity.difficulty,
      problemStatement: previewActivity.problemStatement,
      createdAt: previewActivity.createdAt
    };

    setActivities(prev => [newActivity, ...prev]);
    setPreviewActivity(null);
    setFormData({
      worksheetLevel: '',
      title: '',
      problemStatement: '',
      type: '',
      difficulty: ''
    });

    toast({
      title: "Activity Published!",
      description: "Your activity is now available to students."
    });
  };

  const handleDeleteActivity = (id: string) => {
    setActivities(prev => prev.filter(a => a.id !== id));
    toast({
      title: "Activity Deleted",
      description: "The activity has been removed from your dashboard."
    });
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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

                      {previewActivity.type === 'Grid-based' && (
                        <div className="scale-50 origin-top">
                          <GridPuzzle 
                            gridData={previewActivity.content.grid} 
                            onSubmit={() => {}} 
                            isReadOnly 
                          />
                        </div>
                      )}

                      {previewActivity.type === 'Mathematical' && (
                        <MathQuestion 
                          problems={previewActivity.content.math} 
                          onSubmit={() => {}} 
                          isReadOnly 
                        />
                      )}

                      {previewActivity.type === 'Logical' && (
                        <LogicQuestion 
                          problems={previewActivity.content.logic} 
                          onSubmit={() => {}} 
                          isReadOnly 
                        />
                      )}

                      <Button onClick={handlePublishActivity} variant="success" className="w-full">
                        Publish Activity
                      </Button>
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
                {activities.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activities.map((activity) => (
                      <ActivityCard
                        key={activity.id}
                        activity={activity}
                        isTeacherView
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