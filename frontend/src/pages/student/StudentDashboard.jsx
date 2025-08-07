import React from 'react';
import { useNavigate } from 'react-router-dom';
import { mockActivities } from '../../data/mockActivities';
import ActivityCard from '../../components/ActivityCard';

const StudentDashboard = () => {
  const navigate = useNavigate();

  const handleActivityClick = (activity) => {
    navigate(`/student/activity/${activity.id}`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Available Activities</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockActivities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onClick={handleActivityClick}
            userRole="student"
          />
        ))}
      </div>

      {mockActivities.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            No activities available
          </h3>
          <p className="text-sm text-muted-foreground">
            Check back later for new activities from your teachers
          </p>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;