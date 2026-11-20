import { customType } from "drizzle-orm/pg-core";

export function toIsoTimestamp(value: string): string {
  return value.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
}

export const timestamptz = customType<{ data: string; driverData: string }>({
  dataType: () => "timestamp with time zone",
  fromDriver: (value) => toIsoTimestamp(value),
});
