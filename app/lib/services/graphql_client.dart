import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:graphql_flutter/graphql_flutter.dart';

import '../config/app_config.dart';
import 'token_storage.dart';

final graphQLClientProvider = Provider<GraphQLClient>((ref) {
  final config = ref.read(appConfigProvider);
  final tokenStorage = ref.read(tokenStorageProvider);

  final httpLink = HttpLink('${config.apiBaseUrl}/api/graphql');

  // Attaches the same JWT bearer token dioProvider (api_client.dart) uses,
  // read from the same tokenStorageProvider — one source of truth for the
  // access token, not a second auth mechanism.
  final authLink = AuthLink(
    getToken: () async {
      final accessToken = await tokenStorage.readAccessToken();
      return accessToken == null ? null : 'Bearer $accessToken';
    },
  );

  final link = authLink.concat(httpLink);

  return GraphQLClient(link: link, cache: GraphQLCache());
});
