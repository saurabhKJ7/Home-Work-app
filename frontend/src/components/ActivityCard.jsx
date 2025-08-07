import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const ActivityCard = ({ activity, onClick, userRole = 'student' }) => {
  const truncatedPrompt = activity.prompt.length > 100 
    ? activity.prompt.substring(0, 100) + '...'
    : activity.prompt;

  const getStatusVariant = (status) => {
    switch (status) {
      case 'Completed':
        return 'secondary';
      case 'In Progress':
        return 'default';
      default:
        return 'outline';
    }
  };

  const buttonText = userRole === 'teacher' ? 'View Details' : 'Start Activity';

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-foreground">
          {activity.worksheet_level}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {truncatedPrompt}
        </p>
      </CardContent>
      
      <CardFooter className="flex items-center justify-between">
        <Badge variant={getStatusVariant(activity.status)}>
          {activity.status}
        </Badge>
        
        <Button 
          variant="outline"
          size="sm"
          onClick={() => onClick(activity)}
          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
        >
          {buttonText}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ActivityCard;