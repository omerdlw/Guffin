"use client";

import {
  defineModal,
  type ModalContainerProps,
} from "@omerdlw/base-framework/modal";
import { Image } from "@omerdlw/base-framework/ui";
import type { ImageModalData } from "./detail";

interface ModalProps<T> {
  close: (result?: unknown) => void;
  data: T;
  header: ModalContainerProps["header"];
}

function ImageModalView({ data }: ModalProps<ImageModalData>) {
  return (
    <Image
      alt={data.alt}
      className="max-h-[85vh] max-w-[92vw]"
      fit="contain"
      layout="intrinsic"
      priority
      src={data.src}
      wrapperClassName="rounded-sheet ring-1 ring-edge-hover"
    />
  );
}

export const ImageModal = defineModal({
  chrome: "bare",
  component: ImageModalView,
  position: "center",
});
