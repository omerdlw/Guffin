import { describe, expect, it, vi } from "vitest";
import { lazySurface, preloadOnIntent } from "./lazy-surface";

type Props = { id: number };

function fakeSurface() {
  return { open: vi.fn(async () => ({ status: "closed" })) };
}

describe("lazySurface", () => {
  it("preload calls load once across three calls", async () => {
    const surface = fakeSurface();
    const load = vi.fn(async () => surface);
    const lazy = lazySurface<Props>(load as never);

    await Promise.all([lazy.preload(), lazy.preload(), lazy.preload()]);

    expect(load).toHaveBeenCalledTimes(1);
  });

  it("open before preload resolves opens the surface once with the props", async () => {
    const surface = fakeSurface();
    const lazy = lazySurface<Props>((async () => surface) as never);
    const openSurface = vi.fn();

    void lazy.preload();
    await lazy.open(openSurface as never, { id: 7 });

    expect(surface.open).toHaveBeenCalledTimes(1);
    expect(surface.open).toHaveBeenCalledWith(openSurface, { id: 7 });
  });

  it("open forwards descriptor overrides", async () => {
    const surface = fakeSurface();
    const lazy = lazySurface<Props>((async () => surface) as never);
    const openSurface = vi.fn();

    await lazy.open(openSurface as never, { id: 2 }, { title: "Verify" });

    expect(surface.open).toHaveBeenCalledWith(
      openSurface,
      { id: 2 },
      {
        title: "Verify",
      },
    );
  });

  it("a rejected load rejects open and a later preload retries", async () => {
    const surface = fakeSurface();
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(surface);
    const lazy = lazySurface<Props>(load as never);

    await expect(lazy.open(vi.fn() as never, { id: 1 })).rejects.toThrow(
      "offline",
    );
    await expect(lazy.preload()).resolves.toBe(surface);
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe("preloadOnIntent", () => {
  it("waits for the first interaction, preloads once, then stops listening", async () => {
    const target = new EventTarget();
    const surface = { preload: vi.fn(async () => ({})) };

    preloadOnIntent([surface as never], target);
    expect(surface.preload).not.toHaveBeenCalled();

    target.dispatchEvent(new Event("pointermove"));
    target.dispatchEvent(new Event("keydown"));

    expect(surface.preload).toHaveBeenCalledTimes(1);
  });

  it("a cancelled wait never preloads", () => {
    const target = new EventTarget();
    const surface = { preload: vi.fn(async () => ({})) };

    const cancel = preloadOnIntent([surface as never], target);
    cancel();
    target.dispatchEvent(new Event("pointerdown"));

    expect(surface.preload).not.toHaveBeenCalled();
  });
});
