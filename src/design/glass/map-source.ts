import { drawEdgeLight, drawRefraction, fold, type Pieces } from "./maps";
import type { MapJob } from "./maps.worker";

export type MapRequest = { slice: number; radius: number; bezel: number };

type Job = MapRequest & { key: string; done: ((map: Pieces) => void)[] };

/**
 * Lens maps (refraction + edge light, cut into nine-slice pieces) cost a few
 * milliseconds each to draw and encode, and a lens that changes shape every
 * frame (the cursor morphing, the dock folding into its compact row) asks
 * for a new one per frame. They are drawn in a worker, one at a time, newest
 * shape first in line after the one in progress; a shape no lens wants any
 * more by the time its turn comes is skipped. Without workers the same queue
 * runs on the main thread, one map per task.
 */
export function createMapSource(
  density: number,
  wanted: (key: string) => boolean,
) {
  const queue = new Map<string, Job>();
  const running = new Map<number, Job>();
  let ids = 0;
  let busy = false;
  let worker: Worker | null = null;
  let closed = false;

  try {
    worker = new Worker(new URL("./maps.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = ({ data }: MessageEvent<{ id: number; map: Pieces }>) =>
      finish(data.id, data.map);
    worker.onerror = () => {
      // Fall back for good; requeue what was in flight.
      worker?.terminate();
      worker = null;
      for (const job of running.values()) queue.set(job.key, job);
      running.clear();
      busy = false;
      pump();
    };
  } catch {
    worker = null;
  }

  const edges = new Map<string, ReturnType<typeof drawEdgeLight>>();
  const drawHere = ({ slice, radius, bezel }: MapRequest) => {
    const shape = `${slice}r${radius}`;
    let edge = edges.get(shape);
    if (!edge) {
      edge = drawEdgeLight(slice, radius, density);
      edges.set(shape, edge);
    }
    return fold(drawRefraction(slice, radius, bezel, density), edge, slice);
  };

  function finish(id: number, map: Pieces) {
    const job = running.get(id);
    running.delete(id);
    busy = false;
    if (job && !closed) for (const done of job.done) done(map);
    pump();
  }

  function pump() {
    if (busy || closed) return;
    for (const [key, job] of queue) {
      queue.delete(key);
      if (!wanted(key)) continue;
      busy = true;
      const id = ++ids;
      running.set(id, job);
      if (worker) {
        const message: MapJob = {
          id,
          slice: job.slice,
          radius: job.radius,
          bezel: job.bezel,
          density,
        };
        worker.postMessage(message);
      } else {
        setTimeout(() => finish(id, drawHere(job)), 0);
      }
      return;
    }
  }

  return {
    request(key: string, shape: MapRequest, done: (map: Pieces) => void) {
      for (const job of running.values())
        if (job.key === key) {
          job.done.push(done);
          return;
        }
      const job = queue.get(key) ?? { ...shape, key, done: [] };
      job.done.push(done);
      // Map keeps insertion order: put the newest shape at the front, so an
      // animating lens is served the shape it has now, not its backlog.
      queue.delete(key);
      const rest = [...queue];
      queue.clear();
      queue.set(key, job);
      for (const [k, other] of rest) queue.set(k, other);
      pump();
    },
    close() {
      closed = true;
      queue.clear();
      running.clear();
      worker?.terminate();
    },
  };
}
