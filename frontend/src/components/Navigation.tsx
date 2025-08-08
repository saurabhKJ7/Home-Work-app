import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, Users, BookOpen } from "lucide-react";

const Navigation = () => {
  const location = useLocation();
  
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-hero-gradient rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-hero-gradient bg-clip-text text-transparent">
              EduPlatform
            </span>
          </Link>
          
          <div className="flex items-center space-x-4">
            <Button 
              variant={location.pathname === '/teacher' ? 'default' : 'ghost'}
              asChild
            >
              <Link to="/teacher" className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Teacher Dashboard</span>
              </Link>
            </Button>
            
            <Button 
              variant={location.pathname === '/student' ? 'gamelike' : 'ghost'}
              asChild
            >
              <Link to="/student" className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4" />
                <span>Student Portal</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;