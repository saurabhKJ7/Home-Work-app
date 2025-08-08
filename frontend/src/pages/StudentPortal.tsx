import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ActivityCard, { Activity } from "@/components/ActivityCard";
import { BookOpen, Trophy, Target, Clock } from "lucide-react";

// Mock data for available activities
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
  },
  {
    id: "4",
    title: "Geometry Basics",
    worksheetLevel: "Grade 7",
    type: "Mathematical",
    difficulty: "Easy",
    problemStatement: "Calculate areas and perimeters of various shapes. Apply geometric formulas to solve real-world problems.",
    createdAt: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    id: "5",
    title: "Logic Puzzles",
    worksheetLevel: "Grade 9",
    type: "Logical",
    difficulty: "Medium",
    problemStatement: "Solve challenging logic puzzles that test your reasoning abilities and critical thinking skills.",
    createdAt: new Date(Date.now() - 345600000).toISOString(),
  },
  {
    id: "6",
    title: "Number Grid Challenge",
    worksheetLevel: "Grade 4",
    type: "Grid-based",
    difficulty: "Easy",
    problemStatement: "Fill in the missing numbers in this fun number grid puzzle. Perfect for practicing basic arithmetic.",
    createdAt: new Date(Date.now() - 432000000).toISOString(),
  }
];

const StudentPortal = () => {
  const [activities] = useState<Activity[]>(mockActivities);
  const [filter, setFilter] = useState<string>('all');
  const navigate = useNavigate();

  const handleStartActivity = (activityId: string) => {
    navigate(`/student/activity/${activityId}`);
  };

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    if (filter === 'easy') return activity.difficulty === 'Easy';
    if (filter === 'medium') return activity.difficulty === 'Medium';
    if (filter === 'hard') return activity.difficulty === 'Hard';
    return activity.type === filter;
  });

  const stats = {
    total: activities.length,
    easy: activities.filter(a => a.difficulty === 'Easy').length,
    medium: activities.filter(a => a.difficulty === 'Medium').length,
    hard: activities.filter(a => a.difficulty === 'Hard').length,
  };

  return (
    <div className="min-h-screen bg-subtle-gradient">
      <div className="container mx-auto p-6 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-hero-gradient bg-clip-text text-transparent">
            Student Portal
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Challenge yourself with interactive learning activities designed to boost your skills
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="text-center shadow-card hover:shadow-elegant transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold">{stats.total}</span>
              </div>
              <p className="text-sm text-muted-foreground">Total Activities</p>
            </CardContent>
          </Card>
          
          <Card className="text-center shadow-card hover:shadow-elegant transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Target className="w-5 h-5 text-success" />
                <span className="text-2xl font-bold">{stats.easy}</span>
              </div>
              <p className="text-sm text-muted-foreground">Easy</p>
            </CardContent>
          </Card>
          
          <Card className="text-center shadow-card hover:shadow-elegant transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Clock className="w-5 h-5 text-warning" />
                <span className="text-2xl font-bold">{stats.medium}</span>
              </div>
              <p className="text-sm text-muted-foreground">Medium</p>
            </CardContent>
          </Card>
          
          <Card className="text-center shadow-card hover:shadow-elegant transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Trophy className="w-5 h-5 text-hard" />
                <span className="text-2xl font-bold">{stats.hard}</span>
              </div>
              <p className="text-sm text-muted-foreground">Hard</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Buttons */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Filter Activities</CardTitle>
            <CardDescription>Choose activities by difficulty or type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
              >
                All Activities
              </Button>
              <Button
                variant={filter === 'easy' ? 'success' : 'outline'}
                onClick={() => setFilter('easy')}
              >
                Easy
              </Button>
              <Button
                variant={filter === 'medium' ? 'warning' : 'outline'}
                onClick={() => setFilter('medium')}
              >
                Medium
              </Button>
              <Button
                variant={filter === 'hard' ? 'destructive' : 'outline'}
                onClick={() => setFilter('hard')}
              >
                Hard
              </Button>
              <div className="w-px h-8 bg-border mx-2" />
              <Button
                variant={filter === 'Grid-based' ? 'gamelike' : 'outline'}
                onClick={() => setFilter('Grid-based')}
              >
                Grid-based
              </Button>
              <Button
                variant={filter === 'Mathematical' ? 'gamelike' : 'outline'}
                onClick={() => setFilter('Mathematical')}
              >
                Mathematical
              </Button>
              <Button
                variant={filter === 'Logical' ? 'gamelike' : 'outline'}
                onClick={() => setFilter('Logical')}
              >
                Logical
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Activities Grid */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Available Activities</CardTitle>
            <CardDescription>
              {filteredActivities.length} activities available
              {filter !== 'all' && (
                <Badge variant="outline" className="ml-2">
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredActivities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredActivities.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    onStart={handleStartActivity}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No activities found for this filter</p>
                <Button 
                  variant="outline" 
                  onClick={() => setFilter('all')}
                  className="mt-4"
                >
                  View All Activities
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentPortal;