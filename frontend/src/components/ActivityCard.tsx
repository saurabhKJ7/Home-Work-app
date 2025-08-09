import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Target, Trophy, Clock, CheckCircle2 } from "lucide-react";

export interface Activity {
  id: string;
  title: string;
  worksheetLevel: string;
  type: 'Grid-based' | 'Mathematical' | 'Logical';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  problemStatement: string;
  createdAt: string;
  userId?: string;
  validation_function?: string;
  ui_config?: Record<string, any>;
  is_completed?: boolean;
  best_score?: number;
}

interface ActivityCardProps {
  activity: Activity;
  onStart: (id: string) => void;
}

const ActivityCard = ({ activity, onStart }: ActivityCardProps) => {
  const getDifficultyIcon = () => {
    switch (activity.difficulty) {
      case 'Easy':
        return <Target className="w-4 h-4 text-success" />;
      case 'Medium':
        return <Clock className="w-4 h-4 text-warning" />;
      case 'Hard':
        return <Trophy className="w-4 h-4 text-hard" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  const getDifficultyClass = () => {
    switch (activity.difficulty) {
      case 'Easy':
        return 'bg-success/10 text-success';
      case 'Medium':
        return 'bg-warning/10 text-warning';
      case 'Hard':
        return 'bg-hard/10 text-hard';
      default:
        return 'bg-primary/10 text-primary';
    }
  };

  const getTypeClass = () => {
    switch (activity.type) {
      case 'Grid-based':
        return 'bg-grid/10 text-grid';
      case 'Mathematical':
        return 'bg-math/10 text-math';
      case 'Logical':
        return 'bg-logic/10 text-logic';
      default:
        return 'bg-primary/10 text-primary';
    }
  };

  return (
    <Card className="shadow-card hover:shadow-elegant transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start mb-2">
          <Badge variant="outline" className={getDifficultyClass()}>
            <span className="flex items-center gap-1">
              {getDifficultyIcon()}
              {activity.difficulty}
            </span>
          </Badge>
          <Badge variant="outline" className={getTypeClass()}>
            {activity.type}
          </Badge>
        </div>
        <CardTitle>{activity.title}</CardTitle>
        <CardDescription>Level: {activity.worksheetLevel}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-3">
          {activity.problemStatement}
        </p>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        {activity.is_completed && (
          <div className="flex items-center justify-between w-full text-sm text-success">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Completed
            </span>
            <span>Best Score: {activity.best_score}%</span>
          </div>
        )}
        <Button
          variant={activity.is_completed ? "outline" : "default"}
          onClick={() => onStart(activity.id)}
          className="w-full"
        >
          {activity.is_completed ? "Review Activity" : "Start Activity"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ActivityCard;