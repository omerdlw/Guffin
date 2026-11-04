/// <reference lib="webworker" />

import { gatherSwarm } from "./swarm";
import type { SwarmReply, SwarmRequest } from "./types";

const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.onmessage = async ({ data }: MessageEvent<SwarmRequest>) => {
  const swarm = await gatherSwarm(data.subject, data.columns).catch(() => null);
  const reply: SwarmReply = { job: data.job, swarm };
  scope.postMessage(
    reply,
    swarm
      ? [
          swarm.color.buffer,
          swarm.face.buffer,
          swarm.home.buffer,
          swarm.matte.buffer,
          swarm.meta.buffer,
          swarm.source.buffer,
        ]
      : [],
  );
};
