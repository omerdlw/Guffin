import type { ReactNode } from "react";
import { Icon, TONE } from "@/ui";
import { MovieHeader } from "../motion";

// A section's heading on the film page: the kit's header, lit by the room.
export function Heading({
  actions,
  icon,
  title,
}: {
  actions?: ReactNode;
  icon: string;
  title: string;
}) {
  return (
    <MovieHeader
      actions={actions}
      icon={<Icon icon={icon} size={18} />}
      nameClassName={`min-w-0 ${TONE.label} text-ink-body`}
      part="header"
      title={title}
    />
  );
}
