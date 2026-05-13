// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'auth_roles.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

AuthRole _$AuthRoleFromJson(Map<String, dynamic> json) => AuthRole(
      id: (json['id'] as num).toInt(),
      name: json['name'] as String,
      description: json['description'] as String,
    );

Map<String, dynamic> _$AuthRoleToJson(AuthRole instance) => <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'description': instance.description,
    };
