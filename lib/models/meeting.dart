import 'package:json_annotation/json_annotation.dart';

part 'meeting.g.dart';

@JsonSerializable()
class Meeting {
  final String id;
  final String name;
  final String? status;
  final String userId;
  final String? position;
  final DateTime startDate;
  final String room;

  Meeting({
    required this.id,
    required this.name,
    this.status,
    required this.userId,
    this.position,
    required this.startDate,
    required this.room,
  });

  factory Meeting.fromJson(Map<String, dynamic> json) =>
      _$MeetingFromJson(json);

  Map<String, dynamic> toJson() => _$MeetingToJson(this);
}
