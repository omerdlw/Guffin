#!/usr/bin/env node
// Scroll benchmark. Opens each page in Chromium, lets the entrances finish,
// sits idle for a moment, then drives the page with real wheel input (the
// app's own scroll driver takes it from there) while a trace records what
// the main thread and the compositor did.
//
//   node scripts/perf/scroll.mjs [--base http://localhost:3000] [--runs 3]
//        [--pages /,/movie/603] [--out result.json] [--images http://127.0.0.1:4010]
//        [--webgl] [--headed]
//
// --images  reroutes image.tmdb.org to a local server (scripts/perf/fixture),
//           so the benchmark runs offline.
// --webgl   keeps WebGL on. Off by default: on a machine without a GPU the
//           browser reads every WebGL frame back to the CPU, which swamps
//           every other number. Leave it on when running on real hardware.
//
// Per page it reports medians over --runs of:
//   fps, frame p95, jank      requestAnimationFrame cadence while scrolling
//   main ms/frame             busy time of the renderer main thread
//   script/style/layout       their share, plus how many style and layout
//                             passes ran per frame
//   forced ms                 forced (synchronous) style+layout inside scripts
//   draw ms/frame, passes     compositor draw time and render passes per frame
//                             (a software stand-in for GPU fill cost)
//   idle frames/s             frames produced while nothing moves at all
//   nodes, listeners, heap    page weight after the run

import { writeFileSync } from "node:fs";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : fallback;
};
const flag = (name) => args.includes(`--${name}`);

const BASE = option("base", "http://localhost:3000");
const RUNS = Number(option("runs", 3));
const PAGES = option("pages", "/").split(",");
const OUT = option("out", null);
const IMAGES = option("images", null);
const WIDTH = Number(option("width", 1440));
const HEIGHT = Number(option("height", 900));
const STEPS = Number(option("steps", 60));
const IDLE_MS = 3000;

const CATEGORIES = [
  "devtools.timeline",
  "disabled-by-default-devtools.timeline",
  "toplevel",
  "viz",
  "cc",
  "blink.user_timing",
];

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};
const quantile = (values, q) => {
  const sorted = [...values].sort((a, b) => a - b);
  return (
    sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0
  );
};

