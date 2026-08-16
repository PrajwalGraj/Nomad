# Brand — Nomad

_Status: set_

## Palette

- **Brand (minor / accent):** `#836ef9` — Monad purple. Used for glows, gradients, focus rings, gradient text, and icon-only surfaces (send button, live dot).
- **White (major):** `#ffffff` — dominant background across the app. Light mode is the primary, polished experience; dark tokens exist but nothing currently toggles `.dark`.
- **Primary (accessible fill):** `#6e56cf` — a deepened shade of the brand purple, used wherever purple sits behind small text (buttons, badges, user chat bubble) so contrast stays ≥ 4.5:1 on white. The exact `#836ef9` reads at ~3.8:1 on white, which is fine for icons/borders/glows (≥3:1) but not for body text.

## Tokens (see `src/app/globals.css`)

- `--brand` / `--color-brand` — exact `#836ef9`, decorative use only (glows, gradients, gradient-clip text, focus ring, icon-only buttons).
- `--primary` / `--color-primary` — `#6e56cf` light / `#a996fb` dark, used for anything with text on top.
- Neutrals (`background`, `card`, `muted`, `border`, etc.) are cool, faintly purple-tinted grays rather than pure gray, to stay coherent with the brand hue.
- `--radius` bumped to `0.75rem` for a friendlier, rounder feel matching the pill-shaped chat input.

## Motion

- Custom utilities in `globals.css`: `animate-blob` (background glow drift), `animate-glow-pulse` (input focus glow), `animate-fade-in-up` (message/card entrance), `animate-dot-bounce` (thinking indicator), `text-gradient-brand` (hero headline).
- All motion is neutralized under `prefers-reduced-motion: reduce` via a global blanket rule.

## Voice

Short, active, a little playful — "Where should we go?" not "Welcome to Nomad." Loading states use a rotating set of lighthearted status lines (see `src/components/chat/thinking-indicator.tsx`) instead of a static "thinking…" — screen readers get a single calm "Nomad is thinking…" announcement; the rotating copy is visual flavor only.
