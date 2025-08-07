import React from 'react';
import { Link } from 'react-router-dom';
import { mockActivities } from '../../data/mockActivities';
import ActivityCard from '../../components/ActivityCard';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

const TeacherDashboard = () => {
  const handleActivityClick = (activity) => {
    console.log('Teacher viewing activity:', activity);
    // Future: Navigate to activity details or editing page
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Teacher Dashboard</h1>
        
        <Link to="/teacher/create-activity">
          <Button size="lg" className="gap-2">
            <PlusCircle size={20} />
            Create New Activity
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockActivities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onClick={handleActivityClick}
            userRole="teacher"
          />
        ))}
      </div>

      {mockActivities.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            No activities created yet
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first activity to get started
          </p>
          <Link to="/teacher/create-activity">
            <Button>Create Activity</Button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;