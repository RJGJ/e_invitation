import 'package:e_invitation/models/user.dart';
import 'package:e_invitation/services/token_storage.dart';

class FakeTokenStorage implements TokenStorage {
  String? accessToken;
  String? refreshToken;
  User? user;

  @override
  Future<String?> readAccessToken() async => accessToken;

  @override
  Future<String?> readRefreshToken() async => refreshToken;

  @override
  Future<User?> readUser() async => user;

  @override
  Future<void> writeSession({
    required String accessToken,
    required String refreshToken,
    required User user,
  }) async {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.user = user;
  }

  @override
  Future<void> writeAccessToken(String accessToken) async {
    this.accessToken = accessToken;
  }

  @override
  Future<void> clear() async {
    accessToken = null;
    refreshToken = null;
    user = null;
  }
}
