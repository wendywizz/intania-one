import 'package:json_annotation/json_annotation.dart';

part 'study_class.g.dart';

@JsonSerializable()
class StudyClass {
  final String subjectKey;
  final String subjectID;
  final String subjectName;
  final DateTime startTime;
  final DateTime endTime;

  const StudyClass({
    required this.subjectKey,
    required this.subjectID,
    required this.subjectName,
    required this.startTime,
    required this.endTime,
  });

  factory StudyClass.fromJson(Map<String, dynamic> json) =>
      _$StudyClassFromJson(json);

  Map<String, dynamic> toJson() => _$StudyClassToJson(this);
}
