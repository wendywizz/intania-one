import 'package:json_annotation/json_annotation.dart';

part 'repair_computer_privilege.g.dart';

@JsonSerializable()
class RepairComputerPrivilege {
  final String staffId;
  final String privilege;

  RepairComputerPrivilege({
    required this.staffId,
    required this.privilege,
  });

  factory RepairComputerPrivilege.fromJson(Map<String, dynamic> json) =>
      _$RepairComputerPrivilegeFromJson(json);

  Map<String, dynamic> toJson() => _$RepairComputerPrivilegeToJson(this);
}
