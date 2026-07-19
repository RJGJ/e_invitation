// Patrol smoke test for the LuxeInvite theme (.docs/specs/app/theme.md §9b).
//
// Unlike login_flow_test.dart this needs no live API or seeded user: it only
// launches the real compiled app — the one place the bundled Playfair Display
// and Montserrat font assets actually load (widget tests use a stub font) —
// and asserts the login screen renders without throwing.
//
// Run with: cd app && patrol test
import 'package:e_invitation/main.dart' as app;
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:patrol/patrol.dart';

void main() {
  patrolTest('app launches and renders the login screen with the theme', (
    $,
  ) async {
    await dotenv.load(fileName: '.env');
    await $.pumpWidgetAndSettle(const ProviderScope(child: app.MyApp()));

    expect(find.byKey(const Key('login_email_field')), findsOneWidget);
    expect($.tester.takeException(), isNull);
  });
}
