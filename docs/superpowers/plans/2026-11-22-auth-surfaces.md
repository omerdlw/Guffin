# Auth Surfaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the sign-in and verification dock surfaces to feel clean and premium while retaining their compact dock behavior.

**Architecture:** Update only the two auth surface components, reusing existing design components, icons, and tokens. Keep passkey as the primary action, stack alternate methods vertically, and align the verification surface's spacing and hierarchy with sign-in.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, `@omerdlw/base-framework` dock surfaces.

**Spec:** `docs/superpowers/specs/2026-11-22-auth-surfaces-design.md`

## Global Constraints

- Keep the existing 250 px dock width and authentication behavior.
- List alternate sign-in methods vertically.
- Reuse existing design tokens and components.
- No copy, flow, dependency, or authentication behavior changes.

## Review Focus

- Tall method list: ensure the options remain reachable within the dock's available vertical space.
- Narrow surface: verify controls and copy fit at the existing 250 px width.
- Verification states: preserve focused, entered, invalid, and busy OTP treatments.
- Alternate methods: preserve each method's accessible name and loading/disabled behavior.
- Email entry: preserve pending, validation, and prefilled email behavior.

---

### Task 1: Polish compact auth surfaces

**Files:**

- Modify: `src/features/auth/sign-in-surface.tsx`
- Modify: `src/features/auth/verification-surface.tsx`

**Interfaces:**

- Consumes: current `SurfaceStage`, `SurfacePart`, `Button`, `Input`, and `DockSurfaceAction` APIs.
- Produces: refined styling and vertical alternate-method arrangement without changing component props or auth operations.

- [ ] Stack the alternate sign-in methods in a single column while preserving their existing method order, labels, icons, loading, and disabled states.
- [ ] Refine the passkey and email sign-in hierarchy with the existing spacing, typography, and surface tokens; keep all controls legible at 250 px.
- [ ] Refine OTP spacing and surrounding hierarchy to visually match sign-in while preserving all six digits, focus/error/success treatments, cooldown, and automatic submission.
- [ ] Inspect the changed states at the dock's existing width and confirm the tall list remains usable within available vertical space.
