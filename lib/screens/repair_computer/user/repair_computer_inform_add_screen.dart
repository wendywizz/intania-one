import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/models/result.dart';
import 'package:intania_staff_buddy/screens/repair_computer/repair_computer_screen.dart';
import 'package:intania_staff_buddy/screens/repair_computer/user/repair_computer_inform_form.dart';
import 'package:intania_staff_buddy/services/repair_computer_service.dart';
import 'package:intania_staff_buddy/utils/mixins/alert_mixin.dart';
import 'package:intania_staff_buddy/widgets/container_center.dart';
import 'package:intania_staff_buddy/widgets/template_blank.dart';

class RepairComputerInformAddScreen extends StatefulWidget {
  final String staffId;

  const RepairComputerInformAddScreen({
    super.key,
    required this.staffId,
  });

  @override
  State<RepairComputerInformAddScreen> createState() =>
      _RepairComputerInformAddScreenState();
}

class _RepairComputerInformAddScreenState
    extends State<RepairComputerInformAddScreen> with AlertMixin {
  bool _ready = false;
  bool _progressing = false;
  String? _processType;
  String? _responseMessage;

  @override
  void initState() {
    super.initState();

    void initData() async {
      String staffId = widget.staffId;
      String processType = '';
      String? message;

      Result result = await RepairComputerService().checkCanInform(staffId);
      processType = result.processType;
      message = result.message;

      setState(() {
        _ready = true;
        _processType = processType;
        _responseMessage = message.toString();
      });
    }

    initData();
  }

  void handleSubmit(Map<String, dynamic> data) {
    setState(() {
      _progressing = true;
    });
    Timer(CONNECTION_TIMEOUT, () async {
      Result result = await RepairComputerService().addData(data);
      setState(() {
        _progressing = false;
      });

      if (mounted) {
        showSnackBarByResult(context, result);

        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(
            builder: (context) => const RepairComputerScreen(
              activeTabIndex: TABINDEX_RC_USER_CURRENT,
            ),
          ),
          ((route) => false),
        );
      }
    });
  }

  Widget displayWidget() {
    switch (_processType) {
      case PROCESS_SUCCESS:
        return RepairComputerInformForm(
          staffId: widget.staffId,
          progressing: _progressing,
          showActionPanel: true,
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
      appBarTitle: PAGE_RC_INFORM,
      child: !_ready
          ? const Center(child: CircularProgressIndicator())
          : displayWidget(),
    );
  }
}
