import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/auth_failure.dart';
import '../models/user.dart';
import 'api_client.dart';

class AuthApi {
  AuthApi(this._dio);
  final Dio _dio;

  Future<({User user, String accessToken, String refreshToken})> login(
    String email,
    String password,
  ) async {
    try {
      final response = await _dio.post('/api/auth/login', data: {
        'email': email,
        'password': password,
      });
      final data = response.data as Map<String, dynamic>;
      return (
        user: User.fromJson(data['user'] as Map<String, dynamic>),
        accessToken: data['accessToken'] as String,
        refreshToken: data['refreshToken'] as String,
      );
    } on DioException catch (e) {
      throw _mapError(e);
    }
  }

  /// Used by AuthNotifier.tryAutoLogin(); the interceptor's own refresh
  /// call is made directly on `dio` in api_client.dart, not through here,
  /// to avoid a needless extra provider hop inside the interceptor closure.
  Future<String> refresh(String refreshToken) async {
    try {
      final response = await _dio.post('/api/auth/refresh', data: {
        'refreshToken': refreshToken,
      });
      return (response.data as Map<String, dynamic>)['accessToken'] as String;
    } on DioException catch (e) {
      throw _mapError(e);
    }
  }

  Future<void> logout(String refreshToken) async {
    try {
      await _dio.post('/api/auth/logout', data: {'refreshToken': refreshToken});
    } on DioException {
      // Best-effort — the API always returns 200 per its contract; ignore failures.
    }
  }

  AuthFailure _mapError(DioException e) {
    final statusCode = e.response?.statusCode;
    if (statusCode == 401) return const AuthFailure.invalidCredentials();
    if (statusCode == 400) {
      final message = (e.response?.data as Map?)?['error'] as String? ?? 'Validation error';
      return AuthFailure.validation(message);
    }
    if (statusCode == 500) return const AuthFailure.server();
    return const AuthFailure.network();
  }
}

final authApiProvider = Provider<AuthApi>((ref) => AuthApi(ref.watch(dioProvider)));
