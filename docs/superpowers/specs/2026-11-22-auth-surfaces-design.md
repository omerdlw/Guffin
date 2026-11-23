# Auth surfaces design

## Intent

Give the sign-in and email-verification dock surfaces a cleaner, more premium feel while keeping the authentication flow fast and easy to scan.

## Goals and boundaries

- Refine hierarchy, spacing, and control presentation in `sign-in-surface.tsx` and `verification-surface.tsx`.
- Keep the existing 250 px dock width, sign-in methods, OTP behavior, resend flow, and existing design tokens/components.
- Avoid adding a new brand panel, dependencies, or changing authentication behavior.

## Approaches

- **Refine the existing compact surfaces (selected):** improve visual hierarchy, spacing, and button/input treatment within the dock's current footprint. Best fit for the established dock interaction and preserves quick scanning.
- **Expand the surface for a branded layout:** adds room for a larger identity area but takes more dock space and changes the interaction's character.

## Design direction

Use restrained surface styling, clearer separation between the primary passkey action and alternate methods, and a more intentional verification-code area. List alternate sign-in methods vertically so each option is easy to scan and tap. Keep the two steps visually related through consistent type, spacing, and control treatment. Reuse the app's existing design tokens and components. Account for the taller method list within the dock's available vertical space.

## Builder decisions

The implementation may settle exact spacing and styling values by following nearby design-system patterns. No flow, copy, or authentication behavior changes are in scope.
