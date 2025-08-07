import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-50 w-full bg-background border-b border-border">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-foreground">EduValidate</h1>
        </div>
        
        {user.name && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user.name}
            </span>
            <Button 
              onClick={logout}
              variant="default"
              size="sm"
            >
              Logout
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;