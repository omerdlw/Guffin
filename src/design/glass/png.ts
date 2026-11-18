const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const BLOCK = 0xffff;

let table: Uint32Array | null = null;

function crcTable() {
  if (table) return table;
  table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}

function crc32(bytes: Uint8Array, from: number, to: number) {
  const t = crcTable();
  let c = 0xffffffff;
  for (let i = from; i < to; i++) c = t[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function adler32(bytes: Uint8Array) {
  let a = 1;
  let b = 0;
  for (let i = 0; i < bytes.length; i++) {
    a = (a + bytes[i]!) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

export function encodePng(
  width: number,
  height: number,
  rgba: ArrayLike<number>,
): Uint8Array {
  const stride = width * 4;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (stride + 1);
    for (let i = 0; i < stride; i++) raw[row + 1 + i] = rgba[y * stride + i]!;
  }
  const blocks = Math.max(1, Math.ceil(raw.length / BLOCK));
  const zlib = new Uint8Array(2 + blocks * 5 + raw.length + 4);
  let at = 0;
  zlib[at++] = 0x78;
  zlib[at++] = 0x01;
  for (let block = 0; block < blocks; block++) {
    const start = block * BLOCK;
    const length = Math.min(BLOCK, raw.length - start);
    zlib[at++] = block === blocks - 1 ? 1 : 0;
    zlib[at++] = length & 0xff;
    zlib[at++] = length >>> 8;
    zlib[at++] = ~length & 0xff;
    zlib[at++] = (~length >>> 8) & 0xff;
    zlib.set(raw.subarray(start, start + length), at);
    at += length;
  }
  const check = adler32(raw);
  zlib[at++] = check >>> 24;
  zlib[at++] = (check >>> 16) & 0xff;
  zlib[at++] = (check >>> 8) & 0xff;
  zlib[at++] = check & 0xff;

  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  header[8] = 8;
  header[9] = 6;
  const chunks: [string, Uint8Array][] = [
    ["IHDR", header],
    ["IDAT", zlib],
    ["IEND", new Uint8Array(0)],
  ];
  const size =
    SIGNATURE.length +
    chunks.reduce((sum, [, data]) => sum + 12 + data.length, 0);
  const out = new Uint8Array(size);
  const write = new DataView(out.buffer);
  out.set(SIGNATURE, 0);
  let offset = SIGNATURE.length;
  for (const [type, data] of chunks) {
    write.setUint32(offset, data.length);
    for (let i = 0; i < 4; i++) out[offset + 4 + i] = type.charCodeAt(i);
    out.set(data, offset + 8);
    const end = offset + 8 + data.length;
    write.setUint32(end, crc32(out, offset + 4, end));
    offset = end + 4;
  }
  return out;
}

export function pngDataUrl(
  width: number,
  height: number,
  rgba: ArrayLike<number>,
): string {
  return toDataUrl(encodePng(width, height, rgba));
}

const BASE64 = "data:image/png;base64,";

function bytesOf(url: string) {
  const binary = atob(url.slice(BASE64.length));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function toDataUrl(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return `${BASE64}${btoa(binary)}`;
}

function chunk(type: string, data: Uint8Array) {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out, 4, 8 + data.length));
  return out;
}

export async function compactPng(url: string): Promise<string> {
  if (!url.startsWith(BASE64) || typeof CompressionStream === "undefined") {
    return url;
  }
  const png = bytesOf(url);
  const view = new DataView(png.buffer);
  const header = png.subarray(16, 29);
  let at = 33;
  const length = view.getUint32(at);
  const type = String.fromCharCode(...png.subarray(at + 4, at + 8));
  if (type !== "IDAT") return url;
  const zlib = png.subarray(at + 8, at + 8 + length);
  if (zlib[1] !== 0x01) return url;
  const parts: Uint8Array[] = [];
  at = 2;
  for (;;) {
    const last = zlib[at]! & 1;
    const size = zlib[at + 1]! | (zlib[at + 2]! << 8);
    parts.push(zlib.subarray(at + 5, at + 5 + size));
    at += 5 + size;
    if (last) break;
  }
  const stream = new Blob(parts as BlobPart[])
    .stream()
    .pipeThrough(new CompressionStream("deflate"));
  const deflated = new Uint8Array(await new Response(stream).arrayBuffer());
  const pieces = [
    png.subarray(0, 8),
    chunk("IHDR", header),
    chunk("IDAT", deflated),
    chunk("IEND", new Uint8Array(0)),
  ];
  const out = new Uint8Array(pieces.reduce((sum, p) => sum + p.length, 0));
  let offset = 0;
  for (const piece of pieces) {
    out.set(piece, offset);
    offset += piece.length;
  }
  return toDataUrl(out);
}
