import 'dart:async';

import 'package:e_invitation/models/auth_failure.dart';
import 'package:e_invitation/models/user.dart';
import 'package:e_invitation/screens/login_screen.dart';
import 'package:e_invitation/services/auth_api.dart';
import 'package:e_invitation/services/token_storage.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import '../fakes/fake_token_storage.dart';

class MockAuthApi extends Mock implements AuthApi {}

const _user = User(id: 'u1', name: 'Ada', email: 'ada@example.com');

Future<void> _pumpLoginScreen(WidgetTester tester, MockAuthApi authApi) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authApiProvider.overrideWithValue(authApi),
        tokenStorageProvider.overrideWithValue(FakeTokenStorage()),
      ],
      child: const MaterialApp(home: LoginScreen()),
    ),
  );
}

void main() {
  late MockAuthApi authApi;

  setUp(() {
    authApi = MockAuthApi();
  });

  testWidgets('renders the email field, password field, and submit button', (tester) async {
    await _pumpLoginScreen(tester, authApi);

    expect(find.byKey(const Key('login_email_field')), findsOneWidget);
    expect(find.byKey(const Key('login_password_field')), findsOneWidget);
    expect(find.byKey(const Key('login_submit_button')), findsOneWidget);
  });

  testWidgets('empty fields show validation errors and do not call login', (tester) async {
    await _pumpLoginScreen(tester, authApi);

    await tester.tap(find.byKey(const Key('login_submit_button')));
    await tester.pump();

    expect(find.text('Email is required'), findsOneWidget);
    expect(find.text('Password is required'), findsOneWidget);
    verifyNever(() => authApi.login(any(), any()));
  });

  testWidgets('a malformed email shows its message and does not call login', (tester) async {
    await _pumpLoginScreen(tester, authApi);

    await tester.enterText(find.byKey(const Key('login_email_field')), 'not-an-email');
    await tester.enterText(find.byKey(const Key('login_password_field')), 'password');
    await tester.tap(find.byKey(const Key('login_submit_button')));
    await tester.pump();

    expect(find.text('Enter a valid email address'), findsOneWidget);
    verifyNever(() => authApi.login(any(), any()));
  });

  testWidgets('valid input calls login exactly once', (tester) async {
    when(() => authApi.login('ada@example.com', 'password')).thenAnswer(
      (_) async => (user: _user, accessToken: 'access-1', refreshToken: 'refresh-1'),
    );

    await _pumpLoginScreen(tester, authApi);
    await tester.enterText(find.byKey(const Key('login_email_field')), 'ada@example.com');
    await tester.enterText(find.byKey(const Key('login_password_field')), 'password');
    await tester.tap(find.byKey(const Key('login_submit_button')));
    await tester.pumpAndSettle();

    verify(() => authApi.login('ada@example.com', 'password')).called(1);
  });

  testWidgets('shows a loading indicator while the call is pending', (tester) async {
    final completer = Completer<({User user, String accessToken, String refreshToken})>();
    when(() => authApi.login('ada@example.com', 'password'))
        .thenAnswer((_) => completer.future);

    await _pumpLoginScreen(tester, authApi);
    await tester.enterText(find.byKey(const Key('login_email_field')), 'ada@example.com');
    await tester.enterText(find.byKey(const Key('login_password_field')), 'password');
    await tester.tap(find.byKey(const Key('login_submit_button')));
    await tester.pump();

    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    final submitButton = tester.widget<ElevatedButton>(
      find.byKey(const Key('login_submit_button')),
    );
    expect(submitButton.onPressed, isNull);

    completer.complete((user: _user, accessToken: 'a', refreshToken: 'r'));
    await tester.pumpAndSettle();
  });

  testWidgets('shows the exact server message for invalid credentials', (tester) async {
    when(() => authApi.login('ada@example.com', 'wrong'))
        .thenThrow(const AuthFailure.invalidCredentials());

    await _pumpLoginScreen(tester, authApi);
    await tester.enterText(find.byKey(const Key('login_email_field')), 'ada@example.com');
    await tester.enterText(find.byKey(const Key('login_password_field')), 'wrong');
    await tester.tap(find.byKey(const Key('login_submit_button')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('login_error_banner')), findsOneWidget);
    expect(find.text('Invalid email or password'), findsOneWidget);
  });

  testWidgets('shows a generic message for a network/server failure', (tester) async {
    when(() => authApi.login('ada@example.com', 'password'))
        .thenThrow(const AuthFailure.network());

    await _pumpLoginScreen(tester, authApi);
    await tester.enterText(find.byKey(const Key('login_email_field')), 'ada@example.com');
    await tester.enterText(find.byKey(const Key('login_password_field')), 'password');
    await tester.tap(find.byKey(const Key('login_submit_button')));
    await tester.pumpAndSettle();

    expect(find.text('Something went wrong. Please try again.'), findsOneWidget);
  });
}
