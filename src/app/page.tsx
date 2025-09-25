
'use client';

import { useState, useEffect } from 'react';
import Header from "@/components/layout/header";
import ProgressTracker from "@/components/dashboard/progress-tracker";
import ObstacleCourse from "@/components/dashboard/obstacle-course";
import VoiceActivity from "@/components/dashboard/voice-activity";
import AdaptiveDifficultyAdjuster from "@/components/dashboard/adaptive-difficulty-adjuster";
import { type Difficulty } from '@/lib/types';
import { calculateLevel } from '@/lib/xp';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookMarked, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [performance, setPerformance] = useState(0.5);
  const [hp, setHp] = useState(100);
  const [xp, setXp] = useState(1150);
  const [level, setLevel] = useState(1);
  const [treasures, setTreasures] = useState(42);

  useEffect(() => {
    setLevel(calculateLevel(xp));
  }, [xp]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-3">
            <h1 className="text-3xl md:text-4xl font-bold font-headline mb-6 text-foreground">Your Adventure Awaits!</h1>
          </div>

          <div className="lg:col-span-1 space-y-8">
            <ProgressTracker hp={hp} setHp={setHp} xp={xp} level={level} treasures={treasures} />
            <VoiceActivity />
             <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline">
                  <BookMarked className="text-accent" />
                  Skit Weaver AI
                </CardTitle>
                <CardDescription>Create a unique adventure skit, one line at a time in a dedicated app experience.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/story-weaver">
                  <Button className="w-full">
                    Launch Skit Weaver
                    <ArrowRight className="ml-2"/>
                  </Button>
                </Link>
              </CardContent>
            </Card>
            <AdaptiveDifficultyAdjuster 
              difficulty={difficulty} 
              setDifficulty={setDifficulty} 
              performance={performance}
            />
          </div>

          <div className="lg:col-span-2">
            <ObstacleCourse 
              difficulty={difficulty} 
              setPerformance={setPerformance} 
              hp={hp} 
              setHp={setHp}
              setXp={setXp}
              setTreasures={setTreasures}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
