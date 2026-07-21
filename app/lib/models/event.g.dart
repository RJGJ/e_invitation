// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_Event _$EventFromJson(Map<String, dynamic> json) => _Event(
  id: json['id'] as String,
  authorId: _authorIdFromJson(json['author'] as Map<String, dynamic>?),
  title: json['title'] as String,
  description: json['description'] as String?,
  type: $enumDecode(_$EventTypeEnumMap, json['type']),
  startDate: DateTime.parse(json['startDate'] as String),
  endDate: json['endDate'] == null
      ? null
      : DateTime.parse(json['endDate'] as String),
  timezone: json['timezone'] as String,
  venueName: json['venueName'] as String?,
  address: json['address'] as String?,
  latitude: (json['latitude'] as num?)?.toDouble(),
  longitude: (json['longitude'] as num?)?.toDouble(),
  coverImage: json['coverImage'] == null
      ? null
      : Media.fromJson(json['coverImage'] as Map<String, dynamic>),
  gallery:
      (json['gallery'] as List<dynamic>?)
          ?.map((e) => Media.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const [],
  allowPlusOne: json['allowPlusOne'] as bool,
  rsvpDeadline: json['rsvpDeadline'] == null
      ? null
      : DateTime.parse(json['rsvpDeadline'] as String),
  requireApproval: json['requireApproval'] as bool,
  primaryColor: json['primaryColor'] as String?,
  secondaryColor: json['secondaryColor'] as String?,
  fontFamily: json['fontFamily'] as String?,
  createdAt: DateTime.parse(json['createdAt'] as String),
  updatedAt: DateTime.parse(json['updatedAt'] as String),
);

Map<String, dynamic> _$EventToJson(_Event instance) => <String, dynamic>{
  'id': instance.id,
  'author': _authorIdToJson(instance.authorId),
  'title': instance.title,
  'description': instance.description,
  'type': _$EventTypeEnumMap[instance.type]!,
  'startDate': instance.startDate.toIso8601String(),
  'endDate': instance.endDate?.toIso8601String(),
  'timezone': instance.timezone,
  'venueName': instance.venueName,
  'address': instance.address,
  'latitude': instance.latitude,
  'longitude': instance.longitude,
  'coverImage': instance.coverImage?.toJson(),
  'gallery': instance.gallery.map((e) => e.toJson()).toList(),
  'allowPlusOne': instance.allowPlusOne,
  'rsvpDeadline': instance.rsvpDeadline?.toIso8601String(),
  'requireApproval': instance.requireApproval,
  'primaryColor': instance.primaryColor,
  'secondaryColor': instance.secondaryColor,
  'fontFamily': instance.fontFamily,
  'createdAt': instance.createdAt.toIso8601String(),
  'updatedAt': instance.updatedAt.toIso8601String(),
};

const _$EventTypeEnumMap = {
  EventType.wedding: 'wedding',
  EventType.birthday: 'birthday',
  EventType.baptism: 'baptism',
};
