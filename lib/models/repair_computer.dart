import 'package:json_annotation/json_annotation.dart';

part 'repair_computer.g.dart';

@JsonSerializable()
class RepairComputer {
  final String id;
  final String year;
  final String staffId;
  final String? staffFullname;
  final String? deptId;
  final String? deptName;
  final String? positionId;
  final String? phone;
  final String? repairType;
  final String? repairTypeName;
  final String? detail;
  final DateTime informDateTime;
  final String? supplyCode;
  final String status;
  final String? statusName;
  final bool? needEquipment;
  final bool? approvedEquipment;
  final DateTime? equipmentRequestDateTime;
  final DateTime? equipmentApprovedDateTime;
  final String? equipmentRequestDetail;
  final String? equipmentApprover;
  final String? equipmentApproverComment;
  final String? foreman;
  final String? foremanFullname;
  final String? worker;
  final String? workerFullname;

  RepairComputer({
    required this.id,
    required this.year,
    required this.staffId,
    this.staffFullname,
    this.deptId,
    this.deptName,
    this.positionId,
    this.phone,
    this.repairType,
    this.repairTypeName,
    this.detail,
    required this.informDateTime,
    this.supplyCode,
    required this.status,
    this.statusName,
    this.needEquipment,
    this.approvedEquipment,
    this.equipmentRequestDateTime,
    this.equipmentApprovedDateTime,
    this.equipmentRequestDetail,
    this.equipmentApprover,
    this.equipmentApproverComment,
    this.foreman,
    this.foremanFullname,
    this.worker,
    this.workerFullname,
  });

  factory RepairComputer.fromJson(Map<String, dynamic> json) =>
      _$RepairComputerFromJson(json);

  Map<String, dynamic> toJson() => _$RepairComputerToJson(this);
}
