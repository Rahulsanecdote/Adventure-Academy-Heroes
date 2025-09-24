
"use client";

import { useState } from "react";
import { BrainCircuit, CaseUpper, Palette, Puzzle, Shapes, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MathGatesChallenge from "@/components/challenges/math-gates";

const challenges = [
  {
    id: "math-gates",
    title: "Magical Math Gates",
    description: "Solve number puzzles to unlock the gates and continue your journey.",
    icon: Puzzle,
    badge: "New",
    color: "bg-blue-100 dark:bg-blue-900/30",
    badgeColor: "bg-blue-500",
    component: <MathGatesChallenge />,
  },
  {
    id: "letter-river",
    title: "Letter Recognition River",
    description: "Hop across the stones by identifying the correct letters.",
    icon: CaseUpper,
    badge: "Recommended",
    color: "bg-green-100 dark:bg-green-900/30",
    badgeColor: "bg-green-500",
    component: <p>Letter Recognition River coming soon!</p>,
  },
  {
    id: "shape-forest",
    title: "Shape Sorting Forest",
    description: "Clear the path by matching shapes to their silhouettes.",
    icon: Shapes,
    badge: "Popular",
    color: "bg-yellow-100 dark:bg-yellow-900/30",
    badgeColor: "bg-yellow-500",
    component: <p>Shape Sorting Forest coming soon!</p>,
  },
  {
    id: "color-canyon",
    title: "Color Clearing Canyon",
    description: "Mix and match colors to paint bridges and cross the canyon.",
    icon: Palette,
    badge: "Advanced",
    color: "bg-purple-100 dark:bg-purple-900/30",
    badgeColor: "bg-purple-500",
    component: <p>Color Clearing Canyon coming soon!</p>,
  },
  {
    id: "logic-leap",
    title: "Logic Lava Leap",
    description: "Use your problem-solving skills to find a safe path across the lava.",
    icon: BrainCircuit,
    badge: "Expert",
    color: "bg-red-100 dark:bg-red-900/30",
    badgeColor: "bg-red-500",
    component: <p>Logic Lava Leap coming soon!</p>,
  },
];

export default function ObstacleCourse() {
  const [activeChallenge, setActiveChallenge] = useState<string | null>(null);

  const currentChallenge = challenges.find(c => c.id === activeChallenge);

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
                onClick={() => setActiveChallenge(challenge.id)}
              >
                Start Challenge <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      <Dialog open={!!activeChallenge} onOpenChange={(isOpen) => !isOpen && setActiveChallenge(null)}>
        <DialogContent className="sm:max-w-md">
            {currentChallenge?.component}
        </DialogContent>
      </Dialog>
    </div>
  );
}
