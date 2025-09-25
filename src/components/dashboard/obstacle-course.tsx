
"use client";

import React, { useMemo, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { BrainCircuit, CaseUpper, Palette, Puzzle, Shapes, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type Difficulty } from "@/lib/types";
import { XP_PER_CORRECT_ANSWER } from "@/lib/xp";

type ObstacleCourseProps = {
  difficulty: Difficulty;
  setPerformance: React.Dispatch<React.SetStateAction<number>>;
  hp: number;
  setHp: React.Dispatch<React.SetStateAction<number>>;
  setXp: React.Dispatch<React.SetStateAction<number>>;
  setTreasures: React.Dispatch<React.SetStateAction<number>>;
};

const EMA_ALPHA = 0.2; // Smoothing factor for performance updates
const TREASURE_CHANCE = 0.25; // 25% chance to get a treasure

const challenges = [
  {
    id: "math-gates",
    title: "Magical Math Gates",
    description: "Solve number puzzles to unlock the gates and continue your journey.",
    icon: Puzzle,
    badge: "New",
    color: "bg-blue-100 dark:bg-blue-900/30",
    badgeColor: "bg-blue-500",
  },
  {
    id: "letter-river",
    title: "Letter Recognition River",
    description: "Hop across the stones by identifying the correct letters.",
    icon: CaseUpper,
    badge: "Recommended",
    color: "bg-green-100 dark:bg-green-900/30",
    badgeColor: "bg-green-500",
  },
  {
    id: "shape-forest",
    title: "Shape Sorting Forest",
    description: "Clear the path by matching shapes to their silhouettes.",
    icon: Shapes,
    badge: "Popular",
    color: "bg-yellow-100 dark:bg-yellow-900/30",
    badgeColor: "bg-yellow-500",
  },
  {
    id: "color-canyon",
    title: "Color Clearing Canyon",
    description: "Mix and match colors to paint bridges and cross the canyon.",
    icon: Palette,
    badge: "Advanced",
    color: "bg-purple-100 dark:bg-purple-900/30",
    badgeColor: "bg-purple-500",
  },
  {
    id: "logic-leap",
    title: "Logic Lava Leap",
    description: "Use your problem-solving skills to find a safe path across the lava.",
    icon: BrainCircuit,
    badge: "Expert",
    color: "bg-red-100 dark:bg-red-900/30",
    badgeColor: "bg-red-500",
  },
];


export default function ObstacleCourse({ difficulty, setPerformance, hp, setHp, setXp, setTreasures }: ObstacleCourseProps) {
  const router = useRouter();

  const handleStartChallenge = (challengeId: string) => {
    if (challengeId === 'logic-leap') {
      // Potentially show a "coming soon" toast
      return;
    }
    
    // Store performance update logic in session storage to be picked up by the challenge page
    // This is a way to pass function-like behavior to a new page without complex state management libraries
    const performanceUpdater = {
      alpha: EMA_ALPHA,
      treasureChance: TREASURE_CHANCE,
      xpPerCorrect: XP_PER_CORRECT_ANSWER,
    };
    sessionStorage.setItem('performanceUpdater', JSON.stringify(performanceUpdater));
    sessionStorage.setItem('difficulty', difficulty);

    router.push(`/challenge/${challengeId}`);
  };

  return (
    <div className="space-y-6">
       <h2 className="text-2xl font-bold font-headline text-foreground">Learning Adventures</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {challenges.map((challenge) => (
          <Card key={challenge.title} className={`flex flex-col transform transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg ${challenge.color}`}>
            <CardHeader className="flex-row items-start gap-4 space-y-0">
                <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-card">
                    <challenge.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                    <CardTitle className="font-headline">{challenge.title}</CardTitle>
                    <CardDescription>{challenge.description}</CardDescription>
                </div>
                <Badge variant="secondary" className={`whitespace-nowrap ${challenge.badgeColor} text-white`}>{challenge.badge}</Badge>
            </CardHeader>
            <CardFooter className="mt-auto">
              <Button
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => handleStartChallenge(challenge.id)}
                disabled={hp <= 0 || challenge.id === 'logic-leap'}
              >
                {hp <= 0 ? "Not enough HP" : challenge.id === 'logic-leap' ? "Coming Soon" : "Start Challenge"}
                {hp > 0 && challenge.id !== 'logic-leap' && <ArrowRight className="ml-2 w-4 h-4" />}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
