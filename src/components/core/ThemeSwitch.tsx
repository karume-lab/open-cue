import { MoonStarIcon, SunIcon } from "lucide-react-native";
import { Uniwind, useUniwind } from "uniwind";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

const THEME_ICONS = {
  light: SunIcon,
  dark: MoonStarIcon,
};

function ThemeSwitch() {
  const { theme } = useUniwind();

  function toggleTheme() {
    const newTheme = theme === "dark" ? "light" : "dark";
    Uniwind.setTheme(newTheme);
  }

  return (
    <Button
      onPressIn={toggleTheme}
      size="icon"
      variant="ghost"
      className="absolute top-12 right-4 z-50 web:mx-4 ios:size-9 rounded-full"
    >
      <Icon
        as={THEME_ICONS[(theme ?? "light") as keyof typeof THEME_ICONS]}
        className="size-5"
      />
    </Button>
  );
}

export default ThemeSwitch;
