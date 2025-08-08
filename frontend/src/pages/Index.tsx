import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Users, BookOpen, Wand2, Target, Brain, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { isAuthenticated, user } = useAuth();
  return (
    <div className="min-h-screen bg-subtle-gradient">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-hero-gradient text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-6 py-24 text-center">
          <div className="space-y-6">
            <div className="flex items-center justify-center space-x-3 mb-8">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-5xl font-bold">EduPlatform</h1>
            </div>
            
            <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              Create interactive learning activities that engage students and boost comprehension. 
              From grid puzzles to mathematical challenges, make learning fun and effective.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              {!isAuthenticated ? (
                <Button variant="hero" size="lg" asChild className="bg-white text-primary hover:bg-white/90">
                  <Link to="/login" className="flex items-center space-x-2">
                    <LogIn className="w-5 h-5" />
                    <span>Log In to Get Started</span>
                  </Link>
                </Button>
              ) : user?.role === 'teacher' ? (
                <Button variant="hero" size="lg" asChild className="bg-white text-primary hover:bg-white/90">
                  <Link to="/teacher" className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>Teacher Dashboard</span>
                  </Link>
                </Button>
              ) : (
                <Button variant="hero" size="lg" asChild className="bg-white text-primary hover:bg-white/90">
                  <Link to="/student" className="flex items-center space-x-2">
                    <BookOpen className="w-5 h-5" />
                    <span>Student Portal</span>
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Interactive Learning Made Simple</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful tools for creating engaging educational content that adapts to every learning style
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Teacher Features */}
          <Card className="shadow-card hover:shadow-elegant transition-all duration-300 group">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <Wand2 className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>AI-Powered Creation</CardTitle>
              <CardDescription>
                Generate activities instantly with our intelligent system that creates puzzles, problems, and challenges
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300 group">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-success/20 transition-colors">
                <Target className="w-6 h-6 text-success" />
              </div>
              <CardTitle>Multiple Activity Types</CardTitle>
              <CardDescription>
                Create grid-based puzzles, mathematical problems, and logical reasoning challenges
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300 group">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-warning/20 transition-colors">
                <Brain className="w-6 h-6 text-warning" />
              </div>
              <CardTitle>Adaptive Difficulty</CardTitle>
              <CardDescription>
                Choose from easy, medium, and hard difficulty levels to match your students' abilities
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-20">
          <Card className="max-w-4xl mx-auto shadow-elegant border-primary/20">
            <CardContent className="p-12">
              <h3 className="text-2xl font-bold mb-4">Ready to Transform Learning?</h3>
              <p className="text-muted-foreground mb-8 text-lg">
                Join educators worldwide who are making learning more interactive and engaging
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {!isAuthenticated ? (
                  <Button variant="hero" size="lg" asChild>
                    <Link to="/register">Create an Account</Link>
                  </Button>
                ) : user?.role === 'teacher' ? (
                  <Button variant="hero" size="lg" asChild>
                    <Link to="/teacher">Start Creating Activities</Link>
                  </Button>
                ) : (
                  <Button variant="gamelike" size="lg" asChild>
                    <Link to="/student">Explore Activities</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
