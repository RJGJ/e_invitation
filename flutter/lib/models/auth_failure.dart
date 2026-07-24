import 'package:freezed_annotation/freezed_annotation.dart';

part 'auth_failure.freezed.dart';

@freezed
sealed class AuthFailure with _$AuthFailure implements Exception {
  const factory AuthFailure.invalidCredentials() = InvalidCredentialsFailure;
  const factory AuthFailure.validation(String message) = ValidationFailure;
  const factory AuthFailure.network() = NetworkFailure;
  const factory AuthFailure.server() = ServerFailure;
}
