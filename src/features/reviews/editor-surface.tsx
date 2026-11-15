"use client";

import { type FormEvent, type JSX, useState } from "react";
import { useDockActions } from "@omerdlw/base-framework/dock";
import { globalEvents } from "@omerdlw/base-framework/events";
import { useToast } from "@omerdlw/base-framework/notification";
import { Button, Textarea } from "@omerdlw/base-framework/ui";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { ActionIcon, ActionLabel } from "@/design/components/action-content";
import { SurfacePart, SurfaceStage } from "@/design/components/surface";
import { SURFACE_STACK } from "@/design/components/surface-classes";
import { defineSurface } from "@/design/surface-definition";
import type { MediaType } from "@/lib/tmdb/shared";
import { saveListCommentAction, saveMovieReviewAction } from "./actions";
import { RatingSelector } from "./rating";
import {
  getReviewValidationError,
  REVIEW_EVENTS,
  REVIEW_MAX_LENGTH,
  type ReviewInput,
} from "./review";

type ReviewEditorData =
  | {
      kind: "movie";
      mediaType?: MediaType;
      movieId: number;
      review: ReviewInput | null;
      onSaved?: (review: ReviewInput) => void;
      title: string;
    }
  | {
      kind: "list";
      listId: string;
      review: Pick<ReviewInput, "content"> | null;
      onSaved?: () => void;
      title: string;
    };

const REVIEW_EDITOR_SURFACE_WIDTH = 560;

function editorSubmitLabel({
  editing,
  isList,
  ratingOnly,
}: {
  editing: boolean;
  isList: boolean;
  ratingOnly: boolean;
}): string {
  if (isList) return editing ? "Update Comment" : "Publish Comment";
  if (editing) return ratingOnly ? "Update Rating" : "Update Review";
  return ratingOnly ? "Save Rating" : "Publish Review";
}

export const reviewEditorSurface = defineSurface<{ data: ReviewEditorData }>({
  component: ReviewEditorSurface,
  description: ({ data }) => data.title,
  icon: "solar:pen-new-square-bold",
  title: ({ data }) =>
    `${data.review !== null ? "Edit" : "Add"} ${data.kind === "list" ? "Comment" : "Review"}`,
  width: REVIEW_EDITOR_SURFACE_WIDTH,
});

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

          {/* The field is a hairline frame and nothing else: the text sets
              its height, and the count has a line of its own beneath, so
              nothing ever scrolls under it. */}
          <SurfacePart className="w-full" name="item">
            <label className="flex w-full cursor-text flex-col rounded-card ring-1 ring-edge-hover ring-inset hover:ring-edge-focus has-focus-visible:ring-edge-focus has-[textarea:focus]:ring-edge-focus has-[textarea:disabled]:opacity-50">
              <Textarea
                appearance="bare"
                aria-label={isList ? "Comment" : "Review"}
                className="field-sizing-content resize-none bg-transparent px-4 pt-3.5 pb-0 text-ink scrollbar-none placeholder:text-ink-muted"
                disabled={saving}
                maxHeight={240}
                maxLength={REVIEW_MAX_LENGTH}
                minHeight={96}
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
              <span className="flex h-9 items-center justify-end px-4 type-meta font-medium text-ink-muted tabular-nums select-none">
                {problem && (text || rating !== null) ? (
                  <span className="font-semibold text-danger">{problem}</span>
                ) : text ? (
                  `${text.length} / ${REVIEW_MAX_LENGTH}`
                ) : null}
              </span>
            </label>
          </SurfacePart>

          <div className="flex w-full gap-2.5">
            {!isList ? (
              <SurfacePart className="min-w-0 flex-1" name="item">
                <Button
                  aria-checked={isSpoiler}
                  intent={isSpoiler && text ? "chosen" : "outline"}
                  width="full"
                  disabled={!text || saving}
                  onClick={() => updateDraft({ isSpoiler: !isSpoiler })}
                  role="switch"
                >
                  <ActionIcon
                    icon={
                      isSpoiler && text
                        ? "solar:eye-closed-linear"
                        : "solar:eye-linear"
                    }
                    size={15}
                  />
                  <ActionLabel>
                    {isSpoiler && text
                      ? "Contains Spoilers"
                      : "Mark as Spoiler"}
                  </ActionLabel>
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
