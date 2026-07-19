import 'package:flutter/material.dart';

abstract final class AppTypography {
  static const _serif = 'PlayfairDisplay';
  static const _sans = 'Montserrat';

  static const textTheme = TextTheme(
    displayLarge: TextStyle(
      fontFamily: _serif,
      fontSize: 36,
      fontWeight: FontWeight.w700,
      height: 44 / 36,
      letterSpacing: -0.01 * 36,
    ),
    displayMedium: TextStyle(
      fontFamily: _serif,
      fontSize: 40,
      fontWeight: FontWeight.w700,
      height: 48 / 40,
    ),
    displaySmall: TextStyle(
      fontFamily: _serif,
      fontSize: 34,
      fontWeight: FontWeight.w600,
      height: 42 / 34,
    ),
    headlineLarge: TextStyle(
      fontFamily: _serif,
      fontSize: 28,
      fontWeight: FontWeight.w600,
      height: 36 / 28,
    ),
    headlineMedium: TextStyle(
      fontFamily: _serif,
      fontSize: 32,
      fontWeight: FontWeight.w600,
      height: 40 / 32,
    ),
    headlineSmall: TextStyle(
      fontFamily: _serif,
      fontSize: 24,
      fontWeight: FontWeight.w600,
      height: 32 / 24,
    ),
    titleLarge: TextStyle(
      fontFamily: _sans,
      fontSize: 20,
      fontWeight: FontWeight.w600,
      height: 28 / 20,
    ),
    titleMedium: TextStyle(
      fontFamily: _sans,
      fontSize: 16,
      fontWeight: FontWeight.w600,
      height: 24 / 16,
    ),
    titleSmall: TextStyle(
      fontFamily: _sans,
      fontSize: 14,
      fontWeight: FontWeight.w600,
      height: 20 / 14,
    ),
    bodyLarge: TextStyle(
      fontFamily: _sans,
      fontSize: 18,
      fontWeight: FontWeight.w400,
      height: 28 / 18,
    ),
    bodyMedium: TextStyle(
      fontFamily: _sans,
      fontSize: 16,
      fontWeight: FontWeight.w400,
      height: 24 / 16,
    ),
    bodySmall: TextStyle(
      fontFamily: _sans,
      fontSize: 12,
      fontWeight: FontWeight.w400,
      height: 16 / 12,
    ),
    labelMedium: TextStyle(
      fontFamily: _sans,
      fontSize: 14,
      fontWeight: FontWeight.w600,
      height: 20 / 14,
      letterSpacing: 0.05 * 14,
    ),
    labelSmall: TextStyle(
      fontFamily: _sans,
      fontSize: 12,
      fontWeight: FontWeight.w500,
      height: 16 / 12,
      letterSpacing: 0.03 * 12,
    ),
  );
}
