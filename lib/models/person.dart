import 'package:json_annotation/json_annotation.dart';

import 'package:intania_staff_buddy/constants/uri.dart';
part 'person.g.dart';

@JsonSerializable()
class Person {
  final String staffId;
  final String? prefixNameTH;
  final String? titleName2;
  final String? titleName3;
  final String firstNameTH;
  final String lastNameTH;
  final String? firstNameEN;
  final String? lastNameEN;
  final String? officeTel;
  final String? website;
  final String? twitter;
  final String? facebook;
  final String? deptName;
  final String? email;
  final String? positionId;
  final String? positionName;
  final String? staffType;
  final String? staffTypeName;

  Person({
    required this.staffId,
    this.prefixNameTH,
    this.titleName2,
    this.titleName3,
    required this.firstNameTH,
    required this.lastNameTH,
    this.firstNameEN,
    this.lastNameEN,
    this.officeTel,
    this.website,
    this.twitter,
    this.facebook,
    this.deptName,
    this.email,
    this.positionId,
    this.positionName,
    this.staffType,
    this.staffTypeName,
  });

  factory Person.fromJson(Map<String, dynamic> json) => _$PersonFromJson(json);

  Map<String, dynamic> toJson() => _$PersonToJson(this);

  String getPhoto() {
    return PHOTO_URL + staffId + PHOTO_EXTENTION;
  }

  String? getPrefixName() {
    String? prefixName = '';

    if ((titleName2 != null) && (titleName3 != null)) {
      prefixName = (titleName2! + titleName3!);
    } else if (titleName2 != null) {
      prefixName = titleName2!;
    } else if (titleName3 != null) {
      prefixName = titleName3!;
    } else {
      prefixName = prefixNameTH;
    }

    return prefixName;
  }
}
