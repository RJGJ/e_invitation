import 'package:freezed_annotation/freezed_annotation.dart';

import 'media.dart';

part 'event.freezed.dart';
part 'event.g.dart';

enum EventType {
  @JsonValue('wedding')
  wedding,
  @JsonValue('birthday')
  birthday,
  @JsonValue('baptism')
  baptism,
}

String? _authorIdFromJson(Map<String, dynamic>? author) => author?['id'] as String?;
Map<String, dynamic>? _authorIdToJson(String? authorId) =>
    authorId == null ? null : {'id': authorId};

@freezed
abstract class Event with _$Event {
  const factory Event({
    required String id,
    // The GraphQL query only selects `author { id }` (see event_provider.dart),
    // so this maps that nested shape to a flat id — no full User is fetched.
    @JsonKey(name: 'author', fromJson: _authorIdFromJson, toJson: _authorIdToJson)
    String? authorId,
    required String title,
    String? description,
    required EventType type,
    required DateTime startDate,
    DateTime? endDate,
    required String timezone,
    String? venueName,
    String? address,
    double? latitude,
    double? longitude,
    Media? coverImage,
    @Default([]) List<Media> gallery,
    required bool allowPlusOne,
    DateTime? rsvpDeadline,
    required bool requireApproval,
    String? primaryColor,
    String? secondaryColor,
    String? fontFamily,
    required DateTime createdAt,
    required DateTime updatedAt,
  }) = _Event;

  factory Event.fromJson(Map<String, dynamic> json) => _$EventFromJson(json);
}
