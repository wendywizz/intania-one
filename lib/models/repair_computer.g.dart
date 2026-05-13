// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'repair_computer.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

RepairComputer _$RepairComputerFromJson(Map<String, dynamic> json) =>
    RepairComputer(
      id: json['id'] as String,
      year: json['year'] as String,
      staffId: json['staffId'] as String,
      staffFullname: json['staffFullname'] as String?,
      deptId: json['deptId'] as String?,
      deptName: json['deptName'] as String?,
      positionId: json['positionId'] as String?,
      phone: json['phone'] as String?,
      repairType: json['repairType'] as String?,
      repairTypeName: json['repairTypeName'] as String?,
      detail: json['detail'] as String?,
      informDateTime: DateTime.parse(json['informDateTime'] as String),
      supplyCode: json['supplyCode'] as String?,
      status: json['status'] as String,
      statusName: json['statusName'] as String?,
      needEquipment: json['needEquipment'] as bool?,
      approvedEquipment: json['approvedEquipment'] as bool?,
      equipmentRequestDateTime: json['equipmentRequestDateTime'] == null
          ? null
          : DateTime.parse(json['equipmentRequestDateTime'] as String),
      equipmentApprovedDateTime: json['equipmentApprovedDateTime'] == null
          ? null
          : DateTime.parse(json['equipmentApprovedDateTime'] as String),
      equipmentRequestDetail: json['equipmentRequestDetail'] as String?,
      equipmentApprover: json['equipmentApprover'] as String?,
      equipmentApproverComment: json['equipmentApproverComment'] as String?,
      foreman: json['foreman'] as String?,
      foremanFullname: json['foremanFullname'] as String?,
      worker: json['worker'] as String?,
      workerFullname: json['workerFullname'] as String?,
    );

Map<String, dynamic> _$RepairComputerToJson(RepairComputer instance) =>
    <String, dynamic>{
      'id': instance.id,
      'year': instance.year,
      'staffId': instance.staffId,
      'staffFullname': instance.staffFullname,
      'deptId': instance.deptId,
      'deptName': instance.deptName,
      'positionId': instance.positionId,
      'phone': instance.phone,
      'repairType': instance.repairType,
      'repairTypeName': instance.repairTypeName,
      'detail': instance.detail,
      'informDateTime': instance.informDateTime.toIso8601String(),
      'supplyCode': instance.supplyCode,
      'status': instance.status,
      'statusName': instance.statusName,
      'needEquipment': instance.needEquipment,
      'approvedEquipment': instance.approvedEquipment,
      'equipmentRequestDateTime':
          instance.equipmentRequestDateTime?.toIso8601String(),
      'equipmentApprovedDateTime':
          instance.equipmentApprovedDateTime?.toIso8601String(),
      'equipmentRequestDetail': instance.equipmentRequestDetail,
      'equipmentApprover': instance.equipmentApprover,
      'equipmentApproverComment': instance.equipmentApproverComment,
      'foreman': instance.foreman,
      'foremanFullname': instance.foremanFullname,
      'worker': instance.worker,
      'workerFullname': instance.workerFullname,
    };
