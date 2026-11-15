// How a dock action's label changes, read from its text: the words and the
// numbers in it. When only a number changes ("More reviews (117)" → "(97)")
// only the digits that changed roll; when the words change ("Add Review" →
// "Edit Review") the whole label does. Pure, for ActionLabel.

export interface Piece {
  digit: boolean;
  /**
   * Stable across changes of the same label: words by their order, a digit
   * by its number's order and its place from the right, so the units stay
   * the units when a number gains or loses a digit.
   */
  key: string;
  text: string;
}

/**
 * The label with its numbers hidden (each one `#`, whatever its length):
 * equal shapes differ only in their numbers.
 */
export const shapeOf = (text: string) => text.replace(/\d+/g, "#");

export function pieces(text: string): Piece[] {
  const list: Piece[] = [];
  let words = 0;
  let numbers = 0;
  for (const [run] of text.matchAll(/\d+|\D+/g)) {
    if (/^\d/.test(run)) {
      const number = numbers++;
      Array.from(run).forEach((digit, index) => {
        list.push({
          digit: true,
          key: `n${number}:${run.length - 1 - index}`,
          text: digit,
        });
      });
    } else {
      list.push({ digit: false, key: `t${words++}`, text: run });
    }
  }
  return list;
}
