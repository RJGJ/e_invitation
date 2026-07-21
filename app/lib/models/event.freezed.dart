// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'event.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$Event {

 String get id;@JsonKey(name: 'author', fromJson: _authorIdFromJson, toJson: _authorIdToJson) String? get authorId; String get title; String? get description; EventType get type; DateTime get startDate; DateTime? get endDate; String get timezone; String? get venueName; String? get address; double? get latitude; double? get longitude; Media? get coverImage; List<Media> get gallery; bool get allowPlusOne; DateTime? get rsvpDeadline; bool get requireApproval; String? get primaryColor; String? get secondaryColor; String? get fontFamily; DateTime get createdAt; DateTime get updatedAt;
/// Create a copy of Event
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EventCopyWith<Event> get copyWith => _$EventCopyWithImpl<Event>(this as Event, _$identity);

  /// Serializes this Event to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Event&&(identical(other.id, id) || other.id == id)&&(identical(other.authorId, authorId) || other.authorId == authorId)&&(identical(other.title, title) || other.title == title)&&(identical(other.description, description) || other.description == description)&&(identical(other.type, type) || other.type == type)&&(identical(other.startDate, startDate) || other.startDate == startDate)&&(identical(other.endDate, endDate) || other.endDate == endDate)&&(identical(other.timezone, timezone) || other.timezone == timezone)&&(identical(other.venueName, venueName) || other.venueName == venueName)&&(identical(other.address, address) || other.address == address)&&(identical(other.latitude, latitude) || other.latitude == latitude)&&(identical(other.longitude, longitude) || other.longitude == longitude)&&(identical(other.coverImage, coverImage) || other.coverImage == coverImage)&&const DeepCollectionEquality().equals(other.gallery, gallery)&&(identical(other.allowPlusOne, allowPlusOne) || other.allowPlusOne == allowPlusOne)&&(identical(other.rsvpDeadline, rsvpDeadline) || other.rsvpDeadline == rsvpDeadline)&&(identical(other.requireApproval, requireApproval) || other.requireApproval == requireApproval)&&(identical(other.primaryColor, primaryColor) || other.primaryColor == primaryColor)&&(identical(other.secondaryColor, secondaryColor) || other.secondaryColor == secondaryColor)&&(identical(other.fontFamily, fontFamily) || other.fontFamily == fontFamily)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,authorId,title,description,type,startDate,endDate,timezone,venueName,address,latitude,longitude,coverImage,const DeepCollectionEquality().hash(gallery),allowPlusOne,rsvpDeadline,requireApproval,primaryColor,secondaryColor,fontFamily,createdAt,updatedAt]);

@override
String toString() {
  return 'Event(id: $id, authorId: $authorId, title: $title, description: $description, type: $type, startDate: $startDate, endDate: $endDate, timezone: $timezone, venueName: $venueName, address: $address, latitude: $latitude, longitude: $longitude, coverImage: $coverImage, gallery: $gallery, allowPlusOne: $allowPlusOne, rsvpDeadline: $rsvpDeadline, requireApproval: $requireApproval, primaryColor: $primaryColor, secondaryColor: $secondaryColor, fontFamily: $fontFamily, createdAt: $createdAt, updatedAt: $updatedAt)';
}


}

