# Implementation Plan: LuxeInvite App Theme

## Goal Description

Implement the theme feature specified in [.docs/specs/app/theme.md](file:///home/rjgj/personal_projects/e_invitation/.docs/specs/app/theme.md): wire the "LuxeInvite" design system (Material 3 `ColorScheme`, `TextTheme`, radius, spacing — sourced from `/home/rjgj/Downloads/DESIGN.md`'s structured `colors:`/`typography:`/`rounded:`/`spacing:` YAML, confirmed authoritative over a rougher reference screenshot) into the Flutter app, replacing the current placeholder `deepPurple`-seeded `ThemeData` in `app/lib/main.dart`. The spec already contains complete, ready-to-paste Dart code for every file — this plan sequences that code into atomic, reviewable commits and adds the verification steps.

### Architecture Overview

```mermaid
graph LR
    A[app_colors.dart] --> E[app_theme.dart]
    B[app_typography.dart] --> E
    C[app_radius.dart] --> E
    D[app_spacing.dart] -.not consumed yet.-> E
    F[fonts/*.ttf + pubspec.yaml fonts:] --> B
    E --> G[main.dart: MaterialApp.router theme:]
    G --> H[SplashScreen / LoginScreen / HomeScreen]
    H -. inherit automatically via Theme.of context .-> H
```

`app_spacing.dart` is created per spec scope but deliberately not wired into any widget in this ticket — it's a token, not yet consumed.

## User Review Required

> [!IMPORTANT]
> **Fonts are bundled as static assets, not the `google_fonts` package.** `google_fonts` fetches from Google's CDN at runtime on first use; a fresh install with no connectivity would render with a fallback system font until the fetch succeeds — a visible flash-of-unstyled-text that undercuts the "premium" brand goal. This means someone needs to actually download 5 `.ttf` files (Playfair Display Bold + SemiBold, Montserrat Regular + Medium + SemiBold — both families are SIL Open Font License, safe to bundle) from Google Fonts and place them in `app/fonts/` before this can build. This plan cannot fetch them itself (no network tool for binary downloads in this flow) — flagging as a manual prerequisite for whoever executes Step 2.

> [!IMPORTANT]
> **Deprecated `ColorScheme` fields omitted.** DESIGN.md lists `background`, `on-background`, `surface-variant` — these carry the exact same hex values as `surface`, `onSurface`, `surfaceContainerHighest` and are deprecated on Flutter's `ColorScheme`. They're correctly left out of the constructor in the spec's code; don't "helpfully" add them back in during implementation.

> [!IMPORTANT]
> **Radius token renaming.** DESIGN.md's own names (`sm`/`DEFAULT`/`md`/`lg`/`xl`/`full`) don't map onto a clean small→large Dart scale because `DEFAULT` sits between `sm` and `md`. The spec renames them positionally (`AppRadius.sm/md/lg/xl/xxl/full`) with inline comments cross-referencing the original DESIGN.md names — preserve those comments verbatim so the mapping isn't lost later.

> [!WARNING]
> **No CSS `text-transform` equivalent.** DESIGN.md's uppercase label styling must be applied at the call site (`.toUpperCase()` on the string) — it cannot be baked into `TextTheme`. Not implemented in this ticket (no label-rendering call sites exist yet outside the login screen, which isn't being restyled), but worth remembering for the next screen that renders a DESIGN.md "label" style.

## Open Questions

None — the one real ambiguity (whether DESIGN.md's structured `colors:` YAML or the reference screenshot's 4-swatch palette was authoritative) was already resolved with the user: **DESIGN.md's YAML wins**. The spec is already written against that decision.

---

## Proposed Changes

### Component 1: Fonts & pubspec.yaml

#### [NEW] app/fonts/*.ttf (manual prerequisite — see "User Review Required")

Five files: `PlayfairDisplay-Bold.ttf`, `PlayfairDisplay-SemiBold.ttf`, `Montserrat-Regular.ttf`, `Montserrat-Medium.ttf`, `Montserrat-SemiBold.ttf`.

