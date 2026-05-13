import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/models/repair_computer.dart';
import 'package:intania_staff_buddy/screens/repair_computer/fman/repair_computer_reject_detail.dart';
import 'package:intania_staff_buddy/widgets/button.dart';
import 'package:intania_staff_buddy/widgets/button_datepicker.dart';
import 'package:intania_staff_buddy/widgets/panel.dart';
import 'package:intania_staff_buddy/widgets/row_detail.dart';
import 'package:intania_staff_buddy/widgets/heading.dart';

class RepairComputerManageForm extends StatelessWidget {
  final String? id;
  final bool progressing;
  final bool showActionPanel;
  final RepairComputer? data;
  final Function? onSubmit;
  final Function? onAlternatePressed;
  final String? buttonTextAlternate;
  final bool showAssignedWorker;

  const RepairComputerManageForm({
    super.key,
    this.id,
    this.progressing = false,
    this.showActionPanel = false,
    this.data,
    this.onSubmit,
    this.onAlternatePressed,
    this.buttonTextAlternate,
    this.showAssignedWorker = true,
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
          title: '$LABEL_RC_SUPPLYCODE:',
          description: data?.supplyCode != null
              ? data!.supplyCode.toString()
              : TEXT_RC_NO_SUPPLYCODE,
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
        data?.status != STATUS_RC_NEW_JOB && showAssignedWorker
            ? Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 40),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 15),
                    child: Heading(text: TITLE_RC_ASSIGN_CONFIRM, size: 'h5'),
                  ),
                  const SizedBox(height: 5),
                  RowDetail(
                    title: '$LABEL_RC_WORKER:',
                    description: data?.workerFullname != null
                        ? data!.workerFullname.toString()
                        : TEXT_NONE,
                  ),
                  RowDetail(
                    title: '$LABEL_RC_STATUS:',
                    description: data?.statusName != null
                        ? data!.statusName.toString()
                        : TEXT_NONE,
                  ),
                  data?.status == STATUS_RC_WORKER_REJECT
                      ? RepairComputerRejectDetail(
                          jobId: id.toString(),
                          worker: data!.worker,
                        )
                      : Container(),
                ],
              )
            : Container(),
      ],
    );
  }

  void handleSubmit() {
    onSubmit!();
  }

  void handleAlternatePressed() {
    onAlternatePressed!();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        renderForm(),
        showActionPanel
            ? Panel(
                child: Row(
                  children: [
                    Expanded(
                      child: Button(
                        progressing: progressing,
                        onPressed: handleSubmit,
                        backgroundColor: Colors.black87,
                        foregroundColor: Colors.white,
                        child: const Text(TEXT_RC_ASSIGN_JOB),
                      ),
                    ),
                    (onAlternatePressed != null) &&
                            (buttonTextAlternate!.isNotEmpty)
                        ? Expanded(
                            child: Button(
                            onPressed: handleAlternatePressed,
                            backgroundColor: Colors.red,
                            foregroundColor: Colors.white,
                            child: Text(buttonTextAlternate!),
                          ))
                        : Container()
                  ],
                ),
              )
            : Container()
      ],
    );
  }
}
