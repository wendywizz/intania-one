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

class RepairComputerReceiveJobRejectScreen extends StatefulWidget {
  final String jobId;

  const RepairComputerReceiveJobRejectScreen({
    super.key,
    required this.jobId,
  });

  @override
  State<RepairComputerReceiveJobRejectScreen> createState() =>
      _RepairComputerReceiveJobRejectScreenState();
}

class _RepairComputerReceiveJobRejectScreenState
    extends State<RepairComputerReceiveJobRejectScreen> with AlertMixin {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _ctrlReason = TextEditingController();

  bool _progressing = false;

  handleSubmit(BuildContext context) {
    if (_formKey.currentState!.validate()) {
      setState(() {
        _progressing = true;
      });
      Timer(CONNECTION_TIMEOUT, () async {
        Result? result = await RepairComputerService()
            .workerReceiveJob(widget.jobId, false, reason: _ctrlReason.text);

        setState(() {
          _progressing = false;
        });

        if (context.mounted) {
          showSnackBarByResult(context, result);

          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(
              builder: (context) => const RepairComputerScreen(
                activeTabIndex: TABINDEX_RC_WORKER_RECEIVE_JOB,
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
      appBarTitle: PAGE_RC_REJECTED_REASON,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 15),
            child: Form(
              key: _formKey,
              child: TextFormField(
                controller: _ctrlReason,
                decoration: const InputDecoration(
                  labelText: LABEL_RC_REJECTED_REASON,
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return TEXT_INPUT_REQUIRED;
                  }
                  return null;
                },
                maxLines: 2,
              ),
            ),
          ),
          Panel(
            child: Row(
              children: [
                Expanded(
                  child: Button(
                      progressing: _progressing,
                      onPressed: () {
                        handleSubmit(context);
                      },
                      child: const Text(TEXT_SUBMIT)),
                )
              ],
            ),
          )
        ],
      ),
    );
  }
}
