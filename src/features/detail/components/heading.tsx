import type { ReactNode } from "react";
import { Icon, TONE } from "@/ui";
import { DetailHeader } from "../motion";

// A section's heading on a film or person page: the kit's header, lit by the
// room.
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
    <DetailHeader
      actions={actions}
      icon={<Icon icon={icon} size={18} />}
      nameClassName={`min-w-0 ${TONE.label} text-ink-body`}
      part="header"
      title={title}
    />
  );
}
