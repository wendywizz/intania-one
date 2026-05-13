import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/models/repair_computer.dart';
import 'package:intania_staff_buddy/models/result.dart';
import 'package:intania_staff_buddy/screens/repair_computer/repair_computer_screen.dart';
import 'package:intania_staff_buddy/services/repair_computer_service.dart';
import 'package:intania_staff_buddy/utils/mixins/alert_mixin.dart';
import 'package:intania_staff_buddy/widgets/button.dart';
import 'package:intania_staff_buddy/widgets/container_center.dart';
import 'package:intania_staff_buddy/widgets/row_detail.dart';
import 'package:intania_staff_buddy/widgets/template_blank.dart';

class RepairComputerInformViewScreen extends StatefulWidget {
  final String staffId;
  final String jobId;

  const RepairComputerInformViewScreen({
    super.key,
    required this.staffId,
    required this.jobId,
  });

  @override
  State<RepairComputerInformViewScreen> createState() =>
      _RepairComputerInformViewScreenState();
}

class _RepairComputerInformViewScreenState
    extends State<RepairComputerInformViewScreen> with AlertMixin {
  bool _ready = false;
  String? _processType;
  String? _responseMessage;
  RepairComputer? _data;
  bool _progressing = false;

  @override
  void initState() {
    super.initState();

    void initData() async {
      String processType = '';
      String? message;
      RepairComputer? data;

      if (widget.jobId.isNotEmpty) {
        Result result =
            await RepairComputerService().getJobDetail(widget.jobId);

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

  void handleSubmit(BuildContext screenContext) {
    switch (_data!.status) {
      case STATUS_RC_WAIT_CLOSEJOB:
      case STATUS_RC_REJECT:
      case STATUS_RC_WORKER_REJECT:
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
                    await RepairComputerService().closeJob(widget.jobId);

                setState(() => _progressing = false);

                if (context.mounted) {
                  showSnackBarByResult(context, result);
                }

                Future.delayed(DELAY_TIMEOUT).then((value) {
                  Navigator.push(
                      // ignore: use_build_context_synchronously
                      screenContext,
                      MaterialPageRoute(
                          builder: (_) => const RepairComputerScreen(
                                activeTabIndex: TABINDEX_RC_USER_CURRENT,
                              )));
                });
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

  Widget renderData() {
    return Column(
      children: [
        const SizedBox(height: 30),
        RowDetail(
            title: '$LABEL_RC_SUPPLYCODE:',
            description: _data!.supplyCode ?? TEXT_NONE),
        RowDetail(
            title: '$LABEL_RC_PHONE:', description: _data!.phone ?? TEXT_NONE),
        RowDetail(
            title: '$LABEL_RC_DETAIL:',
            description: _data!.detail ?? TEXT_NONE),
        RowDetail(
            title: '$LABEL_RC_WORKER:',
            description: _data!.workerFullname ?? TEXT_NONE),
        RowDetail(title: '$LABEL_RC_STATUS:', description: _data!.statusName!),
      ],
    );
  }

  Widget renderActionPanel(BuildContext context) {
    String buttonTextAction;
    Color buttonColor = Colors.black87;
    Color textColor = Colors.white;
    bool showActionPanel = false;

    switch (_data!.status) {
      case STATUS_RC_WAIT_CLOSEJOB:
      case STATUS_RC_WORKER_REJECT:
        buttonTextAction = TEXT_RC_CLOSE_JOB;
        showActionPanel = true;
        break;
      default:
        buttonTextAction = TEXT_NONE;
        break;
    }

    return showActionPanel
        ? Container(
            alignment: Alignment.center,
            decoration: const BoxDecoration(
              color: Colors.white70,
              border: Border(
                top: BorderSide(
                  width: 1,
                ),
              ),
            ),
            height: 100,
            width: double.maxFinite,
            child: Padding(
              padding: const EdgeInsets.all(8.0),
              child: Row(
                children: [
                  Expanded(
                    child: Button(
                        progressing: _progressing,
                        onPressed: () => handleSubmit(context),
                        backgroundColor: buttonColor,
                        foregroundColor: textColor,
                        child: Text(buttonTextAction)),
                  ),
                ],
              ),
            ))
        : Container();
  }

  Widget displayWidget(BuildContext context) {
    switch (_processType) {
      case PROCESS_SUCCESS:
        return Column(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            renderData(),
            renderActionPanel(context),
          ],
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
        appBarTitle: PAGE_RC_DETAIL,
        child: !_ready
            ? const Center(child: CircularProgressIndicator())
            : displayWidget(context));
  }
}
