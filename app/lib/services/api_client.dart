import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/app_config.dart';
import '../models/auth_failure.dart';
import 'token_storage.dart';
// authProvider imported for the lazy `ref.read` inside onError — the
// interceptor closure only reads it later, inside the async callback, well
// after every provider has finished its initial construction. This is not a
// circular dependency even though authProvider -> authApiProvider ->
// dioProvider, because dioProvider never eagerly watches/reads authProvider
// during its own build.
import '../providers/auth_provider.dart';

final dioProvider = Provider<Dio>((ref) {
  final config = ref.read(appConfigProvider);
  final tokenStorage = ref.read(tokenStorageProvider);
  final dio = Dio(BaseOptions(baseUrl: config.apiBaseUrl));

  Completer<String?>? refreshCompleter;

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final isAuthRoute = options.path.contains('/api/auth/login') ||
            options.path.contains('/api/auth/refresh');
        if (!isAuthRoute) {
          final accessToken = await tokenStorage.readAccessToken();
          if (accessToken != null) {
            options.headers['Authorization'] = 'Bearer $accessToken';
          }
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        final isRefreshCall = error.requestOptions.path.contains('/api/auth/refresh');
        final alreadyRetried = error.requestOptions.extra['isRetry'] == true;

        if (error.response?.statusCode != 401 || isRefreshCall || alreadyRetried) {
          return handler.next(error);
        }

        final isFirstToRefresh = refreshCompleter == null;
        refreshCompleter ??= Completer<String?>();

        try {
          String? newAccessToken;
          if (isFirstToRefresh) {
            final refreshToken = await tokenStorage.readRefreshToken();
            if (refreshToken == null) throw const AuthFailure.invalidCredentials();

            final response = await dio.post(
              '/api/auth/refresh',
              data: {'refreshToken': refreshToken},
            );
            newAccessToken = response.data['accessToken'] as String;
            await tokenStorage.writeAccessToken(newAccessToken);
            refreshCompleter!.complete(newAccessToken);
          } else {
            newAccessToken = await refreshCompleter!.future;
          }

          final retryOptions = error.requestOptions
            ..headers['Authorization'] = 'Bearer $newAccessToken'
            ..extra['isRetry'] = true;
          final retryResponse = await dio.fetch(retryOptions);
          return handler.resolve(retryResponse);
        } catch (e) {
          if (isFirstToRefresh) refreshCompleter!.completeError(e);
          await ref.read(authProvider.notifier).forceLogout();
          return handler.next(error);
        } finally {
          if (isFirstToRefresh) refreshCompleter = null;
        }
      },
    ),
  );

  return dio;
});
