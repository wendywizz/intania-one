import 'package:intania_staff_buddy/models/person.dart';
import 'package:json_annotation/json_annotation.dart';

part 'absent.g.dart';

@JsonSerializable()
class Absent {
  final String? id;
  final String? absentTime;
  final String? absentType;
  final String? absentTypeName;
  final String? progressType;
  final String? progressTypeName;
  final String staffId;
  final String? name;
  final String? position;
  final String? deptId;
  final String? deptName;
  final String? step;
  final String? status;
  final DateTime writeDate;
  final DateTime? startDate;
  final DateTime? endDate;
  final String? partFlag;
  final num? absentDays;
  final String? contact;
  final String? reason;
  final String? travelDetail;
  final String? approverPosition;
  final List<Person>? approverList;
  final List<Person>? agentList;
  final List<String>? selectedAgents;
  final Person? mainApprover;
  final List<Person>? subApprover;
  final String? beginYear;
  final String? beginStartDate;
  final String? beginEndDate;
  final int? relaxTotal;
  final int? relaxRemain;
  final int? relaxUsed;
  final String? fileUpload;
  final String? fileUploadLink;

  Absent({
    this.id,
    this.absentTime,
    this.absentType,
    this.absentTypeName,
    this.progressType,
    this.progressTypeName,
    required this.staffId,
    this.name,
    this.position,
    this.deptId,
    this.deptName,
    this.step,
    this.status,
    required this.writeDate,
    this.partFlag,
    this.startDate,
    this.endDate,
    this.absentDays,
    this.contact,
    this.reason,
    this.travelDetail,
    this.approverPosition,
    this.approverList,
    this.agentList,
    this.selectedAgents,
    this.mainApprover,
    this.subApprover,
    this.beginYear,
    this.beginStartDate,
    this.beginEndDate,
    this.relaxTotal,
    this.relaxRemain,
    this.relaxUsed,
    this.fileUpload,
    this.fileUploadLink,
  });

  factory Absent.fromJson(Map<String, dynamic> json) => _$AbsentFromJson(json);

  Map<String, dynamic> toJson() => _$AbsentToJson(this);
}
