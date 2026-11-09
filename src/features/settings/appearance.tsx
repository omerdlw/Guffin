"use client";

import {
  setThemeChoice,
  THEME_CHOICES,
  type ThemeChoice,
  useThemeChoice,
} from "@/lib/theme";
import { Button } from "@/design/components/button";
import {
  HighlightGroup,
  useHighlight,
} from "@/design/components/highlight-group";
import { Icon } from "@/design/components/icon";
import {
  rowVariants,
  SURFACE_META,
  SURFACE_STACK,
  SURFACE_TEXT,
  SURFACE_TITLE,
} from "@/design/components/surface";
import { Mark } from "./shared";

const CHOICES: Record<
  ThemeChoice,
  { description: string; icon: string; title: string }
> = {
  system: {
    description: "Follow your device",
    icon: "solar:monitor-bold",
    title: "System",
  },
  light: {
    description: "Paper tinted by the picture",
    icon: "solar:sun-bold",
    title: "Light",
  },
  dark: {
    description: "Near-black, the picture leads",
    icon: "solar:moon-bold",
    title: "Dark",
  },
};

function ChoiceRow({
  choice,
  chosen,
}: {
  choice: ThemeChoice;
  chosen: boolean;
}) {
  const { description, icon, title } = CHOICES[choice];
  const highlight = useHighlight(choice);
  return (
    <Button
      aria-pressed={chosen}
      className={rowVariants({ intent: chosen ? "chosen" : "neutral" })}
      onClick={() => setThemeChoice(choice)}
      {...highlight.props}
    >
      {highlight.node}
      <Mark icon={icon} tone={chosen ? "lit" : "plain"} />
      <span className={SURFACE_TEXT}>
        <span className={SURFACE_TITLE}>{title}</span>
        <span className={SURFACE_META}>{description}</span>
      </span>
      {chosen ? (
        <Icon
          className="center shrink-0 text-grade"
          icon="solar:check-circle-bold"
          size={18}
        />
      ) : null}
    </Button>
  );
}

export function AppearancePanel() {
  const current = useThemeChoice();
  return (
    <HighlightGroup>
      <div className={SURFACE_STACK}>
        {THEME_CHOICES.map((choice) => (
          <ChoiceRow choice={choice} chosen={choice === current} key={choice} />
        ))}
      </div>
    </HighlightGroup>
  );
}
