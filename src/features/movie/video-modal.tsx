"use client";

import { defineModal } from "@omerdlw/base-framework/modal";
import { useShowing } from "@/motion/kit";
import { Tube } from "@/motion/screen";
import type { CastModalProps, VideoModalData } from "./movie";

function VideoModalView({ data }: CastModalProps<VideoModalData>) {
  useShowing();
  return (
    <Tube className="aspect-video w-[min(92vw,64rem)] overflow-hidden rounded-sheet bg-page ring-1 ring-edge-hover ring-inset">
      <iframe
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        className="size-full"
        referrerPolicy="strict-origin-when-cross-origin"
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(data.key)}?autoplay=1&rel=0`}
        title={data.name}
      />
    </Tube>
  );
}

export const VideoModal = defineModal({
  chrome: "bare",
  component: VideoModalView,
  position: "center",
});
