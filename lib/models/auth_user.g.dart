// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'auth_user.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

AuthUser _$AuthUserFromJson(Map<String, dynamic> json) {
  return AuthUser(
    username: json['username'] as String,
    firstName: json['first_name'] as String,
    lastName: json['last_name'] as String,
    staffId: json['staff_id'] as String,
    email: json['email'] as String,
    campusId: json['campus_id'] as String,
    facultyId: json['fac_id'] as String,
    departmentId: json['dept_id'] as String,
    positionId: json['pos_id'] as String,
  );
}

Map<String, dynamic> _$AuthUserToJson(AuthUser instance) => <String, dynamic>{
      'username': instance.username,
      'firstName': instance.firstName,
      'lastName': instance.lastName,
      'staffId': instance.staffId,
      'email': instance.email,
      'campusId': instance.campusId,
      'facultyId': instance.facultyId,
      'departmentId': instance.departmentId,
      'positionId': instance.positionId,
    };
