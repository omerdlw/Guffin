interface Piece {
  digit: boolean;
  key: string;
  text: string;
}

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
