"use server";
import "server-only";

import { revalidatePath } from "next/cache";

export async function resetRouterCache(): Promise<void> {
  revalidatePath("/", "layout");
}
