
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

import MathGatesChallenge from "@/components/challenges/math-gates";
import LetterRiverChallenge from "@/components/challenges/letter-river";
import ShapeForestChallenge from "@/components/challenges/shape-forest";
import ColorCanyonChallenge from "@/components/challenges/color-canyon";
import { type Difficulty, difficultyLevels } from "@/lib/types";

// A mapping from challenge ID to component
const challengeComponents: { [key: string]: React.FC<any> } = {
  'math-gates': MathGatesChallenge,
  'letter-river': LetterRiverChallenge,
  'shape-forest': ShapeForestChallenge,
  'color-canyon': ColorCanyonChallenge,
};

// A fallback component for when a challenge doesn't exist
const NotFound = () => (
  <div className="text-center">
    <h2 className="text-2xl font-bold mb-4">Challenge Not Found</h2>
    <p>The challenge you are looking for does not exist.</p>
  </div>
);

export default function ChallengePage() {
  const params = useParams();
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [performanceUpdater, setPerformanceUpdater] = useState<any>(null);

  useEffect(() => {
    // Retrieve settings from session storage
    const storedDifficulty = sessionStorage.getItem('difficulty') as Difficulty;
    const storedUpdater = sessionStorage.getItem('performanceUpdater');

    if (storedDifficulty && difficultyLevels.includes(storedDifficulty)) {
      setDifficulty(storedDifficulty);
    }
    if (storedUpdater) {
      setPerformanceUpdater(JSON.parse(storedUpdater));
    }
  }, []);

  const handlePerformanceUpdate = useCallback((isCorrect: boolean) => {
    if (!performanceUpdater) return;

    // This logic is now decoupled and retrieved from session storage
    // It's a simplified way of managing state across page navigations
    // In a larger app, this would be handled by a state management library like Zustand or Redux.
    console.log(`Performance updated. Correct: ${isCorrect}`);
  }, [performanceUpdater]);

  const challengeId = Array.isArray(params.id) ? params.id[0] : params.id;
  const ChallengeComponent = challengeId ? challengeComponents[challengeId] : null;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-sm">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <h1 className="text-xl font-bold font-headline capitalize">{challengeId?.replace(/-/g, ' ')}</h1>
        <div className="w-10"></div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <Suspense fallback={<Loader2 className="h-16 w-16 animate-spin" />}>
            {ChallengeComponent ? (
                <ChallengeComponent
                    difficulty={difficulty}
                    onPerformanceUpdate={handlePerformanceUpdate}
                />
            ) : challengeId ? (
                <NotFound />
            ) : (
                 <Loader2 className="h-16 w-16 animate-spin" />
            )}
        </Suspense>
      </main>
    </div>
  );
}
