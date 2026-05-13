// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'absent.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Absent _$AbsentFromJson(Map<String, dynamic> json) => Absent(
      id: json['id'] as String?,
      absentTime: json['absentTime'] as String?,
      absentType: json['absentType'] as String?,
      absentTypeName: json['absentTypeName'] as String?,
      progressType: json['progressType'] as String?,
      progressTypeName: json['progressTypeName'] as String?,
      staffId: json['staffId'] as String,
      name: json['name'] as String?,
      position: json['position'] as String?,
      deptId: json['deptId'] as String?,
      deptName: json['deptName'] as String?,
      step: json['step'] as String?,
      status: json['status'] as String?,
      writeDate: DateTime.parse(json['writeDate'] as String),
      partFlag: json['partFlag'] as String?,
      startDate: json['startDate'] == null
          ? null
          : DateTime.parse(json['startDate'] as String),
      endDate: json['endDate'] == null
          ? null
          : DateTime.parse(json['endDate'] as String),
      absentDays: json['absentDays'] as num?,
      contact: json['contact'] as String?,
      reason: json['reason'] as String?,
      travelDetail: json['travelDetail'] as String?,
      approverPosition: json['approverPosition'] as String?,
      approverList: (json['approverList'] as List<dynamic>?)
          ?.map((e) => Person.fromJson(e as Map<String, dynamic>))
          .toList(),
      agentList: (json['agentList'] as List<dynamic>?)
          ?.map((e) => Person.fromJson(e as Map<String, dynamic>))
          .toList(),
      selectedAgents: (json['selectedAgents'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
      mainApprover: json['mainApprover'] == null
          ? null
          : Person.fromJson(json['mainApprover'] as Map<String, dynamic>),
      subApprover: (json['subApprover'] as List<dynamic>?)
          ?.map((e) => Person.fromJson(e as Map<String, dynamic>))
          .toList(),
      beginYear: json['beginYear'] as String?,
      beginStartDate: json['beginStartDate'] as String?,
      beginEndDate: json['beginEndDate'] as String?,
      relaxTotal: (json['relaxTotal'] as num?)?.toInt(),
      relaxRemain: (json['relaxRemain'] as num?)?.toInt(),
      relaxUsed: (json['relaxUsed'] as num?)?.toInt(),
      fileUpload: json['fileUpload'] as String?,
      fileUploadLink: json['fileUploadLink'] as String?,
    );

Map<String, dynamic> _$AbsentToJson(Absent instance) => <String, dynamic>{
      'id': instance.id,
      'absentTime': instance.absentTime,
      'absentType': instance.absentType,
      'absentTypeName': instance.absentTypeName,
      'progressType': instance.progressType,
      'progressTypeName': instance.progressTypeName,
      'staffId': instance.staffId,
      'name': instance.name,
      'position': instance.position,
      'deptId': instance.deptId,
      'deptName': instance.deptName,
      'step': instance.step,
      'status': instance.status,
      'writeDate': instance.writeDate.toIso8601String(),
      'startDate': instance.startDate?.toIso8601String(),
      'endDate': instance.endDate?.toIso8601String(),
      'partFlag': instance.partFlag,
      'absentDays': instance.absentDays,
      'contact': instance.contact,
      'reason': instance.reason,
      'travelDetail': instance.travelDetail,
      'approverPosition': instance.approverPosition,
      'approverList': instance.approverList,
      'agentList': instance.agentList,
      'selectedAgents': instance.selectedAgents,
      'mainApprover': instance.mainApprover,
      'subApprover': instance.subApprover,
      'beginYear': instance.beginYear,
      'beginStartDate': instance.beginStartDate,
      'beginEndDate': instance.beginEndDate,
      'relaxTotal': instance.relaxTotal,
      'relaxRemain': instance.relaxRemain,
      'relaxUsed': instance.relaxUsed,
      'fileUpload': instance.fileUpload,
      'fileUploadLink': instance.fileUploadLink,
    };
