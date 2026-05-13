import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/models/repair_computer.dart';
import 'package:intania_staff_buddy/models/result.dart';
import 'package:intania_staff_buddy/screens/repair_computer/fman/repair_computer_assign_select_type_screen.dart';
import 'package:intania_staff_buddy/screens/repair_computer/fman/repair_computer_manage_form.dart';
import 'package:intania_staff_buddy/screens/repair_computer/repair_computer_screen.dart';
import 'package:intania_staff_buddy/services/repair_computer_service.dart';
import 'package:intania_staff_buddy/utils/mixins/alert_mixin.dart';
import 'package:intania_staff_buddy/widgets/button.dart';
import 'package:intania_staff_buddy/widgets/container_center.dart';
import 'package:intania_staff_buddy/widgets/panel.dart';
import 'package:intania_staff_buddy/widgets/template_blank.dart';

class RepairComputerManageViewScreen extends StatefulWidget {
  final String staffId;
  final String jobId;
  final String? action;

  const RepairComputerManageViewScreen({
    super.key,
    required this.staffId,
    required this.jobId,
    this.action,
  });

  @override
  State<RepairComputerManageViewScreen> createState() =>
      _RepairComputerManageViewScreenState();
}

class _RepairComputerManageViewScreenState
    extends State<RepairComputerManageViewScreen> with AlertMixin {
  bool _ready = false;
  bool _progressing = false;
  String? _processType;
  String? _responseMessage;
  RepairComputer? _data;

  @override
  void initState() {
    super.initState();

    void initData() async {
      String processType = '';
      String? message;
      RepairComputer? data;

      if (widget.jobId.isNotEmpty) {
        Result result =
            await RepairComputerService().getJobDetail(widget.jobId.toString());

        processType = result.processType;
        data = result.data as RepairComputer;
      } else {
        processType = PROCESS_ERROR;
      }

      setState(() {
        _ready = true;
        _processType = processType;
        _responseMessage = message.toString();
        _data = data;
      });
    }

    initData();
  }

  Widget displayWidget() {
    switch (_processType) {
      case PROCESS_SUCCESS:
        return RepairComputerManageForm(
          id: widget.jobId,
          data: _data,
        );
      case PROCESS_FAILED:
        return ContainerCenter(
          title: TITLE_ERROR,
          desc: _responseMessage,
        );
      default:
        return ContainerCenter(
          title: TITLE_ERROR,
          desc: _responseMessage,
        );
    }
  }

  handleAction(String statusAction) {
    setState(() {
      _progressing = true;
    });
    Timer(CONNECTION_TIMEOUT, () async {
      Result? result;
      bool pushBack = false;
      switch (statusAction) {
        case STATUS_RC_NEW_JOB:
          result =
              await RepairComputerService().foremanUnassignJob(widget.jobId);
          pushBack = true;
          break;
        case STATUS_RC_WORKER_REJECT:
          result = await RepairComputerService()
              .acceptRejectedFromWorker(widget.jobId);
          pushBack = true;
          break;
        default:
          break;
      }
      setState(() {
        _progressing = false;
      });

      if (mounted) {
        if (result != null) {
          showSnackBarByResult(context, result);
        }
        if (pushBack) {
          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(
              builder: (context) => const RepairComputerScreen(
                activeTabIndex: TABINDEX_RC_FOREMAN_MANAGE_JOB,
              ),
            ),
            ((route) => false),
          );
        }
      }
    });
  }

  handleCancelJob() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        Widget noButton = ElevatedButton(
          child: const Text(TEXT_NO),
          onPressed: () {
            Navigator.of(context).pop(false);
          },
        );
        Widget yesButton = ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.red,
            foregroundColor: Colors.white,
          ),
          child: const Text(TEXT_YES),
          onPressed: () {
            if (context.mounted) {
              Navigator.of(context).pop(false);
              // Foreman unassign job
              handleAction(STATUS_RC_NEW_JOB);
            }
          },
        );
        AlertDialog alert = AlertDialog(
          title: const Text(TITLE_RC_CANCEL_JOB),
          content: const Text(MESSAGE_RC_CANCEL_JOB),
          actions: [yesButton, noButton],
        );
        return alert;
      },
    );
  }

  Widget actionPanel() {
    switch (widget.action) {
      case STATUS_RC_WAIT_WORKER:
        return Panel(
          child: Row(
            children: [
              Expanded(
                child: Button(
                  progressing: _progressing,
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => RepairComputerAssignSelectTypeScreen(
                          jobId: widget.jobId),
                    ),
                  ),
                  child: const Text(TEXT_RC_CHANGE_WORKER),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Button(
                  progressing: _progressing,
                  backgroundColor: Colors.red,
                  onPressed: handleCancelJob,
                  child: const Text(TEXT_RC_CANCEL_JOB),
                ),
              ),
            ],
          ),
        );
      case STATUS_RC_WORKER_REJECT:
        return Panel(
          child: Button(
            progressing: _progressing,
            onPressed: () => handleAction(STATUS_RC_WORKER_REJECT),
            child: const Text(TEXT_RC_ACCEPT_REJECTED),
          ),
        );
      default:
        return Container();
    }
  }

  @override
  Widget build(BuildContext context) {
    return TemplateBlank(
      appBarTitle: TITLE_RC_INFORM_DETAIL,
      child: !_ready
          ? const Center(child: CircularProgressIndicator())
          : Column(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                displayWidget(),
                actionPanel(),
              ],
            ),
    );
  }
}
