import 'package:e_invitation/models/media.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Media.fromJson/toJson round-trips against a realistic API response', () {
    final json = {
      'id': 'm1',
      'image': {
        'url': 'https://cdn.example.com/photo.jpg',
        'width': 800,
        'height': 600,
        'filesize': 123456,
        'extension': 'jpg',
      },
      'uploadedById': 'u1',
      'createdAt': '2026-01-01T00:00:00.000Z',
    };

    final media = Media.fromJson(json);

    expect(media.id, 'm1');
    expect(media.image, const MediaImage(
      url: 'https://cdn.example.com/photo.jpg',
      width: 800,
      height: 600,
      filesize: 123456,
      extension: 'jpg',
    ));
    expect(media.uploadedById, 'u1');
    expect(media.createdAt, DateTime.parse('2026-01-01T00:00:00.000Z'));

    expect(Media.fromJson(media.toJson()), media);
  });

  test('Media.fromJson handles a null uploadedById', () {
    final media = Media.fromJson({
      'id': 'm1',
      'image': {
        'url': 'https://cdn.example.com/photo.jpg',
        'width': 800,
        'height': 600,
        'filesize': 123456,
        'extension': 'jpg',
      },
      'uploadedById': null,
      'createdAt': '2026-01-01T00:00:00.000Z',
    });

    expect(media.uploadedById, isNull);
  });
}
