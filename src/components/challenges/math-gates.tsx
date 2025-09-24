
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, ArrowRight, BrainCircuit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Operation = '+' | '-';

const generateProblem = (difficulty: 'Easy' | 'Medium' | 'Hard') => {
  let num1: number, num2: number, operation: Operation;
  
  switch(difficulty) {
    case 'Hard':
      num1 = Math.floor(Math.random() * 90) + 10;
      num2 = Math.floor(Math.random() * 90) + 10;
      operation = Math.random() > 0.5 ? '+' : '-';
      break;
    case 'Medium':
      num1 = Math.floor(Math.random() * 50) + 1;
      num2 = Math.floor(Math.random() * 50) + 1;
      operation = Math.random() > 0.5 ? '+' : '-';
      break;
    case 'Easy':
    default:
      num1 = Math.floor(Math.random() * 10) + 1;
      num2 = Math.floor(Math.random() * 10) + 1;
      operation = '+';
      break;
  }

  if (operation === '-' && num1 < num2) {
    [num1, num2] = [num2, num1]; // Ensure the result is not negative
  }
  
  const answer = operation === '+' ? num1 + num2 : num1 - num2;
  
  return {
    num1,
    num2,
    operation,
    answer,
  };
};

export default function MathGatesChallenge() {
  const [problem, setProblem] = useState(generateProblem('Easy'));
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [streak, setStreak] = useState(0);
  const { toast } = useToast();

  const difficulty = useMemo(() => {
    if (streak >= 10) return 'Hard';
    if (streak >= 5) return 'Medium';
    return 'Easy';
  }, [streak]);
  
  useEffect(() => {
    setProblem(generateProblem(difficulty));
  }, [difficulty]);
  
  const handleCheckAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (parseInt(userAnswer) === problem.answer) {
      setFeedback('correct');
      setStreak(s => s + 1);
      toast({
        title: "Correct!",
        description: "Great job! Here's another one.",
      });
      setTimeout(() => {
        setProblem(generateProblem(difficulty));
        setUserAnswer('');
        setFeedback(null);
      }, 1000);
    } else {
      setFeedback('incorrect');
      setStreak(0);
      toast({
        variant: "destructive",
        title: "Not quite!",
        description: "Try again. You can do it!",
      });
      setTimeout(() => {
        setFeedback(null);
      }, 1500);
    }
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 font-headline text-2xl">
            <BrainCircuit className="text-primary"/>
            Magical Math Gates
        </CardTitle>
        <CardDescription>Solve the math problem to proceed!</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center items-center text-4xl font-bold font-mono bg-muted p-8 rounded-lg">
          <span>{problem.num1}</span>
          <span className="mx-4">{problem.operation}</span>
          <span>{problem.num2}</span>
          <span className="mx-4">=</span>
          <span>?</span>
        </div>
        
        <form onSubmit={handleCheckAnswer} className="flex gap-2">
          <Input
            type="number"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="Your Answer"
            required
            className="text-center text-lg h-12"
            disabled={feedback !== null}
          />
          <Button type="submit" size="lg" className="h-12" disabled={feedback !== null}>
            Check
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </form>

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
      </CardContent>
    </Card>
  );
}
