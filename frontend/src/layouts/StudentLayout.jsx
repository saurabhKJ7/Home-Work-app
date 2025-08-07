import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';

const StudentLayout = () => {
  return (
    <div className="min-h-screen bg-page-background">
      <Navbar />
      <div className="p-6">
        <Outlet />
      </div>
    </div>
  );
};

export default StudentLayout;