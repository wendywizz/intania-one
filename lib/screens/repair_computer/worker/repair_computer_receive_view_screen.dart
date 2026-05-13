import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/models/repair_computer.dart';
import 'package:intania_staff_buddy/models/result.dart';
import 'package:intania_staff_buddy/screens/repair_computer/repair_computer_screen.dart';
import 'package:intania_staff_buddy/screens/repair_computer/worker/repair_computer_operate_detail_screen.dart';
import 'package:intania_staff_buddy/screens/repair_computer/worker/repair_computer_operate_form.dart';
import 'package:intania_staff_buddy/screens/repair_computer/worker/repair_computer_receive_job_reject_screen.dart';
import 'package:intania_staff_buddy/screens/repair_computer/worker/repair_computer_request_supply_screen.dart';
import 'package:intania_staff_buddy/services/repair_computer_service.dart';
import 'package:intania_staff_buddy/utils/alert.dart';
import 'package:intania_staff_buddy/utils/mixins/alert_mixin.dart';
import 'package:intania_staff_buddy/widgets/button.dart';
import 'package:intania_staff_buddy/widgets/container_center.dart';
import 'package:intania_staff_buddy/widgets/icon_button_goback.dart';
import 'package:intania_staff_buddy/widgets/panel.dart';
import 'package:intania_staff_buddy/widgets/template_blank.dart';

class RepairComputerReceiveViewScreen extends StatefulWidget {
  final String staffId;
  final String jobId;
  final String? action;

  const RepairComputerReceiveViewScreen({
    super.key,
    required this.staffId,
    required this.jobId,
    this.action,
  });

  @override
  State<RepairComputerReceiveViewScreen> createState() =>
      _RepairComputerReceiveViewScreenState();
}

class _RepairComputerReceiveViewScreenState
    extends State<RepairComputerReceiveViewScreen> with AlertMixin {
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
        return RepairComputerOperateForm(
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

  void handleAction(BuildContext context, String action) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        Widget noButton = ElevatedButton(
          onPressed: !_progressing
              ? () {
                  Navigator.of(context).pop(false);
                }
              : null,
          child: const Text(TEXT_NO),
        );
        Widget yesButton = ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.blue,
            foregroundColor: Colors.white,
          ),
          onPressed: !_progressing
              ? () {
                  setState(() {
                    _progressing = true;
                  });

                  Navigator.of(context).pop(false);
                  Result? result;

                  Timer(CONNECTION_TIMEOUT, () async {
                    switch (action) {
                      case STATUS_RC_WAIT_WORKER:
                        result = await RepairComputerService()
                            .workerReceiveJob(widget.jobId, true);
                        break;
                      case STATUS_RC_WORKING:
                        result = await RepairComputerService()
                            .submitJob(widget.jobId);
                        break;
                      default:
                        break;
                    }

                    setState(() {
                      _progressing = false;
                    });

                    if (context.mounted) {
                      if (result != null) {
                        showSnackBarByResult(context, result!);

                        Navigator.pushAndRemoveUntil(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const RepairComputerScreen(
                              activeTabIndex: TABINDEX_RC_WORKER_RECEIVE_JOB,
                            ),
                          ),
                          ((route) => false),
                        );
                      } else {
                        Alert alert = const Alert();
                        alert.showMessage(context, MESSAGE_PROCESS_FAILED);
                      }
                    }
                  });
                }
              : null,
          child: const Text(TEXT_YES),
        );

        String? title;
        String? message;
        switch (action) {
          case STATUS_RC_WAIT_WORKER:
            title = TITLE_CONFIRM;
            message = MESSAGE_RC_CONFIRM_RECEIVE_JOB;
            break;
          case STATUS_RC_WORKING:
            title = TITLE_RC_SUBMIT_JOB;
            message = MESSAGE_RC_SUBMIT_JOB;
            break;
        }

        if (action.isNotEmpty) {
          AlertDialog alert = AlertDialog(
            title: Text(title.toString()),
            content: Text(message.toString()),
            actions: [yesButton, noButton],
          );
          return alert;
        } else {
          return Container();
        }
      },
    );
  }

  Widget actionPanel(BuildContext context) {
    switch (widget.action) {
      case STATUS_RC_WAIT_WORKER:
        return Panel(
          child: Row(
            children: [
              Expanded(
                child: Button(
                  backgroundColor: Colors.green,
                  progressing: _progressing,
                  onPressed: () =>
                      handleAction(context, widget.action.toString()),
                  child: const Text(TEXT_RC_ACCEPT_JOB),
                ),
              ),
              Expanded(
                child: Button(
                  backgroundColor: Colors.red,
                  progressing: _progressing,
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) =>
                          RepairComputerReceiveJobRejectScreen(
                              jobId: widget.jobId),
                    ),
                  ),
                  child: const Text(TEXT_RC_REJECT_JOB),
                ),
              ),
            ],
          ),
        );
      case STATUS_RC_WORKER_ACCEPT:
        return Panel(
          child: Button(
            progressing: _progressing,
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => RepairComputerOperateDetailScreen(
                    jobId: widget.jobId,
                    staffId: widget.staffId,
                  ),
                ),
              );
            },
            child: const Text(
              TEXT_RC_OPERATE,
            ),
          ),
        );
      case STATUS_RC_WORKING:
        return Panel(
          child: Row(
            children: [
              Expanded(
                child: Button(
                  backgroundColor: Colors.black,
                  progressing: _progressing,
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => RepairComputerRequestSupplyScreen(
                          jobId: widget.jobId),
                    ),
                  ),
                  child: const Text(TEXT_RC_REQUEST_SUPPLY),
                ),
              ),
              Expanded(
                child: Button(
                  backgroundColor: Colors.green,
                  progressing: _progressing,
                  onPressed: () =>
                      handleAction(context, widget.action.toString()),
                  child: const Text(TEXT_RC_SUBMIT_JOB),
                ),
              ),
            ],
          ),
        );
      default:
        return Container();
    }
  }

  @override
  Widget build(BuildContext context) {
    return TemplateBlank(
      leading: IconButtonGoBack(
        onPressed: () => Navigator.push(
          context,
          MaterialPageRoute(
              builder: (_) => const RepairComputerScreen(
                    activeTabIndex: TABINDEX_RC_WORKER_CURRENT_JOB,
                  )),
        ),
      ),
      appBarTitle: TITLE_RC_INFORM_DETAIL,
      child: !_ready
          ? const Center(child: CircularProgressIndicator())
          : Column(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                displayWidget(),
                actionPanel(context),
              ],
            ),
    );
  }
}
