// Patrol E2E tests for the login flow.
//
// These drive the *real* compiled app against the *real* running API (not a
// mock) — see .docs/specs/app/login.md §9c and .docs/plans/app-login-plan.md
// for the environment preconditions this requires:
//   - The API running locally at the URL configured in app/.env.
//   - A known seeded test user in that API's database, whose credentials are
//     substituted below (do not commit real credentials here).
//
// Run with: cd app && patrol test
import 'package:e_invitation/main.dart' as app;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:patrol/patrol.dart';

// Substitute with a real seeded test user before running against a live API.
const _testEmail = 'test@example.com';
const _testPassword = 'test-password';

void main() {
  patrolTest('happy path: valid credentials land on the home screen', ($) async {
    await $.pumpWidgetAndSettle(const app.MyApp());

    await $.tester.enterText(
      find.byKey(const Key('login_email_field')),
      _testEmail,
    );
    await $.tester.enterText(
      find.byKey(const Key('login_password_field')),
      _testPassword,
    );
    await $.tester.tap(find.byKey(const Key('login_submit_button')));
    await $.pumpAndSettle();

    expect(find.textContaining('Welcome,'), findsOneWidget);
  });

  patrolTest('wrong password: shows the exact error message and stays on login', ($) async {
    await $.pumpWidgetAndSettle(const app.MyApp());

    await $.tester.enterText(
      find.byKey(const Key('login_email_field')),
      _testEmail,
    );
    await $.tester.enterText(
      find.byKey(const Key('login_password_field')),
      'not-the-right-password',
    );
    await $.tester.tap(find.byKey(const Key('login_submit_button')));
    await $.pumpAndSettle();

    expect(find.byKey(const Key('login_error_banner')), findsOneWidget);
    expect(find.text('Invalid email or password'), findsOneWidget);
  });
}
