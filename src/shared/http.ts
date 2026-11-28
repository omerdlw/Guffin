import { EVENT_TYPES, globalEvents } from "@omerdlw/base-framework/events";
import { toUserMessage } from "@omerdlw/base-framework/utils";

// No request to our own API may hold a screen forever: past this it fails
// like a dropped connection, and the caller's error path takes over.
export const REQUEST_TIMEOUT_MS = 20_000;

export function withTimeout(
  signal?: AbortSignal | null,
  ms: number = REQUEST_TIMEOUT_MS,
): AbortSignal {
  const timeout = AbortSignal.timeout(ms);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

interface RequestJsonOptions extends RequestInit {
  notifyOnError?: boolean;
  notifyOnUnauthorized?: boolean;
}

interface HttpError extends Error {
  payload?: unknown;
  status?: number;
}

export async function requestJson<T = unknown>(
  path: string,
  options: RequestJsonOptions = {},
): Promise<T> {
  const {
    notifyOnError = true,
    notifyOnUnauthorized = true,
    ...requestOptions
  } = options;
  const response = await fetch(path, {
    ...requestOptions,
    signal: withTimeout(requestOptions.signal),
    headers: {
      ...(requestOptions.body ? { "content-type": "application/json" } : {}),
      ...requestOptions.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error: HttpError = new Error(
      (payload as Record<string, string>)?.error ||
        `Request failed with status ${response.status}`,
    );
    error.status = response.status;
    error.payload = payload;

    if (notifyOnError && (response.status !== 401 || notifyOnUnauthorized)) {
      globalEvents.emit(
        response.status === 401
          ? EVENT_TYPES.API_UNAUTHORIZED
          : EVENT_TYPES.API_ERROR,
        {
          error,
          message: toUserMessage(error),
          path,
          source: "app",
          status: response.status,
        },
      );
    }
    throw error;
  }

  return payload as T;
}

export type SearchParams = Record<string, string | string[] | undefined>;

export function readParam(
  params: SearchParams | undefined,
  key: string,
): string {
  const value = params?.[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID.test(value);

// Own keys only: `"constructor" in {}` is true, so a plain `in` check lets
// prototype names such as ?sort=constructor through to lookups.
export const isKeyOf = <T extends object>(
  table: T,
  value: unknown,
): value is keyof T & string =>
  typeof value === "string" && Object.hasOwn(table, value);

export const readOffset = (value: unknown): number =>
  Math.max(0, Math.floor(Number(value)) || 0);
