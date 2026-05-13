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
import 'package:intania_staff_buddy/widgets/container_center.dart';
import 'package:intania_staff_buddy/widgets/template_blank.dart';

class RepairComputerAssignScreen extends StatefulWidget {
  final String id;

  const RepairComputerAssignScreen({
    super.key,
    required this.id,
  });

  @override
  State<RepairComputerAssignScreen> createState() =>
      _RepairComputerAssignScreenState();
}

class _RepairComputerAssignScreenState extends State<RepairComputerAssignScreen>
    with AlertMixin {
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

      if (widget.id.isNotEmpty) {
        Result result =
            await RepairComputerService().getJobDetail(widget.id.toString());

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

  void handleSubmit() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => RepairComputerAssignSelectTypeScreen(jobId: widget.id),
      ),
    );
  }

  void handleAlternatePress() async {
    switch (_data!.status) {
      case STATUS_RC_NEW_JOB:
        showDialog<bool?>(
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
              onPressed: () async {
                setState(() => _progressing = true);
                Navigator.of(context).pop(false);
                Result result =
                    await RepairComputerService().foremanRejectJob(widget.id);

                setState(() => _progressing = false);

                if (context.mounted) {
                  showSnackBarByResult(context, result);
                }
                changePage();
              },
            );
            AlertDialog alert = AlertDialog(
              title: const Text(TITLE_RC_REJECT_JOB),
              content: const Text(MESSAGE_RC_REJECT_JOB),
              actions: [yesButton, noButton],
            );
            return alert;
          },
        );
        break;
      default:
        break;
    }
  }

  void changePage() {
    Future.delayed(DELAY_TIMEOUT).then((value) {
      Navigator.push(
        // ignore: use_build_context_synchronously
        context,
        MaterialPageRoute(
          builder: (_) => const RepairComputerScreen(
            activeTabIndex: TABINDEX_RC_FOREMAN_NEW_JOB,
          ),
        ),
      );
    });
  }

  Widget displayWidget() {
    switch (_processType) {
      case PROCESS_SUCCESS:
        return RepairComputerManageForm(
          data: _data,
          showActionPanel: true,
          progressing: _progressing,
          buttonTextAlternate: TEXT_RC_WRONG_DEPT,
          onAlternatePressed: handleAlternatePress,
          onSubmit: handleSubmit,
        );
      case PROCESS_FAILED:
        return ContainerCenter(
          title: TITLE_RC_CANNOT_INFORM,
          desc: _responseMessage,
        );
      default:
        return ContainerCenter(
          title: TITLE_ERROR,
          desc: _responseMessage,
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    return TemplateBlank(
      appBarTitle: PAGE_RC_ASSIGN_JOB,
      child: !_ready
          ? const Center(child: CircularProgressIndicator())
          : displayWidget(),
    );
  }
}
