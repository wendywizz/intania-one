import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/services/absent_approve_service.dart';
import 'package:intania_staff_buddy/widgets/button.dart';
import 'package:intania_staff_buddy/widgets/panel.dart';
import 'package:intania_staff_buddy/widgets/template_blank.dart';

class AbsentApprovingNotApproveView extends StatefulWidget {
  final String id;
  final String approveId;
  final String type;

  const AbsentApprovingNotApproveView({
    super.key,
    required this.id,
    required this.approveId,
    required this.type,
  });

  @override
  State<AbsentApprovingNotApproveView> createState() =>
      _AbsentApprovingNotApproveViewState();
}

class _AbsentApprovingNotApproveViewState
    extends State<AbsentApprovingNotApproveView> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _ctrlReason = TextEditingController();
  bool _progressing = false;

  void handleAction() async {
    switch (widget.type) {
      case TYPE_ABSENT_APPROVE_ABSENT:
        break;
      case TYPE_ABSENT_APPROVE_MISS_TIMESTAMP:
        Map data = {
          'approve_id': widget.approveId,
          'status': '0',
        };
        await AbsentApproveService()
            .submitApproveMissTimestamp(widget.id, data);
        break;
      default:
        return;
    }
  }

  void handleSubmit(BuildContext context) {
    setState(() {
      _progressing = true;
    });

    showDialog(
      context: context,
      builder: (BuildContext context) {
        Widget noButton = ElevatedButton(
          child: const Text(TEXT_NO),
          onPressed: () {
            Navigator.of(context).pop(false);
            setState(() {
              _progressing = false;
            });
          },
        );
        Widget yesButton = ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.blue,
            foregroundColor: Colors.white,
          ),
          child: const Text(TEXT_YES),
          onPressed: () async {
            handleAction();
            if (context.mounted) {
              Navigator.of(context).pop(false);
            }
          },
        );
        AlertDialog alert = AlertDialog(
          title: const Text(TITLE_ABSENT_CONFIRM_APPROVE),
          content: const Text(MESSAGE_ABSENT_CONFIRM_APPROVE),
          actions: [yesButton, noButton],
        );
        return alert;
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return TemplateBlank(
      appBarTitle: 'ไม่อนุมัติ',
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
                  labelText: 'สาเหตุที่ไม่อนุมติ',
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
