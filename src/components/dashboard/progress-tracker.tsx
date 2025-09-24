
import { Award, Gem, Star, Trophy, Heart, PlusCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "../ui/button";

const badges = [
  { icon: Star, color: "text-yellow-400", label: "First Steps" },
  { icon: Award, color: "text-blue-400", label: "Math Whiz" },
  { icon: Trophy, color: "text-green-400", label: "Reading Champ" },
  { icon: Gem, color: "text-purple-400", label: "Creative Genius" },
];

type ProgressTrackerProps = {
  hp: number;
  setHp: React.Dispatch<React.SetStateAction<number>>;
}

export default function ProgressTracker({ hp, setHp }: ProgressTrackerProps) {
  const handleHeal = () => {
    setHp(currentHp => Math.min(100, currentHp + 20));
  }

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <Trophy className="text-accent" />
          My Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Current Level</p>
          <p className="text-5xl font-bold text-primary">12</p>
        </div>
        <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
                <span className="text-muted-foreground">Level Progress</span>
                <span className="text-primary-foreground">65%</span>
            </div>
          <Progress value={65} className="h-3" />
          <p className="text-xs text-muted-foreground text-center pt-1">350 XP to next level!</p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold text-foreground flex items-center gap-2"><Heart className="text-red-500"/> Health</h4>
            <span className="font-bold text-lg">{hp}/100</span>
          </div>
          <Progress value={hp} className="h-4 [&>div]:bg-red-500" />
          <div className="flex justify-center">
             <Button onClick={handleHeal} disabled={hp === 100} size="sm" variant="outline" className="mt-2">
              <PlusCircle className="mr-2 h-4 w-4"/>
              Heal (20 HP)
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-foreground">Hero Badges</h4>
          <div className="grid grid-cols-4 gap-4">
            {badges.map((badge) => (
              <div key={badge.label} className="flex flex-col items-center text-center gap-1" title={badge.label}>
                <div className="p-3 bg-muted rounded-full">
                  <badge.icon className={`w-6 h-6 ${badge.color}`} />
                </div>
                <p className="text-xs text-muted-foreground truncate">{badge.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
          <h4 className="font-semibold text-foreground">Treasures</h4>
          <div className="flex items-center gap-2 font-bold text-accent">
            <Gem />
            <span>42</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
