'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BookOpen, Lock, Play, CheckCircle, Star, Zap, Coins } from 'lucide-react';
import { SubjectWorld, Activity } from '@/lib/types';
import { getSubjectWorlds, updateSubjectProgress } from '@/lib/subject-system';
import { useToast } from '@/hooks/use-toast';

interface SubjectWorldsProps {
  onActivityComplete?: (xp: number, treasures: number) => void;
}

export default function SubjectWorlds({ onActivityComplete }: SubjectWorldsProps) {
  const [worlds, setWorlds] = useState<SubjectWorld[]>([]);
  const [selectedWorld, setSelectedWorld] = useState<SubjectWorld | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSubjectWorlds();
  }, []);

  const loadSubjectWorlds = () => {
    try {
      const subjectWorlds = getSubjectWorlds();
      setWorlds(subjectWorlds);
    } catch (error) {
      console.error('Error loading subject worlds:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivityStart = (activity: Activity) => {
    if (activity.locked || activity.completed) return;

    // Simulate activity completion (in a real app, this would navigate to the activity)
    setTimeout(() => {
      completeActivity(selectedWorld!.id, activity.id);
    }, 2000);

    toast({
      title: 'Activity Started!',
      description: `Starting "${activity.title}". Complete it to earn rewards!`,
    });
  };

  const completeActivity = (worldId: string, activityId: string) => {
    const activity = selectedWorld?.activities.find(a => a.id === activityId);
    if (!activity) return;

    const updatedWorlds = updateSubjectProgress(worldId, activityId);
    setWorlds(updatedWorlds);
    
    // Update selected world if it's currently open
    const updatedSelectedWorld = updatedWorlds.find(w => w.id === worldId);
    if (updatedSelectedWorld) {
      setSelectedWorld(updatedSelectedWorld);
    }

    // Notify parent component about rewards
    onActivityComplete?.(activity.xpReward, activity.treasureReward);

    toast({
      title: 'Activity Completed!',
      description: `You earned ${activity.xpReward} XP and ${activity.treasureReward} treasures!`,
    });
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'Very Easy': return 'bg-green-100 text-green-800';
      case 'Easy': return 'bg-blue-100 text-blue-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Hard': return 'bg-orange-100 text-orange-800';
      case 'Very Hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActivityTypeIcon = (type: string) => {
    switch (type) {
      case 'quiz': return '❓';
      case 'puzzle': return '🧩';
      case 'story': return '📖';
      case 'challenge': return '⚡';
      default: return '🎯';
    }
  };

  if (loading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="text-blue-500" />
            Subject Worlds
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <BookOpen className="text-blue-500" />
          Subject Worlds
        </CardTitle>
        <CardDescription>
          Explore different academic subjects through interactive adventures and activities.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {worlds.map((world) => (
            <Dialog key={world.id}>
              <DialogTrigger asChild>
                <Card 
                  className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                    world.unlocked 
                      ? 'hover:shadow-md border-2 border-transparent hover:border-primary/20' 
                      : 'opacity-60 cursor-not-allowed'
                  }`}
                  onClick={() => world.unlocked && setSelectedWorld(world)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-2xl">{world.icon}</div>
                      {!world.unlocked && <Lock className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    
                    <h3 className="font-semibold text-sm mb-2">{world.name}</h3>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {world.description}
                    </p>
                    
                    {world.unlocked && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span>Progress</span>
                          <span>{world.progress}%</span>
                        </div>
                        <Progress value={world.progress} className="h-2" />
                      </div>
                    )}
                    
                    {!world.unlocked && (
                      <div className="text-xs text-muted-foreground text-center py-2">
                        Complete previous worlds to unlock
                      </div>
                    )}
                  </CardContent>
                </Card>
              </DialogTrigger>
              
              {world.unlocked && (
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <span className="text-2xl">{world.icon}</span>
                      {world.name}
                    </DialogTitle>
                    <DialogDescription>{world.description}</DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Activities</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Progress: {world.progress}%</span>
                        <Progress value={world.progress} className="w-20 h-2" />
                      </div>
                    </div>
                    
                    <div className="grid gap-3">
                      {world.activities.map((activity, index) => (
                        <div 
                          key={activity.id} 
                          className={`border rounded-lg p-4 ${
                            activity.locked 
                              ? 'opacity-50 bg-muted/20' 
                              : activity.completed 
                                ? 'bg-green-50 border-green-200' 
                                : 'hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{getActivityTypeIcon(activity.type)}</span>
                              <div>
                                <h5 className="font-medium text-sm">{activity.title}</h5>
                                <p className="text-xs text-muted-foreground">{activity.description}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge className={getDifficultyColor(activity.difficulty)}>
                                {activity.difficulty}
                              </Badge>
                              {activity.completed && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                              {activity.locked && (
                                <Lock className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-xs">
                              <div className="flex items-center gap-1">
                                <Zap className="w-3 h-3 text-blue-500" />
                                {activity.xpReward} XP
                              </div>
                              <div className="flex items-center gap-1">
                                <Coins className="w-3 h-3 text-yellow-500" />
                                {activity.treasureReward}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {activity.type}
                              </Badge>
                            </div>
                            
                            {!activity.locked && !activity.completed && (
                              <Button 
                                size="sm" 
                                onClick={() => handleActivityStart(activity)}
                                className="flex items-center gap-1"
                              >
                                <Play className="w-3 h-3" />
                                Start
                              </Button>
                            )}
                            
                            {activity.completed && (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Completed
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              )}
            </Dialog>
          ))}
        </div>
        
        {worlds.filter(w => w.unlocked).length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Complete activities to unlock new subject worlds!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
