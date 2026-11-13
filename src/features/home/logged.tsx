import type { CSSProperties, JSX } from "react";
import { Avatar } from "@omerdlw/base-framework/ui";
import { RADIUS } from "@/design/foundations/geometry";
import { TONE } from "@/design/foundations/tones";
import { cn } from "@/design/ui";
import { MoviePosterLink } from "@/features/movie/stage";
import { CAPTION_CLASS, type RecentLog } from "./feed";
import { formatRelativeTime } from "./format";
import styles from "./logged.module.css";
import { Heading, HomePart, HomeSection } from "./motion";

const LOGGED_SECONDS_PER_FILM = 5;

function Entry({ log }: { log: RecentLog }): JSX.Element {
  return (
    <li className="w-28 shrink-0 sm:w-32 lg:w-36">
      <MoviePosterLink
        caption={
          <span className={CAPTION_CLASS}>
            <Avatar
              className="shrink-0 rounded-full"
              name={log.author.displayName}
              size={16}
              src={log.author.avatarUrl ?? undefined}
            />
            <span className="min-w-0 truncate">
              {log.author.displayName.split(/\s+/)[0]}
            </span>
            <time className="ml-auto shrink-0" dateTime={log.watchedAt}>
              {formatRelativeTime(log.watchedAt)}
            </time>
          </span>
        }
        detail={`logged by ${log.author.displayName}`}
        movie={log.film}
        radius={RADIUS.card}
        sizes="144px"
      />
    </li>
  );
}

function Live(): JSX.Element {
  return (
    <HomePart
      as="span"
      className={`${TONE.label} inline-flex items-center gap-2 text-ink-muted`}
      name="live"
    >
      <span aria-hidden="true" className="relative flex size-2">
        <span className="absolute inset-0 animate-ping rounded-full bg-watched opacity-60 motion-reduce:hidden" />
        <span className="relative size-2 rounded-full bg-watched" />
      </span>
      Live
    </HomePart>
  );
}

export function HomeLogged({
  logs,
}: {
  logs: RecentLog[];
}): JSX.Element | null {
  if (logs.length === 0) return null;
  const drift = {
    "--drift": `${logs.length * LOGGED_SECONDS_PER_FILM}s`,
  } as CSSProperties;

  return (
    <HomeSection className="flex w-full flex-col" cue="logged">
      <Heading actions={<Live />} title="Just logged" />
      <HomePart className="mx-[calc(50%-50vw)]" name="poster">
        <div className={cn(styles.window, "overflow-hidden")}>
          <div className={cn(styles.track, "flex w-max")} style={drift}>
            <ul className="flex shrink-0 gap-3 pr-3 sm:gap-4 sm:pr-4">
              {logs.map((log) => (
                <Entry key={log.id} log={log} />
              ))}
            </ul>
            <ul
              aria-hidden="true"
              className={cn(
                styles.copy,
                "flex shrink-0 gap-3 pr-3 sm:gap-4 sm:pr-4",
              )}
              inert
            >
              {logs.map((log) => (
                <Entry key={log.id} log={log} />
              ))}
            </ul>
          </div>
        </div>
      </HomePart>
    </HomeSection>
  );
}
