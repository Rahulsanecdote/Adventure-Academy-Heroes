
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, CaseUpper, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { type Difficulty } from '@/lib/types';

const generateProblem = (difficulty: Difficulty) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let letter: string;
  
  const getRandomLetter = () => alphabet[Math.floor(Math.random() * alphabet.length)];

  letter = getRandomLetter();
  
  return { letter };
};

type ChallengeProps = {
  difficulty: Difficulty;
  onPerformanceUpdate: (correct: boolean) => void;
};

export default function LetterRiverChallenge({ difficulty, onPerformanceUpdate }: ChallengeProps) {
  const [problem, setProblem] = useState(generateProblem(difficulty));
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [streak, setStreak] = useState(0);
  const { toast } = useToast();

  const nextProblem = useCallback(() => {
    setProblem(generateProblem(difficulty));
    setFeedback(null);
  }, [difficulty]);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (feedback !== null) return;

    const isCorrect = event.key.toUpperCase() === problem.letter;
    onPerformanceUpdate(isCorrect);
    
    if (isCorrect) {
      setFeedback('correct');
      setStreak(s => s + 1);
      toast({
        title: "Correct!",
        description: `You identified the letter ${problem.letter}!`,
      });
      setTimeout(() => nextProblem(), 1000);
    } else {
      setFeedback('incorrect');
      setStreak(0);
      toast({
        variant: "destructive",
        title: "Not quite!",
        description: "That's not the right letter. Try again!",
      });
       setTimeout(() => setFeedback(null), 1500);
    }
  }, [problem, feedback, nextProblem, toast, onPerformanceUpdate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  useEffect(() => {
    setProblem(generateProblem(difficulty));
  }, [difficulty]);

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 font-headline text-2xl">
            <CaseUpper className="text-primary"/>
            Letter Recognition River
        </CardTitle>
        <CardDescription>Type the letter shown on the stone to cross!</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 flex flex-col items-center">
        <div className="flex justify-center items-center h-40 w-40 bg-muted rounded-full border-4 border-dashed border-border">
          <span className="text-7xl font-bold font-mono">{problem.letter}</span>
        </div>
        
        {feedback && (
          <div className="flex justify-center items-center gap-2 text-lg font-semibold">
            {feedback === 'correct' ? (
              <CheckCircle className="h-8 w-8 text-green-500" />
            ) : (
              <XCircle className="h-8 w-8 text-red-500" />
            )}
            <span>{feedback === 'correct' ? 'Correct!' : 'Incorrect!'}</span>
          </div>
        )}

        <div className="text-center text-sm text-muted-foreground">
            <p>Current Streak: <span className="font-bold text-primary">{streak}</span></p>
            <p>Difficulty: <span className="font-bold">{difficulty}</span></p>
        </div>

        <Button onClick={nextProblem}>Skip Letter</Button>
      </CardContent>
    </Card>
  );
}
