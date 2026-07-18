import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AppConfig {
  const AppConfig._(this.apiBaseUrl);

  final String apiBaseUrl;

  factory AppConfig.fromEnv() {
    final apiBaseUrl = dotenv.env['API_BASE_URL'];
    if (apiBaseUrl == null || apiBaseUrl.isEmpty) {
      throw StateError('API_BASE_URL is not set in .env');
    }
    return AppConfig._(apiBaseUrl);
  }
}

final appConfigProvider = Provider<AppConfig>((ref) => AppConfig.fromEnv());
