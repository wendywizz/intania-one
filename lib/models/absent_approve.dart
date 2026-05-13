import 'package:intania_staff_buddy/models/absent.dart';
import 'package:json_annotation/json_annotation.dart';

part 'absent_approve.g.dart';

@JsonSerializable()
class AbsentApprove {
  final String? id;
  final String? approveId;
  final String? absenceId;
  final String? forgetId;
  final String? name;
  final String? deptName;
  final String? absenceType;
  final String? approveName;
  final String? approverPosition;
  final DateTime? writeDate;
  final DateTime? startDate;
  final DateTime? endDate;
  final String? inTime;
  final String? outTime;
  final String? reason;
  final String? contact;
  final String? agentList;
  final String? type;
  final String? progress;
  final List<Absent>? absentHistory;

  AbsentApprove({
    this.id,
    this.approveId,
    this.absenceId,
    this.forgetId,
    this.name,
    this.deptName,
    this.absenceType,
    this.approveName,
    this.approverPosition,
    this.writeDate,
    this.startDate,
    this.endDate,
    this.inTime,
    this.outTime,
    this.reason,
    this.contact,
    this.agentList,
    this.type,
    this.progress,
    this.absentHistory,
  });

  factory AbsentApprove.fromJson(Map<String, dynamic> json) =>
      _$AbsentApproveFromJson(json);

  Map<String, dynamic> toJson() => _$AbsentApproveToJson(this);
}
