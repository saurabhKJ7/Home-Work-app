import React, { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { getActivityById } from '../../data/mockActivities';
import ActivityGrid from '../../components/ActivityGrid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle } from 'lucide-react';

const ActivityAttempt = () => {
  const { id } = useParams();
  const activity = getActivityById(id);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [feedback, setFeedback] = useState(null);

  if (!activity) {
    return <Navigate to="/student/dashboard" replace />;
  }

  const handleSubmit = (selectedCoords, validationResults) => {
    setIsSubmitted(true);
    
    // Calculate feedback based on validation results
    const correctCount = Array.from(validationResults.values()).filter(Boolean).length;
    const totalSelected = validationResults.size;
    const solutionLength = activity.solution.length;
    
    const isSuccess = correctCount === solutionLength && totalSelected === solutionLength;
    
    setFeedback({
      isSuccess,
      message: isSuccess 
        ? "Excellent work! You've correctly identified all the required cells."
        : `Not quite right. You got ${correctCount} out of ${solutionLength} correct. Check the highlighted cells and try to understand the pattern.`,
      details: {
        correct: correctCount,
        total: solutionLength,
        selected: totalSelected
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">{activity.worksheet_level}</h1>
        <Badge variant="outline">{activity.type}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Grid - Left Side (2/3 width) */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Interactive Grid</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityGrid
                gridData={activity.gridData}
                onSubmit={handleSubmit}
                isSubmitted={isSubmitted}
                solution={activity.solution}
              />
            </CardContent>
          </Card>
        </div>

        {/* Instructions and Feedback - Right Side (1/3 width) */}
        <div className="space-y-6">
          {/* Prompt Card */}
          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-foreground">
                {activity.prompt}
              </p>
            </CardContent>
          </Card>

          {/* Feedback Card */}
          {feedback && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {feedback.isSuccess ? (
                    <CheckCircle className="text-success" size={20} />
                  ) : (
                    <AlertCircle className="text-warning" size={20} />
                  )}
                  Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`p-4 rounded-lg ${
                  feedback.isSuccess 
                    ? 'bg-success/10 border border-success/20' 
                    : 'bg-warning/10 border border-warning/20'
                }`}>
                  <p className="text-sm mb-3">{feedback.message}</p>
                  
                  <div className="text-xs space-y-1">
                    <div>Correct: {feedback.details.correct}/{feedback.details.total}</div>
                    <div>Selected: {feedback.details.selected} cells</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions Card */}
          <Card>
            <CardHeader>
              <CardTitle>How to Play</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-xs space-y-2 text-muted-foreground">
                <li>• Click on grid cells to select them</li>
                <li>• Selected cells will be highlighted in red</li>
                <li>• Click again to deselect a cell</li>
                <li>• Press "Check Answer" when ready</li>
                <li>• Green borders = correct, Red borders = incorrect</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ActivityAttempt;