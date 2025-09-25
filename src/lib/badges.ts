
import { type useToast } from "@/hooks/use-toast";

export const awardBadge = (badgeName: string, toast: ReturnType<typeof useToast>['toast']) => {
  try {
    const savedBadges = localStorage.getItem('earnedBadges');
    const earnedBadges = savedBadges ? JSON.parse(savedBadges) : [];

    if (!earnedBadges.includes(badgeName)) {
      const updatedBadges = [...earnedBadges, badgeName];
      localStorage.setItem('earnedBadges', JSON.stringify(updatedBadges));
      
      toast({
        title: "Badge Unlocked!",
        description: `You've earned the "${badgeName}" badge!`,
        duration: 5000,
      });

      // Dispatch a custom event to notify the rest of the app
      window.dispatchEvent(new CustomEvent('badge-unlocked', {
        detail: { badgeName }
      }));
    }
  } catch (error) {
    console.error("Failed to save badge:", error);
  }
};