/// @nodoc
abstract mixin class $EventCopyWith<$Res>  {
  factory $EventCopyWith(Event value, $Res Function(Event) _then) = _$EventCopyWithImpl;
@useResult
$Res call({
 String id,@JsonKey(name: 'author', fromJson: _authorIdFromJson, toJson: _authorIdToJson) String? authorId, String title, String? description, EventType type, DateTime startDate, DateTime? endDate, String timezone, String? venueName, String? address, double? latitude, double? longitude, Media? coverImage, List<Media> gallery, bool allowPlusOne, DateTime? rsvpDeadline, bool requireApproval, String? primaryColor, String? secondaryColor, String? fontFamily, DateTime createdAt, DateTime updatedAt
});


$MediaCopyWith<$Res>? get coverImage;

}
/// @nodoc
class _$EventCopyWithImpl<$Res>
    implements $EventCopyWith<$Res> {
  _$EventCopyWithImpl(this._self, this._then);

  final Event _self;
  final $Res Function(Event) _then;

/// Create a copy of Event
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? authorId = freezed,Object? title = null,Object? description = freezed,Object? type = null,Object? startDate = null,Object? endDate = freezed,Object? timezone = null,Object? venueName = freezed,Object? address = freezed,Object? latitude = freezed,Object? longitude = freezed,Object? coverImage = freezed,Object? gallery = null,Object? allowPlusOne = null,Object? rsvpDeadline = freezed,Object? requireApproval = null,Object? primaryColor = freezed,Object? secondaryColor = freezed,Object? fontFamily = freezed,Object? createdAt = null,Object? updatedAt = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,authorId: freezed == authorId ? _self.authorId : authorId // ignore: cast_nullable_to_non_nullable
as String?,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,description: freezed == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String?,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as EventType,startDate: null == startDate ? _self.startDate : startDate // ignore: cast_nullable_to_non_nullable
as DateTime,endDate: freezed == endDate ? _self.endDate : endDate // ignore: cast_nullable_to_non_nullable
as DateTime?,timezone: null == timezone ? _self.timezone : timezone // ignore: cast_nullable_to_non_nullable
as String,venueName: freezed == venueName ? _self.venueName : venueName // ignore: cast_nullable_to_non_nullable
as String?,address: freezed == address ? _self.address : address // ignore: cast_nullable_to_non_nullable
as String?,latitude: freezed == latitude ? _self.latitude : latitude // ignore: cast_nullable_to_non_nullable
as double?,longitude: freezed == longitude ? _self.longitude : longitude // ignore: cast_nullable_to_non_nullable
as double?,coverImage: freezed == coverImage ? _self.coverImage : coverImage // ignore: cast_nullable_to_non_nullable
as Media?,gallery: null == gallery ? _self.gallery : gallery // ignore: cast_nullable_to_non_nullable
as List<Media>,allowPlusOne: null == allowPlusOne ? _self.allowPlusOne : allowPlusOne // ignore: cast_nullable_to_non_nullable
as bool,rsvpDeadline: freezed == rsvpDeadline ? _self.rsvpDeadline : rsvpDeadline // ignore: cast_nullable_to_non_nullable
as DateTime?,requireApproval: null == requireApproval ? _self.requireApproval : requireApproval // ignore: cast_nullable_to_non_nullable
as bool,primaryColor: freezed == primaryColor ? _self.primaryColor : primaryColor // ignore: cast_nullable_to_non_nullable
as String?,secondaryColor: freezed == secondaryColor ? _self.secondaryColor : secondaryColor // ignore: cast_nullable_to_non_nullable
as String?,fontFamily: freezed == fontFamily ? _self.fontFamily : fontFamily // ignore: cast_nullable_to_non_nullable
as String?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}
/// Create a copy of Event
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$MediaCopyWith<$Res>? get coverImage {
    if (_self.coverImage == null) {
    return null;
  }

  return $MediaCopyWith<$Res>(_self.coverImage!, (value) {
    return _then(_self.copyWith(coverImage: value));
  });
}
}