#### [MODIFY] app/pubspec.yaml

```diff
 flutter:
   uses-material-design: true

   assets:
     - .env
+
+  fonts:
+    - family: PlayfairDisplay
+      fonts:
+        - asset: fonts/PlayfairDisplay-SemiBold.ttf
+          weight: 600
+        - asset: fonts/PlayfairDisplay-Bold.ttf
+          weight: 700
+    - family: Montserrat
+      fonts:
+        - asset: fonts/Montserrat-Regular.ttf
+          weight: 400
+        - asset: fonts/Montserrat-Medium.ttf
+          weight: 500
+        - asset: fonts/Montserrat-SemiBold.ttf
+          weight: 600
```

No new package dependency — fonts are bundled assets, not fetched via `google_fonts`.

---

### Component 2: Colors

#### [NEW] app/lib/theme/app_colors.dart

```dart
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

(`background`/`onBackground`/`surfaceVariant` deliberately omitted — deprecated, identical hex to `surface`/`onSurface`/`surfaceContainerHighest`.)

---

### Component 3: Typography

#### [NEW] app/lib/theme/app_typography.dart

```dart
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

7 of 15 `TextTheme` slots come directly from DESIGN.md's 8 defined tokens (`display-lg-mobile`→`displayLarge`, `headline-md`→`headlineMedium`, `headline-sm`→`headlineSmall`, `body-lg`→`bodyLarge`, `body-md`→`bodyMedium`, `label-md`→`labelMedium`, `label-sm`→`labelSmall`); the other 7 (`displayMedium/Small`, `headlineLarge`, `titleLarge/Medium/Small`, `bodySmall`) are interpolated within the same two-font system per spec §4, so no Material widget (AppBar title, ListTile, dialogs) falls back to the system default font.

---

### Component 4: Radius & Spacing

#### [NEW] app/lib/theme/app_radius.dart

```dart
abstract final class AppRadius {
  static const double sm = 2;   // DESIGN.md: rounded.sm (0.125rem)
  static const double md = 4;   // DESIGN.md: rounded.DEFAULT (0.25rem) - standard for buttons/inputs
  static const double lg = 6;   // DESIGN.md: rounded.md (0.375rem)
  static const double xl = 8;   // DESIGN.md: rounded.lg (0.5rem) - standard for Cards
  static const double xxl = 12; // DESIGN.md: rounded.xl (0.75rem)
  static const double full = 9999; // DESIGN.md: rounded.full - pill/circle
}
```

#### [NEW] app/lib/theme/app_spacing.dart

```dart
abstract final class AppSpacing {
  static const double unit = 8;
  static const double gutter = 24;
  static const double marginMobile = 20;
  static const double marginDesktop = 64;
  static const double containerMax = 1200;
}
```

---

### Component 5: Combined ThemeData

#### [NEW] app/lib/theme/app_theme.dart

```dart
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

---

### Component 6: App Entrypoint Wiring

#### [MODIFY] app/lib/main.dart

```diff
 import 'package:flutter/material.dart';
 import 'package:flutter_dotenv/flutter_dotenv.dart';
 import 'package:flutter_riverpod/flutter_riverpod.dart';

 import 'providers/router_provider.dart';
+import 'theme/app_theme.dart';

 Future<void> main() async {
   WidgetsFlutterBinding.ensureInitialized();
   await dotenv.load(fileName: '.env');
   runApp(const ProviderScope(child: MyApp()));
 }

 class MyApp extends ConsumerWidget {
   const MyApp({super.key});

   @override
   Widget build(BuildContext context, WidgetRef ref) {
     final router = ref.watch(routerProvider);
     return MaterialApp.router(
       title: 'e_invitation',
-      theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple)),
+      theme: AppTheme.light,
       routerConfig: router,
     );
   }
 }
