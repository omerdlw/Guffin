export type MutationResult<T extends object = object> =
  ({ success: true } & T) | { error: string; success: false };

export const fail = (error: string): { error: string; success: false } => ({
  error,
  success: false,
});

export const ok = <T extends object = object>(extra?: T) =>
  ({ success: true, ...extra }) as MutationResult<T>;
