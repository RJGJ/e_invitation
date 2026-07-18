# AI Feature Spec: App Theme ("LuxeInvite" Design System)

## 1. Feature Overview

**Description:** Introduce the "LuxeInvite" design system into the Flutter app — a Material 3 `ColorScheme`, `TextTheme` (Playfair Display + Montserrat), shape/radius tokens, and spacing constants, sourced verbatim from `/home/rjgj/Downloads/DESIGN.md` — replacing the current placeholder `deepPurple`-seeded theme.
**Business Value:** The app currently has no real visual identity (default Material scaffold colors, default system font). This establishes the "Digital Heirloom" brand — sophisticated, premium, celebratory — described in DESIGN.md, consistently across every screen, with no per-screen styling work required.

## 2. Current System State (Crucial)

- Existing Infrastructure: `app/lib/main.dart` sets `theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple))` — the only theming that exists today. No custom color scheme, no custom typography (falls back to Flutter's default font), no design-tokens file, no font package installed (`pubspec.yaml` has no `google_fonts` or bundled `fonts:` section).
- Existing Screens: `SplashScreen`, `LoginScreen`, `HomeScreen` (from the login feature, `.docs/specs/app/login.md`) use standard Material widgets (`TextFormField`, `ElevatedButton`, `Scaffold`/`AppBar`) that read their styling from `Theme.of(context)`. **This means once the new `ThemeData` is wired into `MaterialApp.router`'s `theme:` param, all three existing screens pick up the new colors/fonts/shapes automatically — no changes needed to `login_screen.dart`/`home_screen.dart`/`splash_screen.dart` themselves.**
- Source of truth: `/home/rjgj/Downloads/DESIGN.md` (outside the repo, user-local) — full token values reproduced in Section 4 below so this spec is self-contained and durable.

## 3. Scope & Boundaries

- IN SCOPE (Do this now):
  - `ColorScheme` built from DESIGN.md's full Material 3 color token set (light mode only — DESIGN.md provides exactly one palette).
  - `TextTheme` built from DESIGN.md's 8 defined typography tokens (Playfair Display for display/headline, Montserrat for body/label), with the Flutter `TextTheme` slots DESIGN.md does *not* define (`titleLarge/Medium/Small`, `displayMedium/Small`, `bodySmall`) filled in by interpolating within the same two-font-family system, so no Material widget (AppBar title, ListTile, etc.) silently falls back to the default system font.
  - Shape/radius tokens applied as global component-theme defaults for buttons, text fields, and cards.
  - Spacing constants (8px unit, gutter, mobile/desktop margins) as a reusable Dart constants class — defined but not yet wired into any specific screen's layout.
  - Card shadow tint ("Umbra" — a soft Primary-tinted shadow instead of black) per DESIGN.md's Elevation & Depth section.
  - Wiring the resulting `ThemeData` into `MaterialApp.router`'s `theme:` parameter, replacing the `deepPurple` placeholder.
  - Bundling the two font families as static assets (see Section 8 for why, over the `google_fonts` runtime-fetch package).
- DEFERRED (Do NOT do this yet - saved for future tickets):
  - DO NOT implement dark mode — DESIGN.md provides only a light palette; there are no dark tokens to build from.
  - DO NOT implement the specialized components DESIGN.md describes (the "Envelope" preview, the custom gold-ring color picker) — feature-specific widgets for future tickets, not part of the theme foundation.
  - DO NOT implement Glassmorphism modal/overlay blur — deferred to whichever future ticket builds the first modal/overlay.
  - DO NOT redesign or restyle `LoginScreen`/`HomeScreen`/`SplashScreen` beyond what they inherit automatically from the new theme.
  - DO NOT add responsive/breakpoint typography (switching `display-lg` 48px vs `display-lg-mobile` 36px by screen width) — use the mobile scale (36px) as the single default, since this is a mobile-first app; revisit if/when a web layout is built.
  - DO NOT wire the 12-column dashboard/editor grid or the fixed desktop container — this is a color/typography/shape/spacing token ticket only, not a layout system.

## 4. Interfaces & Data Contracts

### Brand → Material role mapping (from DESIGN.md's prose, for context)
- "Rich Emerald Green" → `primary` (`#00492e`)
- "Subtle Gold" → `secondary` (`#735c00`) / `secondaryContainer` (`#fed65b`) — DESIGN.md's `colors:` table has no separate named "gold" token; the prose's Gold references resolve to the secondary role.
- "Soft Cream" → `surface` / `background` (`#faf9f7`)

### ColorScheme (Material 3, light) — verbatim from DESIGN.md

```dart
// lib/theme/app_colors.dart
import 'package:flutter/material.dart';

abstract final class AppColors {
  static const surface = Color(0xFFFAF9F7);
  static const surfaceDim = Color(0xFFDADAD8);
  static const surfaceBright = Color(0xFFFAF9F7);
  static const surfaceContainerLowest = Color(0xFFFFFFFF);
  static const surfaceContainerLow = Color(0xFFF4F3F1);
  static const surfaceContainer = Color(0xFFEFEEEC);
  static const surfaceContainerHigh = Color(0xFFE9E8E6);
  static const surfaceContainerHighest = Color(0xFFE3E2E0);
  static const onSurface = Color(0xFF1A1C1B);
  static const onSurfaceVariant = Color(0xFF3F4942);
  static const inverseSurface = Color(0xFF2F3130);
  static const onInverseSurface = Color(0xFFF1F1EF);
  static const outline = Color(0xFF6F7A72);
  static const outlineVariant = Color(0xFFBEC9C0);
  static const surfaceTint = Color(0xFF156B49);
  static const primary = Color(0xFF00492E);
  static const onPrimary = Color(0xFFFFFFFF);
  static const primaryContainer = Color(0xFF046341);
  static const onPrimaryContainer = Color(0xFF8DDCB1);
  static const inversePrimary = Color(0xFF87D7AC);
  static const secondary = Color(0xFF735C00);
  static const onSecondary = Color(0xFFFFFFFF);
  static const secondaryContainer = Color(0xFFFED65B);
  static const onSecondaryContainer = Color(0xFF745C00);
  static const tertiary = Color(0xFF414121);
  static const onTertiary = Color(0xFFFFFFFF);
  static const tertiaryContainer = Color(0xFF585836);
  static const onTertiaryContainer = Color(0xFFCFCEA4);
  static const error = Color(0xFFBA1A1A);
  static const onError = Color(0xFFFFFFFF);
  static const errorContainer = Color(0xFFFFDAD6);
  static const onErrorContainer = Color(0xFF93000A);
  static const primaryFixed = Color(0xFFA3F4C7);
  static const primaryFixedDim = Color(0xFF87D7AC);
  static const onPrimaryFixed = Color(0xFF002113);
  static const onPrimaryFixedVariant = Color(0xFF005235);
  static const secondaryFixed = Color(0xFFFFE088);
  static const secondaryFixedDim = Color(0xFFE9C349);
  static const onSecondaryFixed = Color(0xFF241A00);
  static const onSecondaryFixedVariant = Color(0xFF574500);
  static const tertiaryFixed = Color(0xFFE6E5B9);
  static const tertiaryFixedDim = Color(0xFFCAC99F);
  static const onTertiaryFixed = Color(0xFF1D1D03);
  static const onTertiaryFixedVariant = Color(0xFF484828);
}
```

> [!IMPORTANT]
> DESIGN.md also lists `background` (`#faf9f7`), `on-background` (`#1a1c1b`), and `surface-variant` (`#e3e2e0`). These are the **same hex values** as `surface`, `onSurface`, and `surfaceContainerHighest` respectively, and are deprecated fields on Flutter's `ColorScheme` (superseded by the `surface`/`surfaceContainer*` roles). Omit them from the constructor entirely — setting them would only trigger deprecation warnings for no visual difference.

### TextTheme — 8 tokens defined by DESIGN.md, mapped to Flutter's `TextTheme` slots

| DESIGN.md token | Flutter slot | Font | Size | Weight | Line height | Letter spacing |
|---|---|---|---|---|---|---|
| `display-lg-mobile` | `displayLarge` | Playfair Display | 36 | 700 | 44 | -0.01em |
| `headline-md` | `headlineMedium` | Playfair Display | 32 | 600 | 40 | — |
| `headline-sm` | `headlineSmall` | Playfair Display | 24 | 600 | 32 | — |
| `body-lg` | `bodyLarge` | Montserrat | 18 | 400 | 28 | — |
| `body-md` | `bodyMedium` | Montserrat | 16 | 400 | 24 | — |
| `label-md` | `labelMedium` | Montserrat | 14 | 600 | 20 | 0.05em |
| `label-sm` | `labelSmall` | Montserrat | 12 | 500 | 16 | 0.03em |

`display-lg` (48px desktop variant) is intentionally **not** used per Section 3's DEFERRED responsive-typography note.

Slots DESIGN.md does **not** define — fill by interpolating within the same two-font system rather than leaving them at Flutter's defaults (a Roboto-esque font clashing with the brand on any widget that happens to use these slots, e.g. `ListTile.titleTextStyle` uses `titleMedium`):

| Flutter slot | Font | Size | Weight | Rationale |
|---|---|---|---|---|
| `displayMedium` | Playfair Display | 40 | 700 | Interpolated between `displayLarge` (36, but conceptually the top of the scale) and `headlineMedium` (32) |
| `displaySmall` | Playfair Display | 34 | 600 | Between `headlineMedium` and `headlineSmall` |
| `headlineLarge` | Playfair Display | 28 | 600 | Between `displaySmall` and `headlineMedium`, closing the gap to 32 |
| `titleLarge` | Montserrat | 20 | 600 | Bridges `headlineSmall` (24, serif) down into the sans body scale |
| `titleMedium` | Montserrat | 16 | 600 | Matches `bodyMedium`'s size at a heavier weight, for emphasis contexts (AppBar titles, dialog titles) |
| `titleSmall` | Montserrat | 14 | 600 | Same size/weight as `labelMedium` but without its letter-spacing/uppercase intent |
| `bodySmall` | Montserrat | 12 | 400 | Regular-weight counterpart to `labelSmall`'s size |

> [!WARNING]
> DESIGN.md's uppercase label styling ("Uppercase styling with increased letter spacing is the standard for labels") has **no equivalent in Flutter's `TextStyle`** — there is no CSS-style `text-transform`. Apply `.toUpperCase()` to the string content at the call site (or a small reusable widget, e.g. `UppercaseLabel`), not as part of the theme. Flag this so it isn't silently dropped or attempted as a (nonexistent) `TextStyle` property.

```dart
// lib/theme/app_typography.dart
import 'package:flutter/material.dart';

abstract final class AppTypography {
  static const _serif = 'PlayfairDisplay';
  static const _sans = 'Montserrat';

  static const textTheme = TextTheme(
    displayLarge: TextStyle(
      fontFamily: _serif, fontSize: 36, fontWeight: FontWeight.w700,
      height: 44 / 36, letterSpacing: -0.01 * 36,
    ),
    displayMedium: TextStyle(
      fontFamily: _serif, fontSize: 40, fontWeight: FontWeight.w700, height: 48 / 40,
    ),
    displaySmall: TextStyle(
      fontFamily: _serif, fontSize: 34, fontWeight: FontWeight.w600, height: 42 / 34,
    ),
    headlineLarge: TextStyle(
      fontFamily: _serif, fontSize: 28, fontWeight: FontWeight.w600, height: 36 / 28,
    ),
    headlineMedium: TextStyle(
      fontFamily: _serif, fontSize: 32, fontWeight: FontWeight.w600, height: 40 / 32,
    ),
    headlineSmall: TextStyle(
      fontFamily: _serif, fontSize: 24, fontWeight: FontWeight.w600, height: 32 / 24,
    ),
    titleLarge: TextStyle(
      fontFamily: _sans, fontSize: 20, fontWeight: FontWeight.w600, height: 28 / 20,
    ),
    titleMedium: TextStyle(
      fontFamily: _sans, fontSize: 16, fontWeight: FontWeight.w600, height: 24 / 16,
    ),
    titleSmall: TextStyle(
      fontFamily: _sans, fontSize: 14, fontWeight: FontWeight.w600, height: 20 / 14,
    ),
    bodyLarge: TextStyle(
      fontFamily: _sans, fontSize: 18, fontWeight: FontWeight.w400, height: 28 / 18,
    ),
    bodyMedium: TextStyle(
      fontFamily: _sans, fontSize: 16, fontWeight: FontWeight.w400, height: 24 / 16,
    ),
    bodySmall: TextStyle(
      fontFamily: _sans, fontSize: 12, fontWeight: FontWeight.w400, height: 16 / 12,
    ),
    labelMedium: TextStyle(
      fontFamily: _sans, fontSize: 14, fontWeight: FontWeight.w600,
      height: 20 / 14, letterSpacing: 0.05 * 14,
    ),
    labelSmall: TextStyle(
      fontFamily: _sans, fontSize: 12, fontWeight: FontWeight.w500,
      height: 16 / 12, letterSpacing: 0.03 * 12,
    ),
  );
}
```

(`letterSpacing`/`height` computed from DESIGN.md's `em`/px values — Flutter's `letterSpacing` is in logical pixels, so `em` values are multiplied by the token's own `fontSize`; `height` is a multiplier of `fontSize`, so `lineHeight ÷ fontSize`.)

### Radius (`rounded` tokens, 1rem = 16px)

| Token | rem | px | Flutter constant |
|---|---|---|---|
| `sm` | 0.125rem | 2 | `AppRadius.sm` |
| `DEFAULT` | 0.25rem | 4 | `AppRadius.md` (Flutter's `Radius`/`BorderRadius` API doesn't have a bare "default" name; call it `md` — this is the standard radius for buttons/inputs per DESIGN.md's Shapes section) |
| `md` | 0.375rem | 6 | `AppRadius.lg` (renamed to avoid colliding with DESIGN.md's own "DEFAULT"/"md" naming, which doesn't map 1:1 onto a 3-step small/medium/large Flutter naming scheme) |
| `lg` | 0.5rem | 8 | `AppRadius.xl` — used for Cards/larger containers |
| `xl` | 0.75rem | 12 | `AppRadius.xxl` |
| `full` | 9999px | 9999 | `AppRadius.full` — pill/circle |

> [!IMPORTANT]
> DESIGN.md's own token names (`sm`, `DEFAULT`, `md`, `lg`, `xl`, `full`) don't map cleanly onto a conventional small→large Dart naming scheme because `DEFAULT` sits between `sm` and `md`. The table above renames them positionally (`sm` < `md` < `lg` < `xl` < `xxl` < `full`) to avoid ambiguity in code — implementer should keep a comment in `app_radius.dart` cross-referencing back to DESIGN.md's original token names so the mapping isn't lost.

```dart
// lib/theme/app_radius.dart
abstract final class AppRadius {
  static const double sm = 2;   // DESIGN.md: rounded.sm (0.125rem)
  static const double md = 4;   // DESIGN.md: rounded.DEFAULT (0.25rem) - standard for buttons/inputs
  static const double lg = 6;   // DESIGN.md: rounded.md (0.375rem)
  static const double xl = 8;   // DESIGN.md: rounded.lg (0.5rem) - standard for Cards
  static const double xxl = 12; // DESIGN.md: rounded.xl (0.75rem)
  static const double full = 9999; // DESIGN.md: rounded.full - pill/circle
}
```

### Spacing

```dart
// lib/theme/app_spacing.dart
abstract final class AppSpacing {
  static const double unit = 8;
  static const double gutter = 24;
  static const double marginMobile = 20;
  static const double marginDesktop = 64;
  static const double containerMax = 1200;
}
```

### Combined `ThemeData`

```dart
// lib/theme/app_theme.dart
import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'app_radius.dart';
import 'app_typography.dart';

abstract final class AppTheme {
  static final ThemeData light = ThemeData(
    useMaterial3: true,
    colorScheme: const ColorScheme(
      brightness: Brightness.light,
      surface: AppColors.surface,
      onSurface: AppColors.onSurface,
      onSurfaceVariant: AppColors.onSurfaceVariant,
      surfaceDim: AppColors.surfaceDim,
      surfaceBright: AppColors.surfaceBright,
      surfaceContainerLowest: AppColors.surfaceContainerLowest,
      surfaceContainerLow: AppColors.surfaceContainerLow,
      surfaceContainer: AppColors.surfaceContainer,
      surfaceContainerHigh: AppColors.surfaceContainerHigh,
      surfaceContainerHighest: AppColors.surfaceContainerHighest,
      inverseSurface: AppColors.inverseSurface,
      onInverseSurface: AppColors.onInverseSurface,
      outline: AppColors.outline,
      outlineVariant: AppColors.outlineVariant,
      surfaceTint: AppColors.surfaceTint,
      primary: AppColors.primary,
      onPrimary: AppColors.onPrimary,
      primaryContainer: AppColors.primaryContainer,
      onPrimaryContainer: AppColors.onPrimaryContainer,
      inversePrimary: AppColors.inversePrimary,
      secondary: AppColors.secondary,
      onSecondary: AppColors.onSecondary,
      secondaryContainer: AppColors.secondaryContainer,
      onSecondaryContainer: AppColors.onSecondaryContainer,
      tertiary: AppColors.tertiary,
      onTertiary: AppColors.onTertiary,
      tertiaryContainer: AppColors.tertiaryContainer,
      onTertiaryContainer: AppColors.onTertiaryContainer,
      error: AppColors.error,
      onError: AppColors.onError,
      errorContainer: AppColors.errorContainer,
      onErrorContainer: AppColors.onErrorContainer,
      primaryFixed: AppColors.primaryFixed,
      primaryFixedDim: AppColors.primaryFixedDim,
      onPrimaryFixed: AppColors.onPrimaryFixed,
      onPrimaryFixedVariant: AppColors.onPrimaryFixedVariant,
      secondaryFixed: AppColors.secondaryFixed,
      secondaryFixedDim: AppColors.secondaryFixedDim,
      onSecondaryFixed: AppColors.onSecondaryFixed,
      onSecondaryFixedVariant: AppColors.onSecondaryFixedVariant,
      tertiaryFixed: AppColors.tertiaryFixed,
      tertiaryFixedDim: AppColors.tertiaryFixedDim,
      onTertiaryFixed: AppColors.onTertiaryFixed,
      onTertiaryFixedVariant: AppColors.onTertiaryFixedVariant,
      // background/onBackground/surfaceVariant deliberately omitted — deprecated,
      // same hex values as surface/onSurface/surfaceContainerHighest above.
    ),
    textTheme: AppTypography.textTheme,
    scaffoldBackgroundColor: AppColors.surface,
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.onPrimary,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      border: UnderlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      // "Focus states use a Soft Gold glow" (DESIGN.md, Inputs) — realized via
      // secondaryContainer, the brightest gold token available.
      focusColor: AppColors.secondaryContainer,
    ),
    cardTheme: CardThemeData(
      color: AppColors.surfaceContainerLowest,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.xl),
        // "1px Subtle Gold border" (DESIGN.md, Cards)
        side: const BorderSide(color: AppColors.secondary, width: 1),
      ),
      // "soft, diffused shadow (15% opacity of the Emerald Green)" (DESIGN.md,
      // Elevation & Depth) — an "Umbra" shadow tinted with Primary, not black.
      shadowColor: AppColors.primary.withValues(alpha: 0.15),
    ),
  );
}
```

## 5. Git & Version Control Rules

- Base Branch: Branch off from `dev` and ensure you pull latest changes first.
- Branch Naming Convention: `feature/[ticket-ID]-brief-description`
- Target Branch Name: `feature/app-theme`
- Commit Standard: Use Conventional Commits. Commits must be atomic per step. CRITICAL: don't mention the AI agent name or brand used.
- Final Action: Push to remote and output the git push command used.

## 6. File Operations

- Create:
  - `app/lib/theme/app_colors.dart` — color constants (Section 4).
  - `app/lib/theme/app_typography.dart` — `TextTheme` (Section 4).
  - `app/lib/theme/app_radius.dart` — radius constants (Section 4).
  - `app/lib/theme/app_spacing.dart` — spacing constants (Section 4) — defined for future use, not consumed by any screen in this ticket.
  - `app/lib/theme/app_theme.dart` — combined `ThemeData` (Section 4).
  - `app/fonts/PlayfairDisplay-Bold.ttf`, `app/fonts/PlayfairDisplay-SemiBold.ttf` — weights 700/600, needed for `displayLarge`/`displayMedium`/`displaySmall` (700) and `headlineLarge/Medium/Small` (600).
  - `app/fonts/Montserrat-Regular.ttf`, `app/fonts/Montserrat-Medium.ttf`, `app/fonts/Montserrat-SemiBold.ttf` — weights 400/500/600, needed for the `title*`/`body*`/`label*` slots.
  - `app/test/theme/app_theme_test.dart` — see Section 9.
- Modify:
  - `app/lib/main.dart` — replace `theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple))` with `theme: AppTheme.light`.
  - `app/pubspec.yaml` — add a `fonts:` section declaring both families and their weights (see Section 7). No new *package* dependency is required — fonts are bundled assets, not fetched via `google_fonts` (see Section 8 for why).

## 7. Implementation Steps

1. Step 1: Checkout the new branch `feature/app-theme` from `dev`.
2. Step 2: Download Playfair Display (Bold, SemiBold) and Montserrat (Regular, Medium, SemiBold) `.ttf` files from Google Fonts (both are SIL Open Font License, safe to bundle) into `app/fonts/`.
3. Step 3: Add the `fonts:` section to `app/pubspec.yaml`:
   ```yaml
   flutter:
     fonts:
       - family: PlayfairDisplay
         fonts:
           - asset: fonts/PlayfairDisplay-SemiBold.ttf
             weight: 600
           - asset: fonts/PlayfairDisplay-Bold.ttf
             weight: 700
       - family: Montserrat
         fonts:
           - asset: fonts/Montserrat-Regular.ttf
             weight: 400
           - asset: fonts/Montserrat-Medium.ttf
             weight: 500
           - asset: fonts/Montserrat-SemiBold.ttf
             weight: 600
   ```
4. Step 4: Create `lib/theme/app_colors.dart`.
5. Step 5: Create `lib/theme/app_typography.dart`.
6. Step 6: Create `lib/theme/app_radius.dart` and `lib/theme/app_spacing.dart`.
7. Step 7: Create `lib/theme/app_theme.dart` combining the above into `AppTheme.light`.
8. Step 8: Modify `lib/main.dart` to use `AppTheme.light`.
9. Step 9: Add `test/theme/app_theme_test.dart`; run `flutter test` and fix failures.
10. Step 10: Manual verification (Section 9's "Manual" note) — run the app, confirm the login screen renders with the new colors/fonts/shapes with no code changes to `login_screen.dart`.
11. Step 11: Push to remote.

## 8. Error Handling & Edge Cases

- **Font delivery — bundled assets, not `google_fonts` package**: the `google_fonts` pub package fetches font files from Google's CDN at runtime on first use (and caches them), which means a fresh install with no network connectivity renders with a fallback system font until the fetch succeeds — a visible flash-of-unstyled-text that undercuts the "premium, no clutter" brand goal DESIGN.md describes. Bundling the five `.ttf` files as static assets (Section 7) avoids this entirely and needs no new runtime dependency. If a future ticket wants to add more Google Fonts weights/families dynamically, reconsider `google_fonts` then — don't mix both approaches in the same app.
- **Deprecated `ColorScheme` fields**: `background`, `onBackground`, `surfaceVariant` are omitted from the `ColorScheme` constructor (Section 4) since their replacements already carry the same hex values — including them would only produce deprecation warnings.
- **No CSS-style text-transform**: DESIGN.md's uppercase label styling must be applied at the call site (`.toUpperCase()` on the string, or a small reusable widget), never as a `TextTheme` property — Flutter's `TextStyle` has no equivalent.
- **Unspecified `TextTheme` slots**: `titleLarge/Medium/Small`, `displayMedium/Small`, `bodySmall` are not in DESIGN.md's 8 defined tokens; Section 4 documents the interpolated values used instead of leaving them at Flutter's system-font defaults, which would look inconsistent on any widget using those slots (AppBar titles, ListTiles, dialogs).
- **Radius naming collision**: DESIGN.md's own `sm`/`DEFAULT`/`md`/`lg`/`xl`/`full` token names don't map onto a conventional small→large Dart scale (`DEFAULT` sits between `sm` and `md`). `app_radius.dart` renames them positionally (`sm`/`md`/`lg`/`xl`/`xxl`/`full`) with a comment cross-referencing the original DESIGN.md names, so the mapping isn't lost on a future re-read of the source file.

## 9. Testing Requirements

**Project type:** Includes UI (pure visual/token change, no new interactive flow, no API integration in this ticket)

### 9a. Widget/Unit Testing

- Test Framework: `flutter_test` (already the project's convention from the login feature).
- Test File Location: `app/test/theme/app_theme_test.dart`.
- Coverage Required:
  - [ ] `AppTheme.light.colorScheme` spot-checks: `primary`, `secondary`, `surface`, `error`, `onSurface` match the exact hex values from Section 4 (regression-proofs against a future accidental token edit).
  - [ ] `AppTheme.light.textTheme.displayLarge`/`headlineMedium`/`headlineSmall` resolve to `fontFamily: 'PlayfairDisplay'`; `bodyMedium`/`labelMedium` resolve to `fontFamily: 'Montserrat'`.
  - [ ] `AppTheme.light.textTheme.labelMedium.letterSpacing` and `.fontSize` match the computed `em`→px value from Section 4 (catches an arithmetic slip in the em-to-px conversion).
  - [ ] `AppRadius` constants match the documented px values (`sm: 2`, `md: 4`, `lg: 6`, `xl: 8`, `xxl: 12`, `full: 9999`).
  - [ ] Pump `MaterialApp(theme: AppTheme.light, home: ...)` and assert `Theme.of(context).colorScheme.primary == AppColors.primary` — confirms the theme is actually wired up, not just constructed correctly in isolation.
- Do NOT: add golden/screenshot-based visual regression tests in this ticket (per the project's spec template — only add if explicitly requested).

### 9b. End-to-End Testing

A pure token/rendering change has no new interactive flow to click through, so a full Patrol scenario adds little beyond what 9a already covers. One minimal smoke check is still worth having, since it's the only test that exercises the *bundled fonts actually loading* in a real compiled app (widget tests don't load real font assets by default):
- Test File Location: extend the existing `app/integration_test/login_flow_test.dart` (or add `app/integration_test/theme_smoke_test.dart`) with one `patrolTest` that launches the app and asserts the login screen renders without throwing (no golden/pixel comparison — just "did it render").
- Do NOT: add pixel-level golden tests, or a full DESIGN.md-component-by-component Patrol suite (Buttons/Inputs/Cards/Chips) — those components aren't implemented yet (DEFERRED per Section 3).

### 9c. Test Execution

- Command to run tests: `cd app && flutter test` (widget/unit) / `cd app && patrol test` (E2E smoke check).
- CRITICAL: All new/modified tests must pass locally before the "Final Action" push step in Section 5.

## 10. Acceptance Criteria

- [ ] The code is pushed to the remote branch `feature/app-theme`.
- [ ] `AppTheme.light` is wired into `MaterialApp.router`'s `theme:` parameter in `main.dart`, replacing the `deepPurple` placeholder.
- [ ] Every `ColorScheme` field matches its DESIGN.md hex value exactly (verified by the widget tests in §9a).
- [ ] Display/headline text renders in Playfair Display; body/label text renders in Montserrat, with no widget falling back to the system default font.
- [ ] Buttons and inputs use `AppRadius.md` (4px); Cards use `AppRadius.xl` (8px) with a 1px `secondary`-colored border and a Primary-tinted shadow, not a black one.
- [ ] The existing `LoginScreen`/`HomeScreen`/`SplashScreen` visually pick up the new theme with zero code changes to those three files.
- [ ] Fonts are bundled as static assets (no `google_fonts` runtime dependency added).
- [ ] All tests defined in Section 9 pass.
