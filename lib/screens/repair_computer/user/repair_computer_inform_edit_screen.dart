import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/models/repair_computer.dart';
import 'package:intania_staff_buddy/models/result.dart';
import 'package:intania_staff_buddy/screens/repair_computer/repair_computer_screen.dart';
import 'package:intania_staff_buddy/screens/repair_computer/user/repair_computer_inform_form.dart';
import 'package:intania_staff_buddy/services/repair_computer_service.dart';
import 'package:intania_staff_buddy/utils/mixins/alert_mixin.dart';
import 'package:intania_staff_buddy/utils/snack_message.dart';
import 'package:intania_staff_buddy/widgets/container_center.dart';
import 'package:intania_staff_buddy/widgets/template_blank.dart';

class RepairComputerInformEditScreen extends StatefulWidget {
  final String jobId;
  final String staffId;

  const RepairComputerInformEditScreen({
    super.key,
    required this.jobId,
    required this.staffId,
  });

  @override
  State<RepairComputerInformEditScreen> createState() =>
      _RepairComputerInformEditScreenState();
}

class _RepairComputerInformEditScreenState
    extends State<RepairComputerInformEditScreen> with AlertMixin {
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

  void handleSubmit(Map<String, dynamic> data) {
    setState(() {
      _progressing = true;
    });
    Timer(CONNECTION_TIMEOUT, () async {
      data['id'] = widget.jobId;

      Result result =
          await RepairComputerService().updateInformData(widget.jobId, data);

      setState(() {
        _progressing = false;
      });

      if (mounted) {
        showSnackBarByResult(context, result);
      }
    });
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
                Navigator.of(context).pop(false);

                Result result =
                    await RepairComputerService().removeJob(widget.jobId);
                String barType;
                if (result.success) {
                  barType = RESPONSE_TYPE_SUCCESS;
                } else {
                  barType = RESPONSE_TYPE_ERROR;
                }

                if (context.mounted) {
                  SnackMessage(barType: barType, content: Text(result.message))
                      .show(context);
                }
                changePage();
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
        break;
      case STATUS_RC_WAIT_CLOSEJOB:
      case STATUS_RC_REJECT:
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
                Navigator.of(context).pop(false);

                Result result =
                    await RepairComputerService().closeJob(widget.jobId);
                String barType;
                if (result.success) {
                  barType = RESPONSE_TYPE_SUCCESS;
                } else {
                  barType = RESPONSE_TYPE_ERROR;
                }

                if (context.mounted) {
                  SnackMessage(barType: barType, content: Text(result.message))
                      .show(context);
                }
                changePage();
              },
            );
            AlertDialog alert = AlertDialog(
              title: const Text(TITLE_RC_CLOSEJOB),
              content: const Text(MESSAGE_RC_CLOSEJOB),
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
    Future.delayed(const Duration(milliseconds: 500)).then((value) {
      Navigator.push(
          // ignore: use_build_context_synchronously
          context,
          MaterialPageRoute(
              builder: (_) => const RepairComputerScreen(
                    activeTabIndex: TABINDEX_RC_USER_CURRENT,
                  )));
    });
  }

  Widget displayWidget() {
    bool showActionPanel = false;
    bool enableEditable = false;
    String buttonTextAlternate = '';
    if (_data!.status == STATUS_RC_NEW_JOB ||
        _data!.status == STATUS_RC_WAIT_CLOSEJOB ||
        _data!.status == STATUS_RC_REJECT) {
      showActionPanel = true;
    }
    if (_data!.status == STATUS_RC_NEW_JOB) {
      buttonTextAlternate = TEXT_RC_CANCEL_JOB;
      enableEditable = true;
    } else if (_data!.status == STATUS_RC_WAIT_CLOSEJOB ||
        _data!.status == STATUS_RC_REJECT) {
      buttonTextAlternate = TEXT_RC_CLOSE_JOB;
    }
    switch (_processType) {
      case PROCESS_SUCCESS:
        return RepairComputerInformForm(
          id: widget.jobId,
          staffId: widget.staffId,
          progressing: _progressing,
          data: _data,
          onSubmit: handleSubmit,
          onAlternatePressed: handleAlternatePress,
          showActionPanel: showActionPanel,
          buttonTextAlternate: buttonTextAlternate,
          enableEditable: enableEditable,
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
      appBarTitle: PAGE_RC_INFORM_EDIT,
      topBarActionButton: [
        IconButton(
          icon: const Icon(Icons.delete, color: Colors.red),
          tooltip: TEXT_RC_CANCEL_JOB,
          onPressed: () => handleAlternatePress,
        ),
      ],
      child: !_ready
          ? const Center(child: CircularProgressIndicator())
          : displayWidget(),
    );
  }
}
