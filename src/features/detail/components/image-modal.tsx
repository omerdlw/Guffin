"use client";

import {
  defineModal,
  type ModalContainerProps,
} from "@omerdlw/base-framework/modules/modal";

export type ImageModalData = {
  alt: string;
  src: string;
};

interface ModalProps<T> {
  close: (result?: unknown) => void;
  data: T;
  header: ModalContainerProps["header"];
}

function ImageModalView({ data }: ModalProps<ImageModalData>) {
  return (
    <img
      alt={data.alt}
      className="max-h-[85vh] max-w-[92vw] rounded-sheet object-contain ring-1 ring-edge-hover"
      draggable={false}
      src={data.src}
    />
  );
}

export const ImageModal = defineModal({
  chrome: "bare",
  component: ImageModalView,
  position: "center",
});
