# Website-based app theme

Source: https://www.scoutsdesapotres.org, inspected on 2026-11-03 through both the
rendered homepage and its stylesheets. The user explicitly requested the app's
theme to follow these website colors.

| Token | Value | Use |
| --- | --- | --- |
| Primary red | `#CA3737` | Main buttons, selected filters/tabs, monogram, small headings |
| Brand green | `#0D9523` | Brand stripe and supporting brand accent |
| Brand yellow | `#FFEE14` | Brand stripe and decorative highlights |
| Ink | `#323232` | Main text |
| Muted | `#6D6D6D` | Secondary text |
| White | `#FFFFFF` | Main surfaces |
| Paper | `#F4F4F4` | Inputs, quiet cards, unselected controls |
| Divider | `#E8E8E8` | Feed separators and borders |
| Red tint | `#FFF1F1` | Secondary controls |
| Green tint / text | `#EDF7EE` / `#08751C` | Supporting readable feedback |
| Yellow tint | `#FFFCE0` | Fallback group-cover surface |

The website originals are red/green/yellow plus white and grays. The lighter tints
and darker green text are app adaptations. White on primary red has approximately
5.11:1 contrast; dark ink on brand yellow has approximately 10.68:1. Do not use
white small text on yellow or on the unmodified bright brand green.

A thin yellow/green/red stripe echoes the website header. The rest of the app
retains the requested text-first timeline: compact group identity, publication
metadata, readable post text, inline media, subtle dividers, and bottom navigation.
It contains no engagement row or social feature placeholders.

Colors are centralized in `src/ui/theme.tsx`. The initial SA monogram is a neutral
fallback rather than a reproduction of the website logo. No website photos,
articles, registration form, or other website functionality have been imported.

## Dark mode

The app follows the device appearance by default. Profile → Appearance lets a user
pick System, Light or Dark; the choice is stored on the device (`scout.theme`).

- Read colors and shared styles with `const { colors, styles } = useTheme()` inside
  components. Never import a palette at module scope for UI that should follow the theme.
- `colors.surface` is the card/sheet background. `colors.white` is literal white and is
  only for text or icons on brand fills, photos and gradients.
- `colors.greenDeep` stays `#08751C` in both modes for green fills behind white text;
  `colors.green` is the readable green text/icon tone (lighter in dark mode).

| Token | Dark value | Notes |
| --- | --- | --- |
| Canvas / Surface | `#121311` / `#1C1D1B` | Warm near-black, not pure black |
| Ink / Muted | `#ECEAE6` / `#A3A09A` | 15.5:1 and 7.1:1 on canvas |
| Primary red | `#D64545` | Lifted for dark: 4.3:1 on canvas, 4.4:1 with white text |
| Green text | `#5CC870` | 8.8:1 on canvas |
| Danger | `#F07A7A` | 5.6:1 on its soft-danger fill |
