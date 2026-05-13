import 'package:json_annotation/json_annotation.dart';

import 'package:intania_staff_buddy/constants/uri.dart';
part 'auth_user.g.dart';

@JsonSerializable()
class AuthUser {
  final String username;
  final String firstName;
  final String lastName;
  final String staffId;
  final String email;
  final String campusId;
  final String facultyId;
  final String departmentId;
  final String positionId;

  AuthUser({
    required this.username,
    required this.firstName,
    required this.lastName,
    required this.staffId,
    required this.email,
    required this.campusId,
    required this.facultyId,
    required this.departmentId,
    required this.positionId,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) =>
      _$AuthUserFromJson(json);

  Map<String, dynamic> toJson() => _$AuthUserToJson(this);

  String getPhotoUrl(staffId) {
    return PHOTO_URL + staffId + PHOTO_EXTENTION;
  }
}
