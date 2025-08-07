import React, { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState({ name: null, role: null });
  const navigate = useNavigate();

  const login = (role, name = 'User') => {
    setUser({ name, role });
    if (role === 'teacher') {
      navigate('/teacher/dashboard');
    } else if (role === 'student') {
      navigate('/student/dashboard');
    }
  };

  const logout = () => {
    setUser({ name: null, role: null });
    navigate('/login');
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user.role
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};