import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "./theme-provider";
import { THEME_LIGHT } from "@/lib/constants";

const TOGGLE_ICON_CLASS = "w-4 h-4";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={toggleTheme}
      data-testid="button-theme-toggle"
    >
      {theme === THEME_LIGHT
        ? <Moon className={TOGGLE_ICON_CLASS} />
        : <Sun  className={TOGGLE_ICON_CLASS} />
      }
    </Button>
  );
}
