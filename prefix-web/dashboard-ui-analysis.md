## Visual Direction
- Soft, friendly productivity app aesthetic: ivory canvas, bright cards, and playful pastel badges to keep the view light even with dense data.
- Rounded geometry everywhere (outer shell, cards, avatars) keeps the tone casual; sparse iconography and grey dividers prevent clutter.
- Hierarchy relies on typography plus white space rather than loud color blocks, so every column feels breathable.

## Color Palette
| Role | Observed Use | Approx Hex / Tailwind |
| --- | --- | --- |
| Canvas Ivory | App background and empty states | `#F7F3EF / bg-stone-50`
| Card White | Main content panes, modals | `#FFFFFF / bg-white`
| Primary Indigo-Blue | "New Project" CTA and blue badges | `#2563EB / bg-indigo-500`
| Lavender Accent | Section labels, neutral tags | `#C084FC / bg-purple-300`
| Magenta Alert | "High Priority" badge | `#F43F5E / bg-rose-500`
| Teal Calm | "Low Priority" badge | `#2DD4BF / bg-teal-300`
| Slate Text | Headlines and body copy | `#0F172A` primary, `#475467` secondary (`text-slate-900` and `text-slate-600`)
| Divider Mist | Borders and separators | `#E4E7EC / border-slate-100`

## Typography
- Likely Inter or Plus Jakarta Sans: tall x-height, circular dots, and compact numerals.
- Page title "Mondays" about 28-32 px, `font-semibold`, tight letter spacing for single-word titles.
- Section tabs (Overview/List/Board/Timeline) about 14 px `font-medium uppercase` with large tracking to mimic pill tabs.
- Task titles about 16 px `font-medium`, meta rows (time left, comments, etc.) about 13 px `font-normal text-slate-500`.
- Sidebar nav uses 14 px `font-medium` with icon plus label `gap-3`; muted grey for default, `text-slate-900` for active with pale accent pill.

## Spacing System
- Base unit appears to be 4 px; most paddings are multiples of 8.
- Card padding about 24 px (`p-6`), vertical rhythm between cards about 16 px (`space-y-4`).
- Sidebar uses 20 px inset, 12 px gaps between nav groups, 24 px between sections.
- Toolbar (search bar plus CTA) uses 32 px horizontal padding and `gap-4` between controls.

## Component Styles
**App Shell**
- Centered canvas with max-width near 1200 px, `mx-auto my-10`, `rounded-[32px]`, `bg-white`, `shadow-2xl`.

**Sidebar Navigation**
- Column width near 220 px with a subtle right border; icons in 40 px square buttons `rounded-xl bg-white/70` when active.
- Secondary list for "Projects" uses colored dots plus `text-xs uppercase tracking` labels.

**Task Lists / Columns**
- Each status block (Todo, In Progress, Completed) sits inside an ultra-light grey panel `bg-white/92 border border-slate-100 rounded-3xl` with `space-y-3` for cards.

**Task Card**
- Layout: title row, meta row, attachments row, trailing action button (three dots) or badge.
- Tag pills are `inline-flex h-6 px-3 rounded-full font-semibold text-xs` with tinted backgrounds at roughly 15 percent opacity.

**Buttons and Inputs**
- Primary CTA: `h-11 px-5 rounded-2xl bg-indigo-500 text-white font-semibold shadow-[0_20px_45px_-20px_rgba(37,99,235,0.8)]`.
- Secondary button (Add Meal) uses `bg-white border border-slate-200 shadow-sm text-slate-700`.
- Search command bar: `rounded-2xl border border-slate-200 bg-white/80 px-5 h-11 flex items-center gap-3 text-sm text-slate-500`.

**Avatars and Icons**
- Circular avatars at 32 px with thin white border; notification bell uses filled icon with tiny purple bubble badge.

## Shadows and Elevation
- Canvas versus background: `shadow-[0_40px_120px_-60px_rgba(15,23,42,0.45)]` for the main board.
- Cards: `shadow-[0_18px_40px_-24px_rgba(15,23,42,0.35)]` plus soft inner highlight to mimic neumorphism.
- Floating CTA chips (status tags) likely animate to a slightly darker tint and raised shadow on hover.

## Animations and Transitions (inferred)
- Hover on cards: `transition-all duration-200 ease-out`, translation of 2-4 px upward, opacity from 0.95 to 1.
- Navigation icons and CTA buttons use `scale-105` on hover with matching drop-shadow intensity.
- Tabs likely animate underline via `after:transition-[width] duration-150` for swift context switching.

## Border Radius
- Board container about 32 px (`rounded-[2rem]`).
- Sidebar and large cards about 24 px (`rounded-3xl`).
- Inputs and buttons about 18 px (`rounded-2xl`).
- Pills and avatars fully rounded (`rounded-full`).

## Opacity and Transparency
- Tag backgrounds use 15-20 percent tint (`bg-rose-500/15`).
- Icon buttons inside the search bar have `text-slate-400/80` until hover.
- Completed cards probably reduce text opacity to 60 percent to imply lower emphasis (note the greyed "Completed" block).

## Tailwind Utility Patterns You Can Reuse
- Layout: `flex gap-6 lg:grid lg:grid-cols-[auto,1fr]` for sidebar plus content.
- Containers: `rounded-3xl border border-slate-100 bg-white/95 shadow-lg backdrop-blur-sm` to mimic frosted cards.
- Stacking: `space-y-6` for columns, `divide-y divide-slate-100` for grouped info.
- Meta rows: `flex items-center gap-4 text-sm text-slate-500` with icon clusters `flex items-center gap-1`.
- Pills: `inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold` plus color-specific backgrounds.
- Toolbar: `flex items-center justify-between gap-4 flex-wrap` to keep search plus CTA responsive.


## Implementation Notes
- Keep light grey textured background on the body so the floating board feels intentional.
- Use CSS custom properties for palette values to keep badge variants in sync across the app: for example so Tailwind stays consistent.
- Consider a utility for timeline group wrappers:  to match the screenshot's frosted panels.

run codex resume 019a9186-31df-7901-a2a7-b45d5af38646