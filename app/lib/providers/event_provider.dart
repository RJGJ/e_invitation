import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:graphql_flutter/graphql_flutter.dart';

import '../models/event.dart';
import '../services/graphql_client.dart';

const _getEventsQuery = r'''
  query GetEvents {
    events {
      id
      author { id }
      title
      description
      type
      startDate
      endDate
      timezone
      venueName
      address
      latitude
      longitude
      coverImage { id image { url width height filesize extension } }
      gallery { id image { url width height filesize extension } }
      allowPlusOne
      rsvpDeadline
      requireApproval
      primaryColor
      secondaryColor
      fontFamily
      createdAt
      updatedAt
    }
  }
''';

final eventsProvider = FutureProvider<List<Event>>((ref) async {
  final client = ref.read(graphQLClientProvider);
  final result = await client.query(QueryOptions(document: gql(_getEventsQuery)));
  if (result.hasException) throw result.exception!;

  final eventsJson = result.data!['events'] as List<dynamic>;
  return eventsJson
      .map((e) => Event.fromJson(e as Map<String, dynamic>))
      .toList();
});
