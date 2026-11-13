import {
  defineSurface as defineDockSurface,
  type DockActions,
  type DockIconSource,
  type SurfaceBuilderDefinition,
  type SurfaceDescriptor,
  type SurfaceHandle,
  type SurfaceResult,
} from "@omerdlw/base-framework/dock";

type FromProps<P, T> = T | ((props: P) => T);

export type SurfaceDefinition<P extends object> = Omit<
  SurfaceBuilderDefinition,
  "description" | "icon" | "title"
> & {
  description?: FromProps<P, string | null>;
  icon?: FromProps<P, DockIconSource>;
  title?: FromProps<P, string | null>;
};

type Args<P extends object> = object extends P
  ? [props?: P, overrides?: Partial<SurfaceDescriptor>]
  : [props: P, overrides?: Partial<SurfaceDescriptor>];

/** A `defineSurface` result whose props are checked against `P`. */
export interface Surface<P extends object> {
  (...args: Args<P>): SurfaceDescriptor;
  open(
    openSurface: DockActions["openSurface"],
    ...args: Args<P>
  ): Promise<SurfaceResult>;
  use(): SurfaceHandle;
}

/** The framework's `defineSurface`, typed by the props its component takes. */
export function defineSurface<P extends object = Record<never, never>>(
  definition: SurfaceDefinition<P>,
): Surface<P> {
  return defineDockSurface(
    definition as SurfaceBuilderDefinition,
  ) as unknown as Surface<P>;
}
