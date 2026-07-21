// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'media.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_Media _$MediaFromJson(Map<String, dynamic> json) => _Media(
  id: json['id'] as String,
  image: MediaImage.fromJson(json['image'] as Map<String, dynamic>),
  uploadedById: json['uploadedById'] as String?,
  createdAt: DateTime.parse(json['createdAt'] as String),
);

Map<String, dynamic> _$MediaToJson(_Media instance) => <String, dynamic>{
  'id': instance.id,
  'image': instance.image.toJson(),
  'uploadedById': instance.uploadedById,
  'createdAt': instance.createdAt.toIso8601String(),
};

_MediaImage _$MediaImageFromJson(Map<String, dynamic> json) => _MediaImage(
  url: json['url'] as String,
  width: (json['width'] as num).toInt(),
  height: (json['height'] as num).toInt(),
  filesize: (json['filesize'] as num).toInt(),
  extension: json['extension'] as String,
);

Map<String, dynamic> _$MediaImageToJson(_MediaImage instance) =>
    <String, dynamic>{
      'url': instance.url,
      'width': instance.width,
      'height': instance.height,
      'filesize': instance.filesize,
      'extension': instance.extension,
    };
