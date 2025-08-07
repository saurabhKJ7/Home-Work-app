import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Login = () => {
  const [selectedRole, setSelectedRole] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();

  const handleLogin = (e) => {
    e.preventDefault();
    if (selectedRole && username) {
      login(selectedRole, username);
    }
  };

  return (
    <div className="min-h-screen bg-page-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-foreground">
            Login to Your Account
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Role Selector */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground">Select Your Role</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={selectedRole === 'teacher' ? 'default' : 'outline'}
                  onClick={() => setSelectedRole('teacher')}
                  className="h-12"
                >
                  I am a Teacher
                </Button>
                <Button
                  type="button"
                  variant={selectedRole === 'student' ? 'default' : 'outline'}
                  onClick={() => setSelectedRole('student')}
                  className="h-12"
                >
                  I am a Student
                </Button>
              </div>
            </div>

            {/* Username Field */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-foreground">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!selectedRole || !username || !password}
              className="w-full h-12"
            >
              Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;