import 'package:json_annotation/json_annotation.dart';

part 'auth_roles.g.dart';

enum Role {
  teacher,
  support,
}

@JsonSerializable()
class AuthRole {
  final int id;
  final String name;
  final String description;

  AuthRole({
    required this.id,
    required this.name,
    required this.description,
  });

  factory AuthRole.fromJson(Map<String, dynamic> json) =>
      _$AuthRoleFromJson(json);

  Map<String, dynamic> toJson() => _$AuthRoleToJson(this);
}