const PROBE = () => {
  const probe = { frames: [], forced: 0, running: false };
  window.__perf = probe;
  try {
    new PerformanceObserver((list) => {
      if (!probe.running) return;
      for (const entry of list.getEntries())
        for (const script of entry.scripts)
          probe.forced += script.forcedStyleAndLayoutDuration ?? 0;
    }).observe({ type: "long-animation-frame" });
  } catch {}
  let last = 0;
  const tick = (now) => {
    if (probe.running) {
      if (last) probe.frames.push(now - last);
      last = now;
    } else last = 0;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

/** Sums trace events inside [from, to] (µs) into the numbers above. */
function readTrace(buffer, from, to) {
  const { traceEvents } = JSON.parse(buffer.toString());
  const threads = new Map();
  for (const e of traceEvents)
    if (e.ph === "M" && e.name === "thread_name")
      threads.set(`${e.pid}:${e.tid}`, e.args.name);
  const main = new Set(
    [...threads]
      .filter(([, name]) => name === "CrRendererMain")
      .map(([key]) => key),
  );

  const sum = { task: 0, script: 0, style: 0, layout: 0, paint: 0 };
  const count = { style: 0, layout: 0, draws: 0, passes: 0 };
  let draw = 0;
  for (const e of traceEvents) {
    if (e.ph !== "X" || e.ts < from || e.ts > to) continue;
    const key = `${e.pid}:${e.tid}`;
    const dur = (e.dur ?? 0) / 1000;
    if (main.has(key)) {
      if (e.name === "ThreadControllerImpl::RunTask") sum.task += dur;
      else if (e.name === "FunctionCall" || e.name === "EvaluateScript")
        sum.script += dur;
      else if (e.name === "UpdateLayoutTree") {
        sum.style += dur;
        count.style += 1;
      } else if (e.name === "Layout") {
        sum.layout += dur;
        count.layout += 1;
      } else if (e.name === "Paint" || e.name === "PaintImage")
        sum.paint += dur;
    } else if (threads.get(key) === "VizCompositorThread") {
      if (e.name === "DirectRenderer::DrawFrame") {
        draw += dur;
        count.draws += 1;
      } else if (e.name === "DirectRenderer::DrawRenderPass") count.passes += 1;
    }
  }
  return { sum, count, draw };
}

async function run(browser, path) {
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });
  if (IMAGES) {
    await context.route(/^https:\/\/image\.tmdb\.org\//, async (route) =>
      route.fulfill({
        response: await route.fetch({
          url: route.request().url().replace("https://image.tmdb.org", IMAGES),
        }),
      }),
    );
  }
  const page = await context.newPage();
  await page.addInitScript(PROBE);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Performance.enable");
  await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 90_000 });
  await page.mouse.move(WIDTH * 0.62, HEIGHT * 0.55);
  await page.waitForTimeout(5000);

  const clock = () =>
    page.evaluate(() => performance.timeOrigin + performance.now());
  await browser.startTracing(page, { categories: CATEGORIES });
  // Trace timestamps are monotonic µs; anchor them with a marker.
  await page.evaluate(() => performance.mark("perf:idle"));
  await page.waitForTimeout(IDLE_MS);
  await page.evaluate(() => {
    performance.mark("perf:scroll");
    window.__perf.running = true;
  });
  const started = await clock();
  for (let i = 0; i < STEPS; i++) {
    await page.mouse.wheel(0, i < STEPS * 0.7 ? 120 : -160);
    await page.waitForTimeout(32);
  }
  await page.waitForTimeout(800);
  const wall = (await clock()) - started;
  const probe = await page.evaluate(() => {
    window.__perf.running = false;
    performance.mark("perf:end");
    return { frames: window.__perf.frames, forced: window.__perf.forced };
  });
  const buffer = await browser.stopTracing();
  const { metrics } = await cdp.send("Performance.getMetrics");
  const metric = (name) => metrics.find((m) => m.name === name)?.value ?? 0;
  await context.close();

  const marks = {};
  for (const e of JSON.parse(buffer.toString()).traceEvents)
    if (e.name?.startsWith("perf:")) marks[e.name] ??= e.ts;
  if (!marks["perf:idle"] || !marks["perf:scroll"] || !marks["perf:end"])
    throw new Error("trace markers missing");

  const idle = readTrace(buffer, marks["perf:idle"], marks["perf:scroll"]);
  const scroll = readTrace(buffer, marks["perf:scroll"], marks["perf:end"]);
  const frames = Math.max(1, probe.frames.length);
  const draws = Math.max(1, scroll.count.draws);
  const budget = 1000 / 60;
  return {
    fps: (probe.frames.length / wall) * 1000,
    frameP95: quantile(probe.frames, 0.95),
    jank: probe.frames.filter((f) => f > budget * 1.5).length / frames,
    mainMsPerFrame: scroll.sum.task / frames,
    scriptMsPerFrame: scroll.sum.script / frames,
    styleMsPerFrame: scroll.sum.style / frames,
    stylesPerFrame: scroll.count.style / frames,
    layoutMsPerFrame: scroll.sum.layout / frames,
    layoutsPerFrame: scroll.count.layout / frames,
    paintMsPerFrame: scroll.sum.paint / frames,
    forcedMs: probe.forced,
    drawMsPerFrame: scroll.draw / draws,
    passesPerFrame: scroll.count.passes / draws,
    idleFramesPerSec: idle.count.draws / (IDLE_MS / 1000),
    idleMainMsPerSec: idle.sum.task / (IDLE_MS / 1000),
    nodes: metric("Nodes"),
    listeners: metric("JSEventListeners"),
    heapMB: metric("JSHeapUsedSize") / 1048576,
  };
}

const browser = await chromium.launch({
  headless: !flag("headed"),
  args: flag("webgl") ? [] : ["--disable-webgl", "--disable-webgl2"],
});
const report = {};
for (const path of PAGES) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) runs.push(await run(browser, path));
  report[path] = Object.fromEntries(
    Object.keys(runs[0]).map((key) => [
      key,
      +median(runs.map((r) => r[key])).toFixed(3),
    ]),
  );
  console.log(path, JSON.stringify(report[path]));
}
await browser.close();
if (OUT) writeFileSync(OUT, JSON.stringify(report, null, 2));