/// Adds pattern-matching-related methods to [Event].
extension EventPatterns on Event {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Event value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Event() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Event value)  $default,){
final _that = this;
switch (_that) {
case _Event():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Event value)?  $default,){
final _that = this;
switch (_that) {
case _Event() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id, @JsonKey(name: 'author', fromJson: _authorIdFromJson, toJson: _authorIdToJson)  String? authorId,  String title,  String? description,  EventType type,  DateTime startDate,  DateTime? endDate,  String timezone,  String? venueName,  String? address,  double? latitude,  double? longitude,  Media? coverImage,  List<Media> gallery,  bool allowPlusOne,  DateTime? rsvpDeadline,  bool requireApproval,  String? primaryColor,  String? secondaryColor,  String? fontFamily,  DateTime createdAt,  DateTime updatedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Event() when $default != null:
return $default(_that.id,_that.authorId,_that.title,_that.description,_that.type,_that.startDate,_that.endDate,_that.timezone,_that.venueName,_that.address,_that.latitude,_that.longitude,_that.coverImage,_that.gallery,_that.allowPlusOne,_that.rsvpDeadline,_that.requireApproval,_that.primaryColor,_that.secondaryColor,_that.fontFamily,_that.createdAt,_that.updatedAt);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id, @JsonKey(name: 'author', fromJson: _authorIdFromJson, toJson: _authorIdToJson)  String? authorId,  String title,  String? description,  EventType type,  DateTime startDate,  DateTime? endDate,  String timezone,  String? venueName,  String? address,  double? latitude,  double? longitude,  Media? coverImage,  List<Media> gallery,  bool allowPlusOne,  DateTime? rsvpDeadline,  bool requireApproval,  String? primaryColor,  String? secondaryColor,  String? fontFamily,  DateTime createdAt,  DateTime updatedAt)  $default,) {final _that = this;
switch (_that) {
case _Event():
return $default(_that.id,_that.authorId,_that.title,_that.description,_that.type,_that.startDate,_that.endDate,_that.timezone,_that.venueName,_that.address,_that.latitude,_that.longitude,_that.coverImage,_that.gallery,_that.allowPlusOne,_that.rsvpDeadline,_that.requireApproval,_that.primaryColor,_that.secondaryColor,_that.fontFamily,_that.createdAt,_that.updatedAt);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id, @JsonKey(name: 'author', fromJson: _authorIdFromJson, toJson: _authorIdToJson)  String? authorId,  String title,  String? description,  EventType type,  DateTime startDate,  DateTime? endDate,  String timezone,  String? venueName,  String? address,  double? latitude,  double? longitude,  Media? coverImage,  List<Media> gallery,  bool allowPlusOne,  DateTime? rsvpDeadline,  bool requireApproval,  String? primaryColor,  String? secondaryColor,  String? fontFamily,  DateTime createdAt,  DateTime updatedAt)?  $default,) {final _that = this;
switch (_that) {
case _Event() when $default != null:
return $default(_that.id,_that.authorId,_that.title,_that.description,_that.type,_that.startDate,_that.endDate,_that.timezone,_that.venueName,_that.address,_that.latitude,_that.longitude,_that.coverImage,_that.gallery,_that.allowPlusOne,_that.rsvpDeadline,_that.requireApproval,_that.primaryColor,_that.secondaryColor,_that.fontFamily,_that.createdAt,_that.updatedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Event implements Event {
  const _Event({required this.id, @JsonKey(name: 'author', fromJson: _authorIdFromJson, toJson: _authorIdToJson) this.authorId, required this.title, this.description, required this.type, required this.startDate, this.endDate, required this.timezone, this.venueName, this.address, this.latitude, this.longitude, this.coverImage, final  List<Media> gallery = const [], required this.allowPlusOne, this.rsvpDeadline, required this.requireApproval, this.primaryColor, this.secondaryColor, this.fontFamily, required this.createdAt, required this.updatedAt}): _gallery = gallery;
  factory _Event.fromJson(Map<String, dynamic> json) => _$EventFromJson(json);

@override final  String id;
@override@JsonKey(name: 'author', fromJson: _authorIdFromJson, toJson: _authorIdToJson) final  String? authorId;
@override final  String title;
@override final  String? description;
@override final  EventType type;
@override final  DateTime startDate;
@override final  DateTime? endDate;
@override final  String timezone;
@override final  String? venueName;
@override final  String? address;
@override final  double? latitude;
@override final  double? longitude;
@override final  Media? coverImage;
 final  List<Media> _gallery;
@override@JsonKey() List<Media> get gallery {
  if (_gallery is EqualUnmodifiableListView) return _gallery;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_gallery);
}

@override final  bool allowPlusOne;
@override final  DateTime? rsvpDeadline;
@override final  bool requireApproval;
@override final  String? primaryColor;
@override final  String? secondaryColor;
@override final  String? fontFamily;
@override final  DateTime createdAt;
@override final  DateTime updatedAt;

/// Create a copy of Event
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$EventCopyWith<_Event> get copyWith => __$EventCopyWithImpl<_Event>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$EventToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Event&&(identical(other.id, id) || other.id == id)&&(identical(other.authorId, authorId) || other.authorId == authorId)&&(identical(other.title, title) || other.title == title)&&(identical(other.description, description) || other.description == description)&&(identical(other.type, type) || other.type == type)&&(identical(other.startDate, startDate) || other.startDate == startDate)&&(identical(other.endDate, endDate) || other.endDate == endDate)&&(identical(other.timezone, timezone) || other.timezone == timezone)&&(identical(other.venueName, venueName) || other.venueName == venueName)&&(identical(other.address, address) || other.address == address)&&(identical(other.latitude, latitude) || other.latitude == latitude)&&(identical(other.longitude, longitude) || other.longitude == longitude)&&(identical(other.coverImage, coverImage) || other.coverImage == coverImage)&&const DeepCollectionEquality().equals(other._gallery, _gallery)&&(identical(other.allowPlusOne, allowPlusOne) || other.allowPlusOne == allowPlusOne)&&(identical(other.rsvpDeadline, rsvpDeadline) || other.rsvpDeadline == rsvpDeadline)&&(identical(other.requireApproval, requireApproval) || other.requireApproval == requireApproval)&&(identical(other.primaryColor, primaryColor) || other.primaryColor == primaryColor)&&(identical(other.secondaryColor, secondaryColor) || other.secondaryColor == secondaryColor)&&(identical(other.fontFamily, fontFamily) || other.fontFamily == fontFamily)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,authorId,title,description,type,startDate,endDate,timezone,venueName,address,latitude,longitude,coverImage,const DeepCollectionEquality().hash(_gallery),allowPlusOne,rsvpDeadline,requireApproval,primaryColor,secondaryColor,fontFamily,createdAt,updatedAt]);

@override
String toString() {
  return 'Event(id: $id, authorId: $authorId, title: $title, description: $description, type: $type, startDate: $startDate, endDate: $endDate, timezone: $timezone, venueName: $venueName, address: $address, latitude: $latitude, longitude: $longitude, coverImage: $coverImage, gallery: $gallery, allowPlusOne: $allowPlusOne, rsvpDeadline: $rsvpDeadline, requireApproval: $requireApproval, primaryColor: $primaryColor, secondaryColor: $secondaryColor, fontFamily: $fontFamily, createdAt: $createdAt, updatedAt: $updatedAt)';
}


}

