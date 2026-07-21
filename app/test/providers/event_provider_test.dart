import 'package:e_invitation/providers/event_provider.dart';
import 'package:e_invitation/services/graphql_client.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:mocktail/mocktail.dart';

class MockGraphQLClient extends Mock implements GraphQLClient {}

class FakeQueryOptions extends Fake implements QueryOptions {}

QueryResult _result({Map<String, dynamic>? data, OperationException? exception}) {
  // QueryResult()'s public factory delegates to options.createResult(...),
  // which a Fake can't answer — build via .internal instead, bypassing the
  // options-driven result-parsing eventsProvider doesn't use anyway (it
  // reads result.data directly, not a parsed/typed result).
  return QueryResult.internal(
    data: data,
    exception: exception,
    source: QueryResultSource.network,
    parserFn: (d) => d,
  );
}

Map<String, dynamic> _eventJson(String id) => {
      'id': id,
      'author': {'id': 'u1'},
      'title': 'Untitled wedding',
      'description': null,
      'type': 'wedding',
      'startDate': '2026-02-14T00:00:00.000Z',
      'endDate': null,
      'timezone': 'Asia/Manila',
      'venueName': null,
      'address': null,
      'latitude': null,
      'longitude': null,
      'coverImage': null,
      'gallery': [],
      'allowPlusOne': false,
      'rsvpDeadline': null,
      'requireApproval': false,
      'primaryColor': null,
      'secondaryColor': null,
      'fontFamily': null,
      'createdAt': '2026-01-01T00:00:00.000Z',
      'updatedAt': '2026-01-01T00:00:00.000Z',
    };

void main() {
  setUpAll(() {
    registerFallbackValue(FakeQueryOptions());
  });

  test('eventsProvider parses a mocked GraphQL response into List<Event>', () async {
    final client = MockGraphQLClient();
    when(() => client.query(any())).thenAnswer(
      (_) async => _result(data: {
        'events': [_eventJson('e1'), _eventJson('e2')],
      }),
    );

    final container = ProviderContainer(
      overrides: [graphQLClientProvider.overrideWithValue(client)],
    );
    addTearDown(container.dispose);

    final events = await container.read(eventsProvider.future);

    expect(events.map((e) => e.id), ['e1', 'e2']);
  });

  test('eventsProvider throws when the GraphQL client reports an exception', () async {
    final client = MockGraphQLClient();
    when(() => client.query(any())).thenAnswer(
      (_) async => _result(
        exception: OperationException(linkException: const ServerException()),
      ),
    );

    final container = ProviderContainer(
      // Riverpod retries a failed FutureProvider with exponential backoff by
      // default — disable that so the error surfaces immediately in the test.
      retry: (_, _) => null,
      overrides: [graphQLClientProvider.overrideWithValue(client)],
    );
    addTearDown(container.dispose);

    await expectLater(
      container.read(eventsProvider.future),
      throwsA(isA<OperationException>()),
    );
  });
}
