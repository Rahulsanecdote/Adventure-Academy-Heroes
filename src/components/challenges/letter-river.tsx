
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, CaseUpper, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { type Difficulty } from '@/lib/types';
import { cn } from '@/lib/utils';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const generateProblem = (difficulty: Difficulty) => {
  const getRandomLetter = () => alphabet[Math.floor(Math.random() * alphabet.length)];
  return { letter: getRandomLetter() };
};

type ChallengeProps = {
  difficulty: Difficulty;
  onPerformanceUpdate: (correct: boolean) => void;
};

export default function LetterRiverChallenge({ difficulty, onPerformanceUpdate }: ChallengeProps) {
  const [problem, setProblem] = useState(() => generateProblem(difficulty));
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const { toast } = useToast();

  const nextProblem = useCallback(() => {
    setProblem(generateProblem(difficulty));
    setFeedback(null);
    setPressedKey(null);
  }, [difficulty]);

  const handleAnswer = useCallback((key: string) => {
    if (feedback !== null) return;
    
    const pressed = key.toUpperCase();
    setPressedKey(pressed);

    const isCorrect = pressed === problem.letter;
    onPerformanceUpdate(isCorrect);
    
    if (isCorrect) {
      setFeedback('correct');
      setStreak(s => s + 1);
      toast({
        title: "Correct!",
        description: `You identified the letter ${problem.letter}!`,
      });
      setTimeout(nextProblem, 1000);
    } else {
      setFeedback('incorrect');
      setStreak(0);
      toast({
        variant: "destructive",
        title: "Not quite!",
        description: "That's not the right letter. Try again!",
      });
       setTimeout(() => {
        setFeedback(null);
        setPressedKey(null);
       }, 1500);
    }
  }, [problem.letter, feedback, onPerformanceUpdate, toast, nextProblem]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key.length === 1 && event.key.match(/[a-zA-Z]/)) {
          handleAnswer(event.key);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleAnswer]);

  useEffect(() => {
    setProblem(generateProblem(difficulty));
  }, [difficulty]);

  return (
    <Card className="border-0 shadow-none w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 font-headline text-2xl">
            <CaseUpper className="text-primary"/>
            Letter Recognition River
        </CardTitle>
        <CardDescription>Type or click the letter shown on the stone!</CardDescription>
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
        
        <div className="w-full max-w-md space-y-2">
            <div className="grid grid-cols-10 gap-2">
                {'QWERTYUIOP'.split('').map(key => (
                    <Button
                        key={key}
                        onClick={() => handleAnswer(key)}
                        disabled={!!feedback}
                        variant="outline"
                        className={cn("p-2 h-auto text-lg font-mono", pressedKey === key && feedback === 'correct' && 'bg-green-500/50', pressedKey === key && feedback === 'incorrect' && 'bg-red-500/50')}
                    >
                        {key}
                    </Button>
                ))}
            </div>
            <div className="grid grid-cols-9 gap-2 pl-[5%] pr-[5%]">
                 {'ASDFGHJKL'.split('').map(key => (
                    <Button
                        key={key}
                        onClick={() => handleAnswer(key)}
                        disabled={!!feedback}
                        variant="outline"
                        className={cn("p-2 h-auto text-lg font-mono", pressedKey === key && feedback === 'correct' && 'bg-green-500/50', pressedKey === key && feedback === 'incorrect' && 'bg-red-500/50')}
                    >
                        {key}
                    </Button>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-2 pl-[15%] pr-[15%]">
                 {'ZXCVBNM'.split('').map(key => (
                    <Button
                        key={key}
                        onClick={() => handleAnswer(key)}
                        disabled={!!feedback}
                        variant="outline"
                        className={cn("p-2 h-auto text-lg font-mono", pressedKey === key && feedback === 'correct' && 'bg-green-500/50', pressedKey === key && feedback === 'incorrect' && 'bg-red-500/50')}
                    >
                        {key}
                    </Button>
                ))}
            </div>
        </div>


        <div className="text-center text-sm text-muted-foreground">
            <p>Current Streak: <span className="font-bold text-primary">{streak}</span></p>
        </div>

        <Button onClick={nextProblem}>Skip Letter</Button>
      </CardContent>
    </Card>
  );
}
