/// <reference lib="webworker" />

import { gatherSwarm, type Swarm, type SwarmSubject } from "./swarm";

export interface SwarmRequest {
  columns: number;
  job: number;
  subject: SwarmSubject;
}

export interface SwarmReply {
  job: number;
  swarm: Swarm | null;
}

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
