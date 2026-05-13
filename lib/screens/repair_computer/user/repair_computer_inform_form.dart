import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/models/repair_computer.dart';
import 'package:intania_staff_buddy/widgets/button.dart';
import 'package:intania_staff_buddy/widgets/text_description.dart';

class RepairComputerInformForm extends StatefulWidget {
  final String? id;
  final String staffId;
  final Function? onSubmit;
  final Function? onAlternatePressed;
  final bool progressing;
  final bool showActionPanel;
  final bool enableEditable;
  final String buttonTextAlternate;
  final RepairComputer? data;

  const RepairComputerInformForm({
    super.key,
    this.id,
    required this.staffId,
    this.onSubmit,
    this.onAlternatePressed,
    this.progressing = false,
    this.showActionPanel = false,
    this.enableEditable = true,
    this.buttonTextAlternate = '',
    this.data,
  });

  @override
  State<RepairComputerInformForm> createState() =>
      _RepairComputerInformFormState();
}

class _RepairComputerInformFormState extends State<RepairComputerInformForm> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _ctrlPhone = TextEditingController();
  final TextEditingController _ctrlSupplyCode = TextEditingController();
  final TextEditingController _ctrlDetail = TextEditingController();

  @override
  void initState() {
    super.initState();

    if (widget.id != '' && widget.data != null) {
      _ctrlPhone.text =
          widget.data!.phone != null ? widget.data!.phone.toString() : '';
      _ctrlSupplyCode.text = widget.data!.supplyCode != null
          ? widget.data!.supplyCode.toString()
          : '';
      _ctrlDetail.text =
          widget.data!.detail != null ? widget.data!.detail.toString() : '';
    }
  }

  void handleSubmit() async {
    if (_formKey.currentState!.validate()) {
      var data = {
        'staff_id': widget.staffId,
        'phone': _ctrlPhone.text,
        'supply_code': _ctrlSupplyCode.text,
        'detail': _ctrlDetail.text,
      };
      if (widget.onSubmit != null) {
        widget.onSubmit!(data);
      }
    }
  }

  void handleAlternatePressed() async {
    widget.onAlternatePressed!();
  }

  Widget form() {
    return SingleChildScrollView(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 15),
        child: Form(
          key: _formKey,
          autovalidateMode: AutovalidateMode.onUserInteraction,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextFormField(
                controller: _ctrlSupplyCode,
                readOnly: !widget.enableEditable,
                decoration: const InputDecoration(
                  labelText: LABEL_RC_SUPPLYCODE,
                  hintText: TEXT_INPUT_REQUIRED,
                ),
              ),
              const TextDescription(text: MESSAGE_RC_INPUT_SUPPLYCODE),
              const SizedBox(height: 40),
              TextFormField(
                controller: _ctrlDetail,
                readOnly: !widget.enableEditable,
                maxLines: 2,
                autofocus: false,
                textInputAction: TextInputAction.done,
                decoration: const InputDecoration(
                  labelText: LABEL_RC_DETAIL,
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return TEXT_INPUT_REQUIRED;
                  }
                  return null;
                },
              ),
              const SizedBox(height: 40),
              TextFormField(
                controller: _ctrlPhone,
                readOnly: !widget.enableEditable,
                decoration: const InputDecoration(
                  labelText: LABEL_RC_PHONE,
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return TEXT_INPUT_REQUIRED;
                  }
                  return null;
                },
              ),
              SizedBox(height: MediaQuery.of(context).size.height * 0.12),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        form(),
        widget.showActionPanel
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
                          progressing: widget.progressing,
                          onPressed: handleSubmit,
                          backgroundColor: Colors.black87,
                          foregroundColor: Colors.white,
                          child: widget.id != ''
                              ? const Text(TEXT_SAVE)
                              : const Text(TEXT_SUBMIT),
                        ),
                      ),
                      (widget.onAlternatePressed != null) &&
                              (widget.buttonTextAlternate.isNotEmpty)
                          ? Expanded(
                              child: Button(
                                progressing: widget.progressing,
                                onPressed: handleAlternatePressed,
                                backgroundColor: Colors.red,
                                foregroundColor: Colors.white,
                                child: Text(widget.buttonTextAlternate),
                              ),
                            )
                          : Container()
                    ],
                  ),
                ),
              )
            : Container()
      ],
    );
  }

  @override
  void dispose() {
    super.dispose();
    _ctrlDetail.clear();
    _ctrlPhone.clear();
    _ctrlSupplyCode.clear();
  }
}
