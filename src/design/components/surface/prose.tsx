import { cn } from "../../foundations/cn";
import { SURFACE_PANEL, SURFACE_SCROLL } from "./anatomy";

/** Long text inside a surface: paragraphs on a panel that scrolls on its own. */
export function SurfaceProse({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  return (
    <div
      className={cn(
        SURFACE_PANEL,
        SURFACE_SCROLL,
        "max-h-[min(52dvh,24rem)] p-4",
      )}
      data-scroll-native
    >
      <div className="flex flex-col gap-3 type-body leading-6 text-pretty [overflow-wrap:anywhere] text-ink-body select-text">
        {paragraphs.map((paragraph, index) => (
          <p className="whitespace-pre-line" key={index}>
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}
