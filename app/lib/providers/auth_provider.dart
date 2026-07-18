import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:jwt_decoder/jwt_decoder.dart';

import '../services/auth_api.dart';
import '../services/token_storage.dart';
import 'auth_state.dart';

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() => const AuthState.unknown();

  TokenStorage get _tokenStorage => ref.read(tokenStorageProvider);
  AuthApi get _authApi => ref.read(authApiProvider);

  Future<void> login(String email, String password) async {
    final result = await _authApi.login(email, password);
    await _tokenStorage.writeSession(
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    );
    state = AuthState.authenticated(result.user);
  }

  Future<void> logout() async {
    final refreshToken = await _tokenStorage.readRefreshToken();
    if (refreshToken != null) {
      // Best-effort: the API always returns 200 per its contract and
      // AuthApi.logout() already swallows its own DioExceptions, but stay
      // defensive here too so a session is always cleared regardless.
      try {
        await _authApi.logout(refreshToken);
      } catch (_) {
        // ignore
      }
    }
    await forceLogout();
  }

  /// Clears the session without an API call — used when the session is
  /// already known-dead (a failed refresh), unlike the public logout()
  /// which best-effort-notifies the server first.
  Future<void> forceLogout() async {
    await _tokenStorage.clear();
    state = const AuthState.unauthenticated();
  }

  Future<void> tryAutoLogin() async {
    final accessToken = await _tokenStorage.readAccessToken();
    final cachedUser = await _tokenStorage.readUser();

    if (accessToken != null && cachedUser != null && !JwtDecoder.isExpired(accessToken)) {
      state = AuthState.authenticated(cachedUser);
      return;
    }

    final refreshToken = await _tokenStorage.readRefreshToken();
    if (refreshToken == null || cachedUser == null) {
      await forceLogout();
      return;
    }

    try {
      final newAccessToken = await _authApi.refresh(refreshToken);
      await _tokenStorage.writeAccessToken(newAccessToken);
      state = AuthState.authenticated(cachedUser);
    } catch (_) {
      await forceLogout();
    }
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);
