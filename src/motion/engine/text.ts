import type { PartOptions, Stage } from "./stage";

// Words are siblings of one part. Split by word, each word trails the one
// before; split by line, the words of a line move together and the lines
// trail. Either way the sentence is one part with one matter.

export type Split = "word" | "line";

export const words = (text: string) => text.split(/\s+/).filter(Boolean);

export const WORD = "data-word";

// Words that share a top edge share a line.
export function lines(spans: readonly HTMLElement[]) {
  const tops: number[] = [];
  return spans.map((span) => {
    const top = span.offsetTop;
    let line = tops.findIndex((at) => Math.abs(at - top) < 2);
    if (line === -1) line = tops.push(top) - 1;
    return line;
  });
}

export function mountText<P extends string, S extends string>(
  stage: Stage<P, S>,
  name: P,
  container: HTMLElement,
  split: Split,
  part: Omit<PartOptions, "index" | "render" | "carry"> = {},
) {
  const spans = Array.from(
    container.querySelectorAll<HTMLElement>(`[${WORD}]`),
  );
  const order = split === "line" ? lines(spans) : spans.map((_, i) => i);
  const handles = spans.map((span, i) =>
    stage.register(name, span, { ...part, index: order[i] }),
  );
  return () => {
    for (const handle of handles) handle.dispose();
  };
}
