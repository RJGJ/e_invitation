import 'dart:convert';

import 'package:e_invitation/models/auth_failure.dart';
import 'package:e_invitation/models/user.dart';
import 'package:e_invitation/providers/auth_provider.dart';
import 'package:e_invitation/providers/auth_state.dart';
import 'package:e_invitation/services/auth_api.dart';
import 'package:e_invitation/services/token_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import '../fakes/fake_token_storage.dart';

class MockAuthApi extends Mock implements AuthApi {}

const _user = User(id: 'u1', name: 'Ada', email: 'ada@example.com');

void main() {
  late MockAuthApi authApi;
  late FakeTokenStorage tokenStorage;
  late ProviderContainer container;

  setUp(() {
    authApi = MockAuthApi();
    tokenStorage = FakeTokenStorage();
    container = ProviderContainer(
      overrides: [
        authApiProvider.overrideWithValue(authApi),
        tokenStorageProvider.overrideWithValue(tokenStorage),
      ],
    );
  });

  tearDown(() => container.dispose());

  group('login', () {
    test('success sets AuthState.authenticated and persists the session', () async {
      when(() => authApi.login('ada@example.com', 'password')).thenAnswer(
        (_) async => (user: _user, accessToken: 'access-1', refreshToken: 'refresh-1'),
      );

      await container.read(authProvider.notifier).login('ada@example.com', 'password');

      expect(container.read(authProvider), const AuthState.authenticated(_user));
      expect(tokenStorage.accessToken, 'access-1');
      expect(tokenStorage.refreshToken, 'refresh-1');
      expect(tokenStorage.user, _user);
    });

    test('failure does not persist a session', () async {
      when(() => authApi.login('ada@example.com', 'wrong'))
          .thenThrow(const AuthFailure.invalidCredentials());

      await expectLater(
        () => container.read(authProvider.notifier).login('ada@example.com', 'wrong'),
        throwsA(isA<AuthFailure>()),
      );

      expect(tokenStorage.accessToken, isNull);
    });
  });

  group('tryAutoLogin', () {
    test('no stored tokens results in unauthenticated', () async {
      await container.read(authProvider.notifier).tryAutoLogin();

      expect(container.read(authProvider), const AuthState.unauthenticated());
    });

    test('valid cached token and user skips the network call', () async {
      tokenStorage.accessToken = _validToken();
      tokenStorage.refreshToken = 'refresh-1';
      tokenStorage.user = _user;

      await container.read(authProvider.notifier).tryAutoLogin();

      expect(container.read(authProvider), const AuthState.authenticated(_user));
      verifyNever(() => authApi.refresh(any()));
    });

    test('expired token with a successful refresh reuses the cached user', () async {
      tokenStorage.accessToken = _expiredToken();
      tokenStorage.refreshToken = 'refresh-1';
      tokenStorage.user = _user;
      when(() => authApi.refresh('refresh-1')).thenAnswer((_) async => 'new-access');

      await container.read(authProvider.notifier).tryAutoLogin();

      expect(container.read(authProvider), const AuthState.authenticated(_user));
      expect(tokenStorage.accessToken, 'new-access');
    });

    test('expired token with a failed refresh clears the session', () async {
      tokenStorage.accessToken = _expiredToken();
      tokenStorage.refreshToken = 'refresh-1';
      tokenStorage.user = _user;
      when(() => authApi.refresh('refresh-1')).thenThrow(const AuthFailure.invalidCredentials());

      await container.read(authProvider.notifier).tryAutoLogin();

      expect(container.read(authProvider), const AuthState.unauthenticated());
      expect(tokenStorage.accessToken, isNull);
    });
  });

  group('logout / forceLogout', () {
    test('logout clears storage and state even when the API call throws', () async {
      tokenStorage.accessToken = 'access-1';
      tokenStorage.refreshToken = 'refresh-1';
      tokenStorage.user = _user;
      when(() => authApi.logout('refresh-1')).thenThrow(Exception('network error'));

      await container.read(authProvider.notifier).logout();

      expect(container.read(authProvider), const AuthState.unauthenticated());
      expect(tokenStorage.accessToken, isNull);
    });
  });
}

String _validToken() => _jwtWithExp(DateTime.now().add(const Duration(hours: 1)));
String _expiredToken() => _jwtWithExp(DateTime.now().subtract(const Duration(hours: 1)));

/// Builds a minimal unsigned JWT with the given expiry — sufficient for
/// JwtDecoder.isExpired(), which only reads the payload, not the signature.
String _jwtWithExp(DateTime expiry) {
  final header = _base64Segment('{"alg":"none","typ":"JWT"}');
  final payload = _base64Segment('{"exp":${expiry.millisecondsSinceEpoch ~/ 1000}}');
  return '$header.$payload.';
}

String _base64Segment(String json) {
  return base64Url.encode(utf8.encode(json)).replaceAll('=', '');
}
