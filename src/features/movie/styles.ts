import { headlineClass } from "@/ui";

export const titleClass = (title: string) => headlineClass(title, [26, 37, 49]);

export const TAGLINE_TYPE = "type-body sm:type-copy";
export const TAGLINE_CLASS = `${TAGLINE_TYPE} font-medium tracking-tagline uppercase text-balance`;
export const AFTER_TAGLINE = "mt-4";

export const SIDEBAR_FACTS_CLASS =
  "flex flex-col gap-6 sm:col-start-2 sm:max-lg:self-stretch lg:contents";
