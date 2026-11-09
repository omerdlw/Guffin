export const paragraph = (text: string) =>
  ({ kind: "paragraph", text }) as const;

export const bulletList = (...items: string[]) =>
  ({ items, kind: "list" }) as const;
