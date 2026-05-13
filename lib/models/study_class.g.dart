// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'study_class.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

StudyClass _$StudyClassFromJson(Map<String, dynamic> json) => StudyClass(
      subjectKey: json['subjectKey'] as String,
      subjectID: json['subjectID'] as String,
      subjectName: json['subjectName'] as String,
      startTime: DateTime.parse(json['startTime'] as String),
      endTime: DateTime.parse(json['endTime'] as String),
    );

Map<String, dynamic> _$StudyClassToJson(StudyClass instance) =>
    <String, dynamic>{
      'subjectKey': instance.subjectKey,
      'subjectID': instance.subjectID,
      'subjectName': instance.subjectName,
      'startTime': instance.startTime.toIso8601String(),
      'endTime': instance.endTime.toIso8601String(),
    };