/// @nodoc
abstract mixin class _$EventCopyWith<$Res> implements $EventCopyWith<$Res> {
  factory _$EventCopyWith(_Event value, $Res Function(_Event) _then) = __$EventCopyWithImpl;
@override @useResult
$Res call({
 String id,@JsonKey(name: 'author', fromJson: _authorIdFromJson, toJson: _authorIdToJson) String? authorId, String title, String? description, EventType type, DateTime startDate, DateTime? endDate, String timezone, String? venueName, String? address, double? latitude, double? longitude, Media? coverImage, List<Media> gallery, bool allowPlusOne, DateTime? rsvpDeadline, bool requireApproval, String? primaryColor, String? secondaryColor, String? fontFamily, DateTime createdAt, DateTime updatedAt
});


@override $MediaCopyWith<$Res>? get coverImage;

}
/// @nodoc
class __$EventCopyWithImpl<$Res>
    implements _$EventCopyWith<$Res> {
  __$EventCopyWithImpl(this._self, this._then);

  final _Event _self;
  final $Res Function(_Event) _then;

/// Create a copy of Event
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? authorId = freezed,Object? title = null,Object? description = freezed,Object? type = null,Object? startDate = null,Object? endDate = freezed,Object? timezone = null,Object? venueName = freezed,Object? address = freezed,Object? latitude = freezed,Object? longitude = freezed,Object? coverImage = freezed,Object? gallery = null,Object? allowPlusOne = null,Object? rsvpDeadline = freezed,Object? requireApproval = null,Object? primaryColor = freezed,Object? secondaryColor = freezed,Object? fontFamily = freezed,Object? createdAt = null,Object? updatedAt = null,}) {
  return _then(_Event(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,authorId: freezed == authorId ? _self.authorId : authorId // ignore: cast_nullable_to_non_nullable
as String?,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,description: freezed == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String?,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as EventType,startDate: null == startDate ? _self.startDate : startDate // ignore: cast_nullable_to_non_nullable
as DateTime,endDate: freezed == endDate ? _self.endDate : endDate // ignore: cast_nullable_to_non_nullable
as DateTime?,timezone: null == timezone ? _self.timezone : timezone // ignore: cast_nullable_to_non_nullable
as String,venueName: freezed == venueName ? _self.venueName : venueName // ignore: cast_nullable_to_non_nullable
as String?,address: freezed == address ? _self.address : address // ignore: cast_nullable_to_non_nullable
as String?,latitude: freezed == latitude ? _self.latitude : latitude // ignore: cast_nullable_to_non_nullable
as double?,longitude: freezed == longitude ? _self.longitude : longitude // ignore: cast_nullable_to_non_nullable
as double?,coverImage: freezed == coverImage ? _self.coverImage : coverImage // ignore: cast_nullable_to_non_nullable
as Media?,gallery: null == gallery ? _self._gallery : gallery // ignore: cast_nullable_to_non_nullable
as List<Media>,allowPlusOne: null == allowPlusOne ? _self.allowPlusOne : allowPlusOne // ignore: cast_nullable_to_non_nullable
as bool,rsvpDeadline: freezed == rsvpDeadline ? _self.rsvpDeadline : rsvpDeadline // ignore: cast_nullable_to_non_nullable
as DateTime?,requireApproval: null == requireApproval ? _self.requireApproval : requireApproval // ignore: cast_nullable_to_non_nullable
as bool,primaryColor: freezed == primaryColor ? _self.primaryColor : primaryColor // ignore: cast_nullable_to_non_nullable
as String?,secondaryColor: freezed == secondaryColor ? _self.secondaryColor : secondaryColor // ignore: cast_nullable_to_non_nullable
as String?,fontFamily: freezed == fontFamily ? _self.fontFamily : fontFamily // ignore: cast_nullable_to_non_nullable
as String?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}

/// Create a copy of Event
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$MediaCopyWith<$Res>? get coverImage {
    if (_self.coverImage == null) {
    return null;
  }

  return $MediaCopyWith<$Res>(_self.coverImage!, (value) {
    return _then(_self.copyWith(coverImage: value));
  });
}
}

// dart format on
