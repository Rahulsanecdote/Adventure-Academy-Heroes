import { GraduationCap, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Logo from "@/components/icons/logo";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex items-center">
          <Logo className="h-8 w-8 mr-2 text-primary" />
          <h1 className="text-xl font-bold font-headline text-foreground">
            Adventure Academy Heroes
          </h1>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <Avatar>
            <AvatarImage src="https://picsum.photos/seed/avatar/100/100" data-ai-hint="child avatar" />
            <AvatarFallback>HI</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
