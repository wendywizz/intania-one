import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/route.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/models/person.dart';
import 'package:intania_staff_buddy/models/repair_computer.dart';
import 'package:intania_staff_buddy/models/result.dart';
import 'package:intania_staff_buddy/screens/repair_computer/fman/repair_computer_manage_form.dart';
import 'package:intania_staff_buddy/services/auth_service.dart';
import 'package:intania_staff_buddy/services/repair_computer_service.dart';
import 'package:intania_staff_buddy/utils/mixins/alert_mixin.dart';
import 'package:intania_staff_buddy/widgets/button.dart';
import 'package:intania_staff_buddy/widgets/container_center.dart';
import 'package:intania_staff_buddy/widgets/panel.dart';
import 'package:intania_staff_buddy/widgets/row_detail.dart';
import 'package:intania_staff_buddy/widgets/template_blank.dart';
import 'package:intania_staff_buddy/widgets/heading.dart';
import 'package:provider/provider.dart';

class RepairComputerAssignConfirmScreen extends StatefulWidget {
  final String jobId;
  final Map<String, String> repairType;
  final Person worker;

  const RepairComputerAssignConfirmScreen({
    super.key,
    required this.jobId,
    required this.repairType,
    required this.worker,
  });

  @override
  State<RepairComputerAssignConfirmScreen> createState() =>
      _RepairComputerAssignConfirmScreenState();
}

class _RepairComputerAssignConfirmScreenState
    extends State<RepairComputerAssignConfirmScreen> with AlertMixin {
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

  void handleSubmit() {
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
            setState(() {
              _progressing = true;
            });
            Navigator.of(context).pop(false);

            Provider.of<AuthService>(context, listen: false).currentUser.then(
              (user) async {
                if (user != null) {
                  Result result = await RepairComputerService().assignJob(
                    widget.jobId,
                    widget.repairType['id'].toString(),
                    widget.worker.staffId,
                    user.staffId,
                  );
                  setState(() {
                    _progressing = false;
                  });

                  // ignore: use_build_context_synchronously
                  showSnackBarByResult(context, result);

                  if (result.success) {
                    // ignore: use_build_context_synchronously
                    Navigator.of(context).pushNamedAndRemoveUntil(
                        rcForemanManageRoute, (route) => false);
                  }
                } else {
                  // User data not found and return to HomeScreen and user must to re-login
                  showDialog<bool?>(
                      context: context,
                      builder: (BuildContext context) {
                        Widget okButton = ElevatedButton(
                          style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.blue,
                              foregroundColor: Colors.white),
                          child: const Text(TEXT_APPLY),
                          onPressed: () async {
                            await AuthService().logout();

                            if (context.mounted) {
                              Navigator.of(context).pushNamedAndRemoveUntil(
                                  rootRoute, (route) => false);
                            }
                          },
                        );

                        AlertDialog alert = AlertDialog(
                          title: const Text(TITLE_NO_USER),
                          content: const Text(MESSAGE_RE_LOGIN),
                          actions: [okButton],
                        );
                        return alert;
                      });
                }
              },
            );
          },
        );
        AlertDialog alert = AlertDialog(
          title: const Text(TITLE_RC_ASSIGN_CONFIRM),
          content: const Text(MESSAGE_RC_ASSIGN_JOB),
          actions: [yesButton, noButton],
        );
        return alert;
      },
    );
  }

  Widget renderData() {
    return Column(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 20),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 15),
                child: Heading(text: TITLE_RC_ASSIGN_CONFIRM),
              ),
              const SizedBox(height: 10),
              RowDetail(
                  title: LABEL_RC_WORKER,
                  description:
                      '${widget.worker.prefixNameTH}${widget.worker.firstNameTH} ${widget.worker.lastNameTH}'),
              RowDetail(
                  title: TEXT_RC_REPAIR_TYPE,
                  description: widget.repairType['name'].toString()),
              const SizedBox(height: 40),
              const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 15),
                  child: Heading(text: TITLE_RC_INFORM_DETAIL)),
              const SizedBox(height: 10),
              RepairComputerManageForm(data: _data, showAssignedWorker: false),
            ],
          ),
        ),
        Panel(
          child: Button(
            progressing: _progressing,
            backgroundColor: Colors.blue,
            foregroundColor: Colors.white,
            onPressed: handleSubmit,
            child: const Text(TEXT_RC_ASSIGN_JOB),
          ),
        ),
      ],
    );
  }

  Widget displayWidget() {
    switch (_processType) {
      case PROCESS_SUCCESS:
        return renderData();
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

  @override
  Widget build(BuildContext context) {
    return TemplateBlank(
      appBarTitle: PAGE_RC_ASSIGN_CONFIRM,
      child: !_ready
          ? const Center(child: CircularProgressIndicator())
          : Container(child: displayWidget()),
    );
  }
}
