
"use client";

import { useEffect, useState, useActionState, Dispatch, SetStateAction } from "react";
import { useFormStatus } from "react-dom";
import { BrainCircuit, Loader, Wand2, ArrowDown, ArrowUp, Equal } from "lucide-react";
import { getNewDifficulty } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { difficultyLevels, type Difficulty } from "@/lib/types";

const initialState = {
  message: "",
  newDifficulty: null,
  reasoning: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? (
        <>
          <Loader className="mr-2 h-4 w-4 animate-spin" />
          Analyzing...
        </>
      ) : (
        <>
          <Wand2 className="mr-2 h-4 w-4" />
          Adjust Difficulty
        </>
      )}
    </Button>
  );
}

type AdaptiveDifficultyAdjusterProps = {
  difficulty: Difficulty;
  setDifficulty: Dispatch<SetStateAction<Difficulty>>;
  performance: number;
};

export default function AdaptiveDifficultyAdjuster({ difficulty, setDifficulty, performance }: AdaptiveDifficultyAdjusterProps) {
  const [state, formAction] = useActionState(getNewDifficulty, initialState);
  const { toast } = useToast();

  const currentDifficulty = difficulty;

  useEffect(() => {
    if (state.message && state.message !== "Success") {
      toast({
        variant: "destructive",
        title: "Oh no! Something went wrong.",
        description: state.message,
      });
    }
    if (state.newDifficulty) {
      setDifficulty(state.newDifficulty as Difficulty);
    }
  }, [state, toast, setDifficulty]);

  const getDifficultyChangeIcon = () => {
    if (!state.newDifficulty || state.newDifficulty === currentDifficulty) return <Equal className="text-muted-foreground"/>;
    const currentIndex = difficultyLevels.indexOf(currentDifficulty);
    const newIndex = difficultyLevels.indexOf(state.newDifficulty as Difficulty);
    if (newIndex > currentIndex) return <ArrowUp className="text-green-500"/>;
    return <ArrowDown className="text-red-500"/>;
  }

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <BrainCircuit className="text-accent" />
          Adaptive Learning AI
        </CardTitle>
        <CardDescription>The AI adjusts challenges to match your skill level.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="performance">Recent Performance: {Math.round(performance * 100)}%</Label>
            <Slider
              id="performance"
              name="performance"
              min={0}
              max={100}
              step={1}
              value={[performance * 100]}
              disabled
            />
            <input type="hidden" name="performance" value={performance} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="difficulty">Current Difficulty</Label>
            <Select name="difficulty" value={currentDifficulty} onValueChange={(value: Difficulty) => setDifficulty(value)}>
              <SelectTrigger id="difficulty" className="w-full bg-background">
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                {difficultyLevels.map(level => (
                  <SelectItem key={level} value={level}>{level}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <SubmitButton />
        </form>
        {state.newDifficulty && (
          <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-3">
            <h4 className="font-semibold text-center">AI Recommendation</h4>
            <div className="flex items-center justify-around text-center">
                <div>
                    <p className="text-xs text-muted-foreground">Previous</p>
                    <p className="font-bold">{difficultyLevels.find(l => l === state.newDifficulty) ? currentDifficulty : 'N/A'}</p>
                </div>
                <div className="p-2 bg-background rounded-full">{getDifficultyChangeIcon()}</div>
                <div>
                    <p className="text-xs text-muted-foreground">New</p>
                    <p className="font-bold text-primary">{state.newDifficulty}</p>
                </div>
            </div>
            <p className="text-sm text-muted-foreground text-center italic">
              &quot;{state.reasoning}&quot;
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
