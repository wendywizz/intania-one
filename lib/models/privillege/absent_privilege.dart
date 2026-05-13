import 'package:json_annotation/json_annotation.dart';

part 'absent_privilege.g.dart';

@JsonSerializable()
class AbsentPrivilege {
  final String staffId;
  final String staffType;
  final bool isHeadman;

  AbsentPrivilege({
    required this.staffId,
    required this.staffType,
    this.isHeadman = false,
  });

  factory AbsentPrivilege.fromJson(Map<String, dynamic> json) =>
      _$AbsentPrivilegeFromJson(json);

  Map<String, dynamic> toJson() => _$AbsentPrivilegeToJson(this);
}
