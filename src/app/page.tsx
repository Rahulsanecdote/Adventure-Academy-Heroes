import Header from "@/components/layout/header";
import ProgressTracker from "@/components/dashboard/progress-tracker";
import ObstacleCourse from "@/components/dashboard/obstacle-course";
import VoiceActivity from "@/components/dashboard/voice-activity";
import AdaptiveDifficultyAdjuster from "@/components/dashboard/adaptive-difficulty-adjuster";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-3">
            <h1 className="text-3xl md:text-4xl font-bold font-headline mb-6 text-foreground">Your Adventure Awaits!</h1>
          </div>

          <div className="lg:col-span-1 space-y-8">
            <ProgressTracker />
            <VoiceActivity />
            <AdaptiveDifficultyAdjuster />
          </div>

          <div className="lg:col-span-2">
            <ObstacleCourse />
          </div>
        </div>
      </main>
    </div>
  );
}
