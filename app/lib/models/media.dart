import 'package:freezed_annotation/freezed_annotation.dart';

part 'media.freezed.dart';
part 'media.g.dart';

@freezed
abstract class Media with _$Media {
  const factory Media({
    required String id,
    required MediaImage image,
    String? uploadedById,
    required DateTime createdAt,
  }) = _Media;

  factory Media.fromJson(Map<String, dynamic> json) => _$MediaFromJson(json);
}

@freezed
abstract class MediaImage with _$MediaImage {
  const factory MediaImage({
    required String url,
    required int width,
    required int height,
    required int filesize,
    required String extension,
  }) = _MediaImage;

  factory MediaImage.fromJson(Map<String, dynamic> json) => _$MediaImageFromJson(json);
}
