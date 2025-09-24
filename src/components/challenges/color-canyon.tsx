
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Palette, RotateCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { type Difficulty } from '@/lib/types';

const colors = [
    { name: 'Red', hex: '#ef4444' },
    { name: 'Green', hex: '#22c55e' },
    { name: 'Blue', hex: '#3b82f6' },
    { name: 'Yellow', hex: '#eab308' },
    { name: 'Orange', hex: '#f97316' },
    { name: 'Purple', hex: '#8b5cf6' },
];

const generateProblem = (difficulty: Difficulty) => {
  const targetColor = colors[Math.floor(Math.random() * colors.length)];
  
  let options = [targetColor];
  let numOptions = 2;
  switch (difficulty) {
    case 'Very Easy':
    case 'Easy':
      numOptions = 2;
      break;
    case 'Medium':
      numOptions = 3;
      break;
    case 'Hard':
    case 'Very Hard':
      numOptions = 4;
      break;
  }

  while (options.length < numOptions) {
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    if (!options.some(opt => opt.name === randomColor.name)) {
      options.push(randomColor);
    }
  }

  return {
    targetColor,
    options: options.sort(() => Math.random() - 0.5)
  };
};

type ChallengeProps = {
  difficulty: Difficulty;
  onPerformanceUpdate: (correct: boolean) => void;
};

export default function ColorCanyonChallenge({ difficulty, onPerformanceUpdate }: ChallengeProps) {
  const [streak, setStreak] = useState(0);
  const { toast } = useToast();

  const [problem, setProblem] = useState(generateProblem(difficulty));
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);

  const nextProblem = useCallback(() => {
    setProblem(generateProblem(difficulty));
    setFeedback(null);
  }, [difficulty]);
  
  useEffect(() => {
    setProblem(generateProblem(difficulty));
  }, [difficulty]);
  
  const handleSelectAnswer = (selectedColor: typeof colors[0]) => {
    if (feedback) return;

    const isCorrect = selectedColor.name === problem.targetColor.name;
    onPerformanceUpdate(isCorrect);

    if (isCorrect) {
      setFeedback('correct');
      setStreak(s => s + 1);
      toast({
        title: "Correct!",
        description: `You identified the color ${problem.targetColor.name}!`,
      });
      setTimeout(() => nextProblem(), 1000);
    } else {
      setFeedback('incorrect');
      setStreak(0);
      toast({
        variant: "destructive",
        title: "Not quite!",
        description: "That's not the right color. Try again!",
      });
      setTimeout(() => setFeedback(null), 1500);
    }
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 font-headline text-2xl">
            <Palette className="text-primary"/>
            Color Clearing Canyon
        </CardTitle>
        <CardDescription>Select the color that matches the name!</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center items-center bg-muted p-4 rounded-lg min-h-[80px]">
          <p className="text-4xl font-bold" style={{color: problem.targetColor.hex === '#eab308' ? '#a16207' : 'inherit' }}>
            {problem.targetColor.name}
          </p>
        </div>
        
        <div className="flex justify-center items-center gap-4">
          {problem.options.map((option) => (
             <button 
                key={option.name} 
                onClick={() => handleSelectAnswer(option)} 
                disabled={!!feedback}
                className="h-20 w-20 rounded-full border-4 border-transparent transition-transform hover:scale-110 hover:border-primary focus:border-primary focus:scale-110 outline-none"
                style={{ backgroundColor: option.hex }}
             >
                <span className="sr-only">{option.name}</span>
             </button>
          ))}
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

        <div className="text-center text-sm text-muted-foreground flex justify-center items-center gap-4">
            <p>Streak: <span className="font-bold text-primary">{streak}</span></p>
            <Button variant="ghost" size="icon" onClick={nextProblem}><RotateCw className="w-4 h-4"/></Button>
        </div>
      </CardContent>
    </Card>
  );
}
