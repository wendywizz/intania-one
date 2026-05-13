import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/models/result.dart';
import 'package:intania_staff_buddy/screens/repair_computer/repair_computer_screen.dart';
import 'package:intania_staff_buddy/services/repair_computer_service.dart';
import 'package:intania_staff_buddy/utils/mixins/alert_mixin.dart';
import 'package:intania_staff_buddy/widgets/button.dart';
import 'package:intania_staff_buddy/widgets/panel.dart';
import 'package:intania_staff_buddy/widgets/template_blank.dart';
import 'package:intania_staff_buddy/widgets/text_description.dart';

class RepairComputerOperateDetailScreen extends StatefulWidget {
  final String staffId;
  final String jobId;

  const RepairComputerOperateDetailScreen({
    super.key,
    required this.jobId,
    required this.staffId,
  });

  @override
  State<RepairComputerOperateDetailScreen> createState() =>
      _RepairComputerOperateDetailScreenState();
}

class _RepairComputerOperateDetailScreenState
    extends State<RepairComputerOperateDetailScreen>
    with SingleTickerProviderStateMixin, AlertMixin {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _ctrlDetail = TextEditingController();
  final TextEditingController _ctrlSolve = TextEditingController();
  bool _progressing = false;

  void handleSubmit() {
    if (_formKey.currentState!.validate()) {
      setState(() {
        _progressing = true;
      });

      Timer(CONNECTION_TIMEOUT, () async {
        String repairDetail = _ctrlDetail.text;
        String solveDetail = _ctrlSolve.text;
        Result result = await RepairComputerService()
            .workerOperateJob(widget.jobId, repairDetail, solveDetail);
        setState(() {
          _progressing = false;
        });

        if (mounted) {
          showSnackBarByResult(context, result);

          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(
              builder: (context) => const RepairComputerScreen(
                activeTabIndex: TABINDEX_RC_WORKER_CURRENT_JOB,
              ),
            ),
            ((route) => false),
          );
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return TemplateBlank(
      appBarTitle: TITLE_RC_OPERATE_DETAIL,
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 15),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextFormField(
                    controller: _ctrlDetail,
                    maxLines: 2,
                    autofocus: false,
                    textInputAction: TextInputAction.done,
                    decoration: const InputDecoration(
                      labelText: LABEL_RC_OPERATE_DETAIL,
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return TEXT_INPUT_REQUIRED;
                      }
                      return null;
                    },
                  ),
                  const TextDescription(text: MESSAGE_RC_OPERATE_DETAIL),
                  const SizedBox(height: 40),
                  TextFormField(
                    controller: _ctrlSolve,
                    maxLines: 2,
                    autofocus: false,
                    textInputAction: TextInputAction.done,
                    decoration: const InputDecoration(
                      labelText: LABEL_RC_OPERATE_SOLVE,
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return TEXT_INPUT_REQUIRED;
                      }
                      return null;
                    },
                  ),
                  const TextDescription(text: MESSAGE_RC_OPERATE_SOLVE),
                ],
              ),
            ),
            Panel(
              child: Button(
                foregroundColor: Colors.white,
                backgroundColor: Colors.black,
                onPressed: handleSubmit,
                progressing: _progressing,
                child: const Text(TEXT_SUBMIT),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
