import 'package:dio/dio.dart';
import 'package:e_invitation/models/auth_failure.dart';
import 'package:e_invitation/models/user.dart';
import 'package:e_invitation/services/auth_api.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class MockDio extends Mock implements Dio {}

Response<T> _response<T>(String path, int statusCode, T data) {
  return Response<T>(
    requestOptions: RequestOptions(path: path),
    statusCode: statusCode,
    data: data,
  );
}

DioException _dioError(String path, int statusCode, Map<String, dynamic>? data) {
  return DioException(
    requestOptions: RequestOptions(path: path),
    response: _response(path, statusCode, data),
  );
}

void main() {
  late MockDio dio;
  late AuthApi authApi;

  setUp(() {
    dio = MockDio();
    authApi = AuthApi(dio);
  });

  group('login', () {
    test('parses User and both tokens on a 200 response', () async {
      when(() => dio.post('/api/auth/login', data: any(named: 'data'))).thenAnswer(
        (_) async => _response('/api/auth/login', 200, {
          'accessToken': 'access-123',
          'refreshToken': 'refresh-456',
          'user': {'id': 'u1', 'name': 'Ada', 'email': 'ada@example.com'},
        }),
      );

      final result = await authApi.login('ada@example.com', 'password');

      expect(result.accessToken, 'access-123');
      expect(result.refreshToken, 'refresh-456');
      expect(result.user, const User(id: 'u1', name: 'Ada', email: 'ada@example.com'));
    });

    test('maps a 401 to AuthFailure.invalidCredentials', () async {
      when(() => dio.post('/api/auth/login', data: any(named: 'data'))).thenThrow(
        _dioError('/api/auth/login', 401, {'error': 'Invalid email or password'}),
      );

      expect(
        () => authApi.login('ada@example.com', 'wrong'),
        throwsA(const AuthFailure.invalidCredentials()),
      );
    });

    test('maps a 400 to AuthFailure.validation with the server message', () async {
      when(() => dio.post('/api/auth/login', data: any(named: 'data'))).thenThrow(
        _dioError('/api/auth/login', 400, {'error': 'Email and password are required'}),
      );

      expect(
        () => authApi.login('', ''),
        throwsA(const AuthFailure.validation('Email and password are required')),
      );
    });

    test('maps a 500 to AuthFailure.server', () async {
      when(() => dio.post('/api/auth/login', data: any(named: 'data'))).thenThrow(
        _dioError('/api/auth/login', 500, {'error': 'Internal server error'}),
      );

      expect(
        () => authApi.login('ada@example.com', 'password'),
        throwsA(const AuthFailure.server()),
      );
    });

    test('maps a network failure to AuthFailure.network', () async {
      when(() => dio.post('/api/auth/login', data: any(named: 'data'))).thenThrow(
        DioException(
          requestOptions: RequestOptions(path: '/api/auth/login'),
          type: DioExceptionType.connectionTimeout,
        ),
      );

      expect(
        () => authApi.login('ada@example.com', 'password'),
        throwsA(const AuthFailure.network()),
      );
    });
  });

  group('refresh', () {
    test('returns a new access token on success', () async {
      when(() => dio.post('/api/auth/refresh', data: any(named: 'data'))).thenAnswer(
        (_) async => _response('/api/auth/refresh', 200, {'accessToken': 'new-access'}),
      );

      final token = await authApi.refresh('refresh-456');

      expect(token, 'new-access');
    });

    test('throws on a 401', () async {
      when(() => dio.post('/api/auth/refresh', data: any(named: 'data'))).thenThrow(
        _dioError('/api/auth/refresh', 401, {'error': 'Invalid or expired refresh token'}),
      );

      expect(() => authApi.refresh('bad-token'), throwsA(isA<AuthFailure>()));
    });
  });

  group('logout', () {
    test('never throws even when the mocked response is non-200', () async {
      when(() => dio.post('/api/auth/logout', data: any(named: 'data'))).thenThrow(
        _dioError('/api/auth/logout', 500, {'error': 'Internal server error'}),
      );

      await expectLater(authApi.logout('refresh-456'), completes);
    });
  });
}
