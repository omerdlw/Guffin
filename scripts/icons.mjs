#!/usr/bin/env node
// Bundles every icon the app draws, so none is fetched at runtime.
//
//   npm run icons          rewrite src/design/icons/collection.json
//   npm run icons:check    fail if it is out of date or an icon does not exist
//
// It reads icon names ("solar:heart-bold") from src/ and from the UI framework
// (which draws a few of its own), takes just those icons from the installed
// @iconify-json sets and writes them as Iconify collections. The <Icon>
// component registers them before anything renders.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative } from "node:path";
import { getIcons } from "@iconify/utils";

const root = new URL("..", import.meta.url).pathname;
const out = join(root, "src/design/icons/collection.json");
const require = createRequire(import.meta.url);

/** The sets icons may come from. Adding one means installing @iconify-json/<prefix>. */
const SETS = ["solar", "simple-icons", "svg-spinners", "lucide", "mdi"];
const SOURCES = [
  { dir: "src", ext: /\.(ts|tsx)$/ },
  { dir: "node_modules/@omerdlw/base-framework/dist", ext: /\.js$/ },
];
const NAME = /["'`]([a-z0-9]+(?:-[a-z0-9]+)*):([a-z0-9]+(?:-[a-z0-9]+)*)["'`]/g;

function* files(dir, ext) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path, ext);
    else if (ext.test(entry.name)) yield path;
  }
}

const wanted = new Map(SETS.map((prefix) => [prefix, new Map()]));
for (const { dir, ext } of SOURCES)
  for (const file of files(join(root, dir), ext))
    for (const [, prefix, name] of readFileSync(file, "utf8").matchAll(NAME))
      wanted.get(prefix)?.set(name, relative(root, file));

const missing = [];
const collections = [];
for (const [prefix, names] of wanted) {
  if (!names.size) continue;
  const set = require(`@iconify-json/${prefix}/icons.json`);
  const icons = getIcons(set, [...names.keys()].sort(), true);
  for (const [name, file] of names)
    if (!icons?.icons[name] && !icons?.aliases?.[name])
      missing.push(`${prefix}:${name} (${file})`);
  if (icons) collections.push(icons);
}

if (missing.length) {
  console.error(`Icons that do not exist:\n  ${missing.join("\n  ")}`);
  process.exit(1);
}

const json = `${JSON.stringify(collections)}\n`;
const count = collections.reduce((n, c) => n + Object.keys(c.icons).length, 0);
if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(out, "utf8");
  } catch {}
  if (current !== json) {
    console.error(
      "src/design/icons/collection.json is out of date: run npm run icons",
    );
    process.exit(1);
  }
  console.log(`${count} icons, up to date`);
} else {
  writeFileSync(out, json);
  console.log(`${count} icons -> ${relative(root, out)}`);
}
