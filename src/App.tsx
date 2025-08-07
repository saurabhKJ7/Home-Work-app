import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import TeacherLayout from "./layouts/TeacherLayout";
import StudentLayout from "./layouts/StudentLayout";
import Login from "./pages/Login";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import CreateActivity from "./pages/teacher/CreateActivity";
import StudentDashboard from "./pages/student/StudentDashboard";
import ActivityAttempt from "./pages/student/ActivityAttempt";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Redirect root to login */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Teacher routes */}
            <Route path="/teacher" element={
              <ProtectedRoute role="teacher">
                <TeacherLayout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<TeacherDashboard />} />
              <Route path="create-activity" element={<CreateActivity />} />
            </Route>
            
            {/* Student routes */}
            <Route path="/student" element={
              <ProtectedRoute role="student">
                <StudentLayout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="activity/:id" element={<ActivityAttempt />} />
            </Route>
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
