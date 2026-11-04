export const para = (text: string) => ({ kind: "paragraph", text }) as const;

export const list = (...items: string[]) => ({ items, kind: "list" }) as const;
