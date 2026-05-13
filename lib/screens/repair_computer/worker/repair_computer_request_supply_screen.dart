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

class RepairComputerRequestSupplyScreen extends StatefulWidget {
  final String jobId;

  const RepairComputerRequestSupplyScreen({
    super.key,
    required this.jobId,
  });

  @override
  State<RepairComputerRequestSupplyScreen> createState() =>
      _RepairComputerRequestSupplyScreenState();
}

class _RepairComputerRequestSupplyScreenState
    extends State<RepairComputerRequestSupplyScreen> with AlertMixin {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _ctrlDetail = TextEditingController();
  bool _progressing = false;

  void handleSubmit(BuildContext context) {
    if (_formKey.currentState!.validate()) {
      setState(() {
        _progressing = true;
      });
      Timer(CONNECTION_TIMEOUT, () async {
        Result? result = await RepairComputerService()
            .requestSupply(widget.jobId, _ctrlDetail.text);

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
      appBarTitle: PAGE_RC_REQUEST_SUPPLY,
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
                      labelText: LABEL_RC_REQUEST_SUPPLY_DETAIL,
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return TEXT_INPUT_REQUIRED;
                      }
                      return null;
                    },
                  ),
                  const TextDescription(text: MESSAGE_RC_REQUEST_SUPPLY_DETAIL),
                ],
              ),
            ),
            Panel(
              child: Button(
                foregroundColor: Colors.white,
                backgroundColor: Colors.black,
                onPressed: () => handleSubmit(context),
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
