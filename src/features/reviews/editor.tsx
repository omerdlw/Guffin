"use client";

import { type FormEvent, type JSX, useState } from "react";
import { globalEvents } from "@omerdlw/base-framework/events";
import {
  type SurfaceEntry,
  useDockActions,
} from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { Button } from "@/design/components/button";
import { Icon } from "@/design/components/icon";
import { inputVariants, Textarea } from "@/design/components/input";
import {
  SURFACE_STACK,
  SurfacePart,
  SurfaceStage,
} from "@/design/components/surface";
import { saveListCommentAction, saveMovieReviewAction } from "./actions";
import {
  REVIEW_EDITOR_SURFACE_WIDTH,
  REVIEW_EVENTS,
  REVIEW_MAX_LENGTH,
} from "./constants";
import { RatingSelector } from "./rating";
import type { ReviewEditorData, ReviewInput } from "./types";
import { editorSubmitLabel, getReviewValidationError } from "./utils";

export function createReviewEditorSurfaceEntry(
  data: ReviewEditorData,
): SurfaceEntry {
  const editing = data.review !== null;
  const noun = data.kind === "list" ? "Comment" : "Review";
  return {
    component: ReviewEditorSurface,
    description: data.title,
    icon: "solar:pen-new-square-bold",
    props: { data },
    title: `${editing ? "Edit" : "Add"} ${noun}`,
    width: REVIEW_EDITOR_SURFACE_WIDTH,
  };
}

function ReviewEditorSurface({
  data,
}: {
  data: ReviewEditorData;
}): JSX.Element {
  const toast = useToast();
  const { closeSurface } = useDockActions();
  const isList = data.kind === "list";
  const editing = data.review !== null;

  const [draft, setDraft] = useState<ReviewInput>(() => ({
    content: data.review?.content ?? "",
    isSpoiler: data.kind === "movie" && Boolean(data.review?.isSpoiler),
    rating: data.kind === "movie" ? (data.review?.rating ?? null) : null,
  }));
  const [saving, setSaving] = useState(false);
  const { content, isSpoiler, rating } = draft;
  const updateDraft = (patch: Partial<ReviewInput>) =>
    setDraft((current) => ({ ...current, ...patch }));

  const text = content.trim();
  const problem = getReviewValidationError({
    allowRating: !isList,
    content,
    rating,
    requireText: isList,
    textLabel: isList ? "comment" : "review",
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    if (problem) {
      toast(problem);
      return;
    }

    setSaving(true);
    try {
      if (data.kind === "list") {
        const result = await saveListCommentAction(data.listId, text);
        if (!result.success) throw new Error(result.error);
        data.onSaved?.();
      } else {
        const next: ReviewInput = {
          content: text,
          isSpoiler: text ? isSpoiler : false,
          rating,
        };
        const result = await saveMovieReviewAction(
          data.movieId,
          next,
          data.mediaType ?? "movie",
        );
        if (!result.success) throw new Error(result.error);
        data.onSaved?.(next);
      }
      globalEvents.emit(REVIEW_EVENTS.CHANGE, { reason: "save" });
      closeSurface?.();
    } catch (error) {
      report("ReviewEditorSurface save", error);
      toast(toUserMessage(error, { fallback: "Could not save" }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SurfaceStage>
      <form onSubmit={submit}>
        <div className={SURFACE_STACK}>
          {!isList ? (
            <SurfacePart className="flex w-full justify-center" name="item">
              <RatingSelector
                disabled={saving}
                onChange={(next) => updateDraft({ rating: next })}
                value={rating}
              />
            </SurfacePart>
          ) : null}

          <SurfacePart className="relative w-full" name="item">
            <Textarea
              aria-label={isList ? "Comment" : "Review"}
              className={inputVariants({
                className: "min-h-[130px] w-full p-4 pb-9 type-body",
              })}
              disabled={saving}
              maxHeight={260}
              maxLength={REVIEW_MAX_LENGTH}
              minHeight={130}
              onChange={(event) =>
                updateDraft({
                  content: event.target.value,
                  ...(event.target.value.trim() ? {} : { isSpoiler: false }),
                })
              }
              placeholder={
                isList
                  ? `Share your thoughts on ${data.title}`
                  : `Add your thoughts about ${data.title} (optional)`
              }
              value={content}
            />
            <div className="pointer-events-none absolute right-3.5 bottom-2.5 type-meta font-medium text-ink-muted select-none">
              {problem && (text || rating !== null) ? (
                <span className="font-semibold text-danger">{problem}</span>
              ) : text ? (
                <span>
                  {text.length} / {REVIEW_MAX_LENGTH}
                </span>
              ) : null}
            </div>
          </SurfacePart>

          <div className="flex w-full gap-2.5">
            {!isList ? (
              <SurfacePart className="min-w-0 flex-1" name="item">
                <Button
                  aria-checked={isSpoiler}
                  intent={isSpoiler && text ? "chosen" : "neutral"}
                  width="full"
                  disabled={!text || saving}
                  onClick={() => updateDraft({ isSpoiler: !isSpoiler })}
                  role="switch"
                >
                  <Icon icon="solar:eye-closed-linear" size={15} />
                  {isSpoiler && text ? "Contains Spoilers" : "Mark as Spoiler"}
                </Button>
              </SurfacePart>
            ) : null}
            <SurfacePart className="min-w-0 flex-1" name="item">
              <Button
                intent="primary"
                width="full"
                disabled={Boolean(problem)}
                loading={saving}
                type="submit"
              >
                {editorSubmitLabel({
                  editing,
                  isList,
                  ratingOnly: rating !== null && !text,
                })}
              </Button>
            </SurfacePart>
          </div>
        </div>
      </form>
    </SurfaceStage>
  );
}
