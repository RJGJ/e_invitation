import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:e_invitation/theme/app_colors.dart';
import 'package:e_invitation/theme/app_radius.dart';
import 'package:e_invitation/theme/app_theme.dart';

void main() {
  group('AppTheme.light colorScheme', () {
    final scheme = AppTheme.light.colorScheme;

    test('primary matches DESIGN.md Emerald Green', () {
      expect(scheme.primary, const Color(0xFF00492E));
    });

    test('secondary matches DESIGN.md Subtle Gold', () {
      expect(scheme.secondary, const Color(0xFF735C00));
    });

    test('surface matches DESIGN.md Soft Cream', () {
      expect(scheme.surface, const Color(0xFFFAF9F7));
    });

    test('error matches DESIGN.md error token', () {
      expect(scheme.error, const Color(0xFFBA1A1A));
    });

    test('onSurface matches DESIGN.md on-surface token', () {
      expect(scheme.onSurface, const Color(0xFF1A1C1B));
    });
  });

  group('AppTheme.light textTheme', () {
    final text = AppTheme.light.textTheme;

    test('display/headline slots use Playfair Display', () {
      expect(text.displayLarge?.fontFamily, 'PlayfairDisplay');
      expect(text.headlineMedium?.fontFamily, 'PlayfairDisplay');
      expect(text.headlineSmall?.fontFamily, 'PlayfairDisplay');
    });

    test('body/label slots use Montserrat', () {
      expect(text.bodyMedium?.fontFamily, 'Montserrat');
      expect(text.labelMedium?.fontFamily, 'Montserrat');
    });

    test(
      'labelMedium size and letter spacing match DESIGN.md (0.05em of 14px)',
      () {
        expect(text.labelMedium?.fontSize, 14);
        expect(text.labelMedium?.letterSpacing, closeTo(0.05 * 14, 0.0001));
      },
    );
  });

  group('AppRadius', () {
    test('constants match DESIGN.md px values', () {
      expect(AppRadius.sm, 2);
      expect(AppRadius.md, 4);
      expect(AppRadius.lg, 6);
      expect(AppRadius.xl, 8);
      expect(AppRadius.xxl, 12);
      expect(AppRadius.full, 9999);
    });
  });

  group('theme wiring', () {
    testWidgets('MaterialApp exposes AppTheme.light via Theme.of', (
      tester,
    ) async {
      late ColorScheme observed;
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Builder(
            builder: (context) {
              observed = Theme.of(context).colorScheme;
              return const SizedBox.shrink();
            },
          ),
        ),
      );
      expect(observed.primary, AppColors.primary);
    });
  });
}
