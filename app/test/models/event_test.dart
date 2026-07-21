import 'package:e_invitation/models/event.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, dynamic> _mediaJson(String id) => {
      'id': id,
      'image': {
        'url': 'https://cdn.example.com/$id.jpg',
        'width': 800,
        'height': 600,
        'filesize': 100,
        'extension': 'jpg',
      },
      'uploadedById': null,
      'createdAt': '2026-01-01T00:00:00.000Z',
    };

void main() {
  test('Event.fromJson/toJson round-trips, including type enum and nested author id', () {
    final json = {
      'id': 'e1',
      'author': {'id': 'u1'},
      'title': 'Elena & Mateo',
      'description': null,
      'type': 'wedding',
      'startDate': '2026-02-14T00:00:00.000Z',
      'endDate': null,
      'timezone': 'Asia/Manila',
      'venueName': 'Casa Mariposa',
      'address': null,
      'latitude': null,
      'longitude': null,
      'coverImage': _mediaJson('cover-1'),
      'gallery': [_mediaJson('g1'), _mediaJson('g2')],
      'allowPlusOne': false,
      'rsvpDeadline': null,
      'requireApproval': false,
      'primaryColor': null,
      'secondaryColor': null,
      'fontFamily': null,
      'createdAt': '2026-01-01T00:00:00.000Z',
      'updatedAt': '2026-01-01T00:00:00.000Z',
    };

    final event = Event.fromJson(json);

    expect(event.id, 'e1');
    expect(event.authorId, 'u1');
    expect(event.type, EventType.wedding);
    expect(event.coverImage?.id, 'cover-1');
    expect(event.gallery.map((m) => m.id), ['g1', 'g2']);
    expect(event.allowPlusOne, false);

    // toJson re-nests authorId back under `author: { id }`.
    final roundTripped = event.toJson();
    expect(roundTripped['author'], {'id': 'u1'});
  });

  test('Event.fromJson handles nullable fields and an empty gallery', () {
    final event = Event.fromJson({
      'id': 'e1',
      'author': null,
      'title': 'Untitled',
      'description': null,
      'type': 'baptism',
      'startDate': '2026-03-08T00:00:00.000Z',
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
    });

    expect(event.authorId, isNull);
    expect(event.coverImage, isNull);
    expect(event.gallery, isEmpty);
    expect(event.type, EventType.baptism);
  });
}
