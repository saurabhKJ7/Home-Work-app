import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation";
import Index from "./pages/Index";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentPortal from "./pages/StudentPortal";
import ActivityDetail from "./pages/ActivityDetail";
import NotFound from "./pages/NotFound";
import { useToast } from "@/hooks/use-toast";
import { pingHealth } from "@/lib/api";

const queryClient = new QueryClient();

const App = () => {
  const { toast } = useToast();
  useEffect(() => {
    (async () => {
      const ok = await pingHealth();
      if (!ok) {
        toast({ title: "Backend offline", description: "Cannot reach API /health", variant: "destructive" });
      }
    })();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen">
            <Navigation />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/teacher" element={<TeacherDashboard />} />
              <Route path="/student" element={<StudentPortal />} />
              <Route path="/student/activity/:id" element={<ActivityDetail />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
