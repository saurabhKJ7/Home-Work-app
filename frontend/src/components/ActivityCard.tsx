import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Grid3X3, Calculator, Brain } from "lucide-react";

export interface Activity {
  id: string;
  title: string;
  worksheetLevel: string;
  type: 'Grid-based' | 'Mathematical' | 'Logical';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  problemStatement: string;
  createdAt: string;
  userId?: string; // ID of the teacher who created the activity
}

interface ActivityCardProps {
  activity: Activity;
  onStart?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  isTeacherView?: boolean;
}

const ActivityCard = ({ activity, onStart, onEdit, onDelete, isTeacherView = false }: ActivityCardProps) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-easy-background text-easy border-easy/20';
      case 'medium': return 'bg-medium-background text-medium border-medium/20';
      case 'hard': return 'bg-hard-background text-hard border-hard/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Grid-based': return <Grid3X3 className="w-4 h-4" />;
      case 'Mathematical': return <Calculator className="w-4 h-4" />;
      case 'Logical': return <Brain className="w-4 h-4" />;
      default: return <Grid3X3 className="w-4 h-4" />;
    }
  };

  return (
    <Card className="group hover:shadow-card transition-all duration-300 hover:-translate-y-1 animate-slide-up">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getTypeIcon(activity.type)}
            <CardTitle className="text-lg">{activity.title}</CardTitle>
          </div>
          <Badge variant="outline" className={getDifficultyColor(activity.difficulty)}>
            {activity.difficulty}
          </Badge>
        </div>
        <CardDescription className="text-sm text-muted-foreground">
          {activity.worksheetLevel} • {activity.type}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <p className="text-sm text-foreground/80 line-clamp-3">
          {activity.problemStatement}
        </p>
        <div className="flex items-center space-x-1 mt-3 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>Created {new Date(activity.createdAt).toLocaleDateString()}</span>
        </div>
      </CardContent>
      
      <CardFooter className="pt-0">
        {isTeacherView ? (
          <div className="flex space-x-2 w-full">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(activity.id)} className="flex-1">
                Edit
              </Button>
            )}
            {onDelete && (
              <Button variant="destructive" size="sm" onClick={() => onDelete(activity.id)} className="flex-1">
                Delete
              </Button>
            )}
          </div>
        ) : (
          <Button 
            variant="gamelike" 
            className="w-full"
            onClick={() => onStart?.(activity.id)}
          >
            Start Activity
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default ActivityCard;