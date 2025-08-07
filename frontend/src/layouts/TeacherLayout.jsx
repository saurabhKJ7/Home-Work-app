import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Button } from '@/components/ui/button';
import { PlusCircle, Home, BookOpen } from 'lucide-react';

const TeacherLayout = () => {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-page-background">
      <Navbar />
      
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-content-background border-r border-border h-[calc(100vh-4rem)] sticky top-16">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Teacher Panel</h2>
            
            <nav className="space-y-2">
              <Link to="/teacher/dashboard">
                <Button 
                  variant={isActive('/teacher/dashboard') ? 'default' : 'ghost'}
                  className="w-full justify-start gap-2"
                >
                  <Home size={18} />
                  Dashboard
                </Button>
              </Link>
              
              <Link to="/teacher/create-activity">
                <Button 
                  variant={isActive('/teacher/create-activity') ? 'default' : 'ghost'}
                  className="w-full justify-start gap-2"
                >
                  <PlusCircle size={18} />
                  Create Activity
                </Button>
              </Link>
            </nav>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default TeacherLayout;