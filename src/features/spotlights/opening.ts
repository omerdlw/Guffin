import { GRAMMAR, landed, size } from "@/motion/stage";

const END = GRAMMAR.title.at + GRAMMAR.title.run + landed(1);

export const SPOTLIGHT_OPENING = {
  end: END,
  length: END - GRAMMAR.opening.base + size(1),
};