```

`SplashScreen`/`LoginScreen`/`HomeScreen` need no changes — they already read from `Theme.of(context)` via standard Material widgets.

---

### Component 7: Testing

#### [NEW] app/test/theme/app_theme_test.dart

Widget/unit tests (per spec §9a):
- `AppTheme.light.colorScheme` spot-checks: `primary`, `secondary`, `surface`, `error`, `onSurface` match the exact hex values from Component 2.
- `textTheme.displayLarge`/`headlineMedium`/`headlineSmall` resolve to `fontFamily: 'PlayfairDisplay'`; `bodyMedium`/`labelMedium` resolve to `fontFamily: 'Montserrat'`.
- `textTheme.labelMedium.letterSpacing` and `.fontSize` match the computed em→px value (`0.05 * 14 = 0.7`).
- `AppRadius` constants match the documented px values (`sm: 2`, `md: 4`, `lg: 6`, `xl: 8`, `xxl: 12`, `full: 9999`).
- Pump `MaterialApp(theme: AppTheme.light, home: ...)` and assert `Theme.of(context).colorScheme.primary == AppColors.primary` — confirms the theme is actually wired, not just constructed correctly in isolation.

#### [MODIFY] app/integration_test/login_flow_test.dart (or new `theme_smoke_test.dart`)

One `patrolTest` smoke check: launch the app, assert the login screen renders without throwing — this is the only test that exercises the bundled fonts actually loading in a real compiled app (widget tests don't load real font assets by default). No golden/pixel comparison.

---

## Implementation Sequence

| Step | Action | Commit Message |
| ---- | ------ | --------------- |
| 1 | Checkout `feature/app-theme` from `dev` | — |
| 2 | Download the 5 font files into `app/fonts/` (manual prerequisite, see "User Review Required") | — |
| 3 | Add `fonts:` section to `app/pubspec.yaml` | `chore: bundle Playfair Display and Montserrat font assets` |
| 4 | Create `lib/theme/app_colors.dart` | `feat: add LuxeInvite color tokens` |
| 5 | Create `lib/theme/app_typography.dart` | `feat: add LuxeInvite typography tokens` |
| 6 | Create `lib/theme/app_radius.dart`, `lib/theme/app_spacing.dart` | `feat: add radius and spacing tokens` |
| 7 | Create `lib/theme/app_theme.dart` | `feat: add combined AppTheme.light ThemeData` |
| 8 | Modify `lib/main.dart` to use `AppTheme.light` | `feat: wire LuxeInvite theme into app entrypoint` |
| 9 | Add `test/theme/app_theme_test.dart`; run `flutter test`; fix failures | `test: add theme token and wiring tests` |
| 10 | Extend/add Patrol smoke test | `test: add theme smoke test to Patrol suite` |
| 11 | Manual verification (below) | — |
| 12 | Push to remote | — |

## Verification Plan

### Automated Tests

```bash
cd app && flutter test
# Expect: all tests pass, including test/theme/app_theme_test.dart

cd app && patrol test
# Expect: the smoke test launches the app and renders the login screen without throwing
```

### Manual Verification

1. Run the app (emulator or simulator). Confirm the login screen now shows: Emerald Green primary button, cream/off-white background, Playfair Display on any headline text, Montserrat on body/label text — with **zero code changes** to `login_screen.dart`.
2. Confirm no Flutter deprecation warnings print in the console about `background`/`onBackground`/`surfaceVariant`.
3. Confirm fonts render immediately on first launch with no visible fallback-font flash (validates the bundled-assets decision over `google_fonts`).
4. Spot-check a Card widget (if any exist to test against; if none, this can be validated purely via the `cardTheme` unit test) for the 1px gold border and Primary-tinted (not black) shadow.

## Critical Files

- `app/lib/theme/app_theme.dart` — the file everything else composes into; wired into `main.dart`.
- `app/lib/main.dart` — the only existing file modified; a one-line `theme:` swap.
- `.docs/specs/app/theme.md` — source spec; all code above is copied verbatim from its §4.
