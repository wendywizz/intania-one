import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intl/intl.dart';

class ButtonDatepicker extends StatefulWidget {
  final Function onTapCallback;
  final String labelText;
  final DateTime? minimumDate;
  final DateTime? maximumDate;
  final bool required;
  final DateTime? value;

  const ButtonDatepicker({
    super.key,
    required this.onTapCallback,
    this.labelText = 'Select date',
    this.minimumDate,
    this.maximumDate,
    this.required = true,
    this.value,
  });

  @override
  State<ButtonDatepicker> createState() => _ButtonDatepickerState();
}

String formatDate(DateTime value) {
  return DateFormat('dd MMMM yyyy').format(value);
}

class _ButtonDatepickerState extends State<ButtonDatepicker> {
  final _controller = TextEditingController();
  DateTime? _value;

  @override
  void initState() {
    super.initState();

    if (widget.value != null) {
      final value = DateFormat('dd MMMM y').format(widget.value as DateTime);
      _controller.text = value.toString();

      setState(() {
        _value = widget.value!;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return CupertinoButton(
      padding: const EdgeInsets.symmetric(horizontal: 0),
      child: AbsorbPointer(
        child: TextFormField(
          controller: _controller,
          keyboardType: TextInputType.datetime,
          readOnly: true,
          decoration: InputDecoration(
            labelText: widget.labelText,
            prefixIcon: const Padding(
              padding: EdgeInsets.fromLTRB(0, 0, 6, 0),
              child: Icon(Icons.calendar_month),
            ),
            prefixIconConstraints: const BoxConstraints(maxWidth: 30),
          ),
          validator: widget.required
              ? (value) {
                  if (value == null || value.isEmpty) {
                    return TEXT_INPUT_REQUIRED;
                  }
                  return null;
                }
              : null,
        ),
      ),
      onPressed: () {
        if (_value != null) {}
        // Initial value first tap if no value

        showCupertinoModalPopup(
          context: context,
          builder: (BuildContext context) => SizedBox(
            height: 200,
            width: double.infinity,
            child: CupertinoDatePicker(
              initialDateTime: widget.minimumDate,
              minimumDate: widget.minimumDate,
              maximumDate: widget.maximumDate,
              backgroundColor: Colors.white,
              mode: CupertinoDatePickerMode.date,
              onDateTimeChanged: (value) {
                setState(() {
                  _value = value;
                });
                _controller.text = formatDate(_value!);

                widget.onTapCallback(_value);
              },
            ),
          ),
        );
      },
    );
  }
}
