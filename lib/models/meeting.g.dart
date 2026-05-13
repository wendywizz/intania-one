// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'meeting.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Meeting _$MeetingFromJson(Map<String, dynamic> json) => Meeting(
      id: json['id'] as String,
      name: json['name'] as String,
      status: json['status'] as String?,
      userId: json['userId'] as String,
      position: json['position'] as String?,
      startDate: DateTime.parse(json['startDate'] as String),
      room: json['room'] as String,
    );

Map<String, dynamic> _$MeetingToJson(Meeting instance) => <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'status': instance.status,
      'userId': instance.userId,
      'position': instance.position,
      'startDate': instance.startDate.toIso8601String(),
      'room': instance.room,
    };
