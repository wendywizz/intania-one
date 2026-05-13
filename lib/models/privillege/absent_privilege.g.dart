// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'absent_privilege.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

AbsentPrivilege _$AbsentPrivilegeFromJson(Map<String, dynamic> json) =>
    AbsentPrivilege(
      staffId: json['staffId'] as String,
      staffType: json['staffType'] as String,
      isHeadman: json['isHeadman'] as bool? ?? false,
    );

Map<String, dynamic> _$AbsentPrivilegeToJson(AbsentPrivilege instance) =>
    <String, dynamic>{
      'staffId': instance.staffId,
      'staffType': instance.staffType,
      'isHeadman': instance.isHeadman,
    };
