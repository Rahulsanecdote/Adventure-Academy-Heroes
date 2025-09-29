'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Clock, Star, Gift, Zap, Coins } from 'lucide-react';
import { Quest, Challenge } from '@/lib/types';
import { getActiveQuests, getActiveChallenges, saveQuests, saveChallenges } from '@/lib/quest-system';
import { useToast } from '@/hooks/use-toast';

interface DailyQuestsProps {
  onRewardClaimed?: (xp: number, treasures: number, badge?: string) => void;
}

export default function DailyQuests({ onRewardClaimed }: DailyQuestsProps) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadQuestsAndChallenges();
  }, []);

  const loadQuestsAndChallenges = () => {
    try {
      const activeQuests = getActiveQuests();
      const activeChallenges = getActiveChallenges();
      setQuests(activeQuests);
      setChallenges(activeChallenges);
    } catch (error) {
      console.error('Error loading quests and challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const claimQuestReward = (questId: string) => {
    const quest = quests.find(q => q.id === questId);
    if (!quest || !quest.completed) return;

    // Mark quest as claimed (you might want to add a 'claimed' property to the Quest type)
    const updatedQuests = quests.filter(q => q.id !== questId);
    setQuests(updatedQuests);
    saveQuests(updatedQuests);

    // Notify parent component about reward
    onRewardClaimed?.(quest.reward.xp, quest.reward.treasures, quest.reward.badge);

    toast({
      title: 'Reward Claimed!',
      description: `You earned ${quest.reward.xp} XP and ${quest.reward.treasures} treasures!`,
    });
  };

  const claimChallengeReward = (challengeId: string) => {
    const challenge = challenges.find(c => c.id === challengeId);
    if (!challenge || !challenge.completed) return;

    // Mark challenge as claimed
    const updatedChallenges = challenges.map(c => 
      c.id === challengeId ? { ...c, completed: false } : c
    );
    setChallenges(updatedChallenges);
    saveChallenges(updatedChallenges);

    // Notify parent component about reward
    onRewardClaimed?.(challenge.reward.xp, challenge.reward.treasures, challenge.reward.badge);

    toast({
      title: 'Challenge Completed!',
      description: `You earned ${challenge.reward.xp} XP and ${challenge.reward.treasures} treasures!`,
    });
  };

  const getTimeRemaining = (expiresAt: Date): string => {
    const now = new Date();
    const timeLeft = new Date(expiresAt).getTime() - now.getTime();
    
    if (timeLeft <= 0) return 'Expired';
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
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

  if (loading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="text-yellow-500" />
            Daily Quests & Challenges
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
          <Trophy className="text-yellow-500" />
          Daily Quests & Challenges
        </CardTitle>
        <CardDescription>
          Complete quests and challenges to earn rewards and advance your adventure!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="quests" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="quests" className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              Quests
            </TabsTrigger>
            <TabsTrigger value="challenges" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Challenges
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="quests" className="space-y-4 mt-4">
            {quests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No active quests available</p>
              </div>
            ) : (
              quests.map((quest) => (
                <div key={quest.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{quest.title}</h4>
                      <p className="text-xs text-muted-foreground">{quest.description}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant={quest.type === 'daily' ? 'default' : 'secondary'}>
                        {quest.type}
                      </Badge>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {getTimeRemaining(quest.expiresAt)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span>Progress: {quest.current}/{quest.target}</span>
                      <span>{Math.round((quest.current / quest.target) * 100)}%</span>
                    </div>
                    <Progress value={(quest.current / quest.target) * 100} className="h-2" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-blue-500" />
                        {quest.reward.xp} XP
                      </div>
                      <div className="flex items-center gap-1">
                        <Coins className="w-3 h-3 text-yellow-500" />
                        {quest.reward.treasures}
                      </div>
                      {quest.reward.badge && (
                        <div className="flex items-center gap-1">
                          <Gift className="w-3 h-3 text-purple-500" />
                          Badge
                        </div>
                      )}
                    </div>
                    {quest.completed && (
                      <Button size="sm" onClick={() => claimQuestReward(quest.id)}>
                        Claim Reward
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>
          
          <TabsContent value="challenges" className="space-y-4 mt-4">
            {challenges.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No active challenges available</p>
              </div>
            ) : (
              challenges.map((challenge) => (
                <div key={challenge.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{challenge.title}</h4>
                      <p className="text-xs text-muted-foreground">{challenge.description}</p>
                    </div>
                    <Badge className={getDifficultyColor(challenge.difficulty)}>
                      {challenge.difficulty}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium">Requirements:</h5>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {challenge.requirements.map((req, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-current rounded-full" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {challenge.timeLimit && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      Time limit: {challenge.timeLimit} minutes
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-blue-500" />
                        {challenge.reward.xp} XP
                      </div>
                      <div className="flex items-center gap-1">
                        <Coins className="w-3 h-3 text-yellow-500" />
                        {challenge.reward.treasures}
                      </div>
                      {challenge.reward.badge && (
                        <div className="flex items-center gap-1">
                          <Gift className="w-3 h-3 text-purple-500" />
                          {challenge.reward.badge}
                        </div>
                      )}
                    </div>
                    {challenge.completed && (
                      <Button size="sm" onClick={() => claimChallengeReward(challenge.id)}>
                        Claim Reward
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
