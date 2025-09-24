
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Shapes, RotateCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ShapeType = 'circle' | 'square' | 'triangle';

const Shape = ({ shape, color, ...props }: {shape: ShapeType, color: string, [key: string]: any}) => {
    const style = { backgroundColor: shape !== 'triangle' ? color : undefined, borderBottomColor: shape === 'triangle' ? color : undefined };
    switch (shape) {
        case 'circle':
            return <div className="h-24 w-24 rounded-full" style={style} {...props}></div>;
        case 'square':
            return <div className="h-24 w-24 rounded-lg" style={style} {...props}></div>;
        case 'triangle':
            return <div className="w-0 h-0 border-l-[60px] border-l-transparent border-b-[100px] border-r-[60px] border-r-transparent" style={style} {...props}></div>;
    }
};


const generateProblem = (difficulty: 'Easy' | 'Medium' | 'Hard') => {
  const shapes: ShapeType[] = ['circle', 'square', 'triangle'];
  const colors = ['#3b82f6', '#22c55e', '#f97316', '#8b5cf6'];

  const targetShape = shapes[Math.floor(Math.random() * shapes.length)];
  const targetColor = colors[Math.floor(Math.random() * colors.length)];
  
  let options: {shape: ShapeType; color: string}[] = [{shape: targetShape, color: targetColor}];
  
  const numOptions = difficulty === 'Easy' ? 2 : difficulty === 'Medium' ? 3 : 4;

  while (options.length < numOptions) {
    const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    if (!options.some(opt => opt.shape === randomShape && opt.color === randomColor)) {
      options.push({shape: randomShape, color: randomColor});
    }
  }

  return {
    targetShape,
    targetColor,
    options: options.sort(() => Math.random() - 0.5)
  };
};

export default function ShapeForestChallenge() {
  const [streak, setStreak] = useState(0);
  const { toast } = useToast();

  const difficulty = useMemo(() => {
    if (streak >= 6) return 'Hard';
    if (streak >= 3) return 'Medium';
    return 'Easy';
  }, [streak]);

  const [problem, setProblem] = useState(generateProblem(difficulty));
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);

  const nextProblem = useCallback(() => {
    setProblem(generateProblem(difficulty));
    setFeedback(null);
  }, [difficulty]);
  
  useEffect(() => {
    setProblem(generateProblem(difficulty));
  }, [difficulty]);
  
  const handleSelectAnswer = (selected: {shape: ShapeType; color: string}) => {
    if (feedback) return;

    if (selected.shape === problem.targetShape) {
      setFeedback('correct');
      setStreak(s => s + 1);
      toast({
        title: "Correct!",
        description: "You found the right shape!",
      });
      setTimeout(() => nextProblem(), 1000);
    } else {
      setFeedback('incorrect');
      setStreak(0);
      toast({
        variant: "destructive",
        title: "Not quite!",
        description: "That's not the matching shape. Try again!",
      });
      setTimeout(() => setFeedback(null), 1500);
    }
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 font-headline text-2xl">
            <Shapes className="text-primary"/>
            Shape Sorting Forest
        </CardTitle>
        <CardDescription>Match the shape to its silhouette!</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center items-center bg-muted p-4 rounded-lg min-h-[120px]">
          <Shape shape={problem.targetShape} color="hsl(var(--foreground) / 0.2)" />
        </div>
        
        <div className="flex justify-around items-end gap-4">
          {problem.options.map((option, index) => (
             <div key={index} className="flex flex-col items-center gap-2">
                <Shape shape={option.shape} color={option.color}/>
                <Button onClick={() => handleSelectAnswer(option)} disabled={!!feedback} variant="outline" className="w-full">
                    Select
                </Button>
             </div>
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
