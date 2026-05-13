// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'absent_approve.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

AbsentApprove _$AbsentApproveFromJson(Map<String, dynamic> json) {
  return AbsentApprove(
    id: json['id'] as String?,
    approveId: json['approveId'] as String?,
    absenceId: json['absenceId'] as String?,
    forgetId: json['forgetId'] as String?,
    name: json['name'] as String?,
    deptName: json['deptName'] as String?,
    absenceType: json['absenceType'] as String?,
    approveName: json['approveName'] as String?,
    approverPosition: json['approverPosition'] as String?,
    writeDate: json['writeDate'] == null
        ? null
        : DateTime.parse(json['writeDate'] as String),
    startDate: json['startDate'] == null
        ? null
        : DateTime.parse(json['startDate'] as String),
    endDate: json['endDate'] == null
        ? null
        : DateTime.parse(json['endDate'] as String),
    inTime: json['inTime'] as String?,
    outTime: json['outTime'] as String?,
    reason: json['reason'] as String?,
    contact: json['contact'] as String?,
    agentList: json['agentList'] as String?,
    type: json['type'] as String?,
    progress: json['progress'] as String?,
    absentHistory: (json['absentHistory'] as List<dynamic>?)?.map((e) {
      return Absent.fromJson(e);
    }).toList(),
  );
}

Map<String, dynamic> _$AbsentApproveToJson(AbsentApprove instance) =>
    <String, dynamic>{
      'id': instance.id,
      'approveId': instance.approveId,
      'absenceId': instance.absenceId,
      'forgetId': instance.forgetId,
      'name': instance.name,
      'deptName': instance.deptName,
      'absenceType': instance.absenceType,
      'approveName': instance.approveName,
      'approverPosition': instance.approverPosition,
      'writeDate': instance.writeDate?.toIso8601String(),
      'startDate': instance.startDate?.toIso8601String(),
      'endDate': instance.endDate?.toIso8601String(),
      'inTime': instance.inTime,
      'outTime': instance.outTime,
      'reason': instance.reason,
      'contact': instance.contact,
      'agentList': instance.agentList,
      'type': instance.type,
      'progress': instance.progress,
      'absentHistory': instance.absentHistory,
    };
