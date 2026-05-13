import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/models/repair_computer.dart';
import 'package:intania_staff_buddy/models/result.dart';
import 'package:intania_staff_buddy/screens/repair_computer/worker/repair_computer_operate_form.dart';
import 'package:intania_staff_buddy/services/repair_computer_service.dart';
import 'package:intania_staff_buddy/widgets/container_center.dart';
import 'package:intania_staff_buddy/widgets/template_blank.dart';

class RepairComputerWorkerHistoryViewScreen extends StatefulWidget {
  final String jobId;

  const RepairComputerWorkerHistoryViewScreen({
    super.key,
    required this.jobId,
  });

  @override
  State<RepairComputerWorkerHistoryViewScreen> createState() =>
      _RepairComputerWorkerHistoryViewState();
}

class _RepairComputerWorkerHistoryViewState
    extends State<RepairComputerWorkerHistoryViewScreen> {
  bool _ready = false;
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
              ],
            ),
    );
  }
}
