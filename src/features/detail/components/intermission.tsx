"use client";

import { Intermission } from "@/motion/effects";
import { POINTS, step, useWall } from "@/motion/engine";
import { useDetailAct } from "../motion";

// A room left alone long enough shows an intermission card: it comes after
// eleven rungs of stillness, settles in on the plate's rung and drifts slowly.
const INTERMISSION = {
  after: step(11),
  drift: step(9),
  enter: step(4),
  leave: step(2),
};

export function DetailIntermission({
  image,
  title,
}: {
  image: string | null;
  title: string;
}) {
  const act = useDetailAct();
  const away = (useWall()?.phase ?? "page") !== "page";

  return (
    <Intermission
      {...INTERMISSION}
      ease={POINTS.silk}
      image={image}
      paused={act === "leaving" || act === "gone" || away}
      title={title}
    />
  );
}
