import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/models/repair_computer.dart';
import 'package:intania_staff_buddy/widgets/button_datepicker.dart';
import 'package:intania_staff_buddy/widgets/row_detail.dart';

class RepairComputerOperateForm extends StatelessWidget {
  final RepairComputer? data;

  const RepairComputerOperateForm({
    super.key,
    this.data,
  });

  Widget renderForm() {
    return Column(
      children: [
        RowDetail(
          title: '$LABEL_RC_USER:',
          description: data?.staffFullname != null
              ? data!.staffFullname.toString()
              : TEXT_NONE,
        ),
        RowDetail(
          title: '$LABEL_RC_DEPT:',
          description:
              data?.deptName != null ? data!.deptName.toString() : TEXT_NONE,
        ),
        RowDetail(
          title: '$LABEL_RC_INFORM_DATE:',
          description: data?.informDateTime != null
              ? formatDate(data!.informDateTime)
              : TEXT_NONE,
        ),
        RowDetail(
          title: '$LABEL_RC_FOREMAN:',
          description: data!.foremanFullname.toString(),
        ),
        RowDetail(
          title: '$LABEL_RC_SUPPLYCODE:',
          description: data?.supplyCode != null
              ? data!.supplyCode.toString()
              : TEXT_RC_NO_SUPPLYCODE,
        ),
        RowDetail(
          title: '$LABEL_RC_REPAIR_TYPE:',
          description: data!.repairTypeName.toString(),
        ),
        RowDetail(
          title: '$LABEL_RC_PHONE:',
          description: data?.phone != null ? data!.phone.toString() : TEXT_NONE,
        ),
        RowDetail(
          title: '$LABEL_RC_DETAIL:',
          description:
              data?.detail != null ? data!.detail.toString() : TEXT_NONE,
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        renderForm(),
      ],
    );
  }
}
