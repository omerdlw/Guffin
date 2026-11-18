import { crc32, inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { compactPng, encodePng, pngDataUrl } from "./png";

function chunks(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const found: { type: string; data: Uint8Array; crc: number }[] = [];
  let at = 8;
  while (at < bytes.length) {
    const length = view.getUint32(at);
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    const data = bytes.subarray(at + 8, at + 8 + length);
    const crc = view.getUint32(at + 8 + length);
    expect(crc).toBe(crc32(bytes.subarray(at + 4, at + 8 + length)));
    found.push({ type, data, crc });
    at += 12 + length;
  }
  return found;
}

function decode(bytes: Uint8Array) {
  const [header, ...rest] = chunks(bytes);
  const view = new DataView(header!.data.buffer, header!.data.byteOffset);
  const width = view.getUint32(0);
  const height = view.getUint32(4);
  const zlib = Buffer.concat(
    rest.filter(({ type }) => type === "IDAT").map(({ data }) => data),
  );
  const raw = inflateSync(zlib);
  const out = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    expect(raw[y * (width * 4 + 1)]).toBe(0);
    out.set(
      raw.subarray(y * (width * 4 + 1) + 1, (y + 1) * (width * 4 + 1)),
      y * width * 4,
    );
  }
  return { width, height, out, types: [header!.type, ...rest.map((c) => c.type)] };
}

describe("png", () => {
  it("round-trips pixels exactly", () => {
    const width = 7;
    const height = 5;
    const rgba = Uint8Array.from({ length: width * height * 4 }, (_, i) =>
      (i * 37 + 11) % 256,
    );
    const png = encodePng(width, height, rgba);
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const decoded = decode(png);
    expect(decoded.types).toEqual(["IHDR", "IDAT", "IEND"]);
    expect(decoded.width).toBe(width);
    expect(decoded.height).toBe(height);
    expect([...decoded.out]).toEqual([...rgba]);
  });

  it("splits data larger than one stored block", () => {
    const width = 200;
    const height = 120; // ~96 kB raw: two stored blocks
    const rgba = Uint8Array.from({ length: width * height * 4 }, (_, i) =>
      (i * 13) % 251,
    );
    expect([...decode(encodePng(width, height, rgba)).out]).toEqual([...rgba]);
  });

  it("makes a base64 data URL", () => {
    const url = pngDataUrl(1, 1, [1, 2, 3, 255]);
    expect(url.startsWith("data:image/png;base64,")).toBe(true);
    const bytes = Buffer.from(url.split(",")[1]!, "base64");
    expect([...decode(new Uint8Array(bytes)).out]).toEqual([1, 2, 3, 255]);
  });
});

describe("compactPng", () => {
  it("deflates the data and keeps every pixel", async () => {
    const width = 40;
    const height = 30;
    const rgba = Uint8Array.from({ length: width * height * 4 }, (_, i) =>
      i % 4 === 3 ? 255 : 128 + ((i >> 6) % 3),
    );
    const url = pngDataUrl(width, height, rgba);
    const compact = await compactPng(url);
    expect(compact.length).toBeLessThan(url.length / 3);
    const bytes = new Uint8Array(Buffer.from(compact.split(",")[1]!, "base64"));
    expect([...decode(bytes).out]).toEqual([...rgba]);
    expect(await compactPng(compact)).toBe(compact);
  });
});
