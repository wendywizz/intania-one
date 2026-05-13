import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/variable.dart';

class DropdownHalfDay extends StatefulWidget {
  final String? labelText;
  final Function onSelected;
  final String? value;

  const DropdownHalfDay({
    super.key,
    this.labelText,
    required this.onSelected,
    this.value,
  });

  @override
  State<DropdownHalfDay> createState() => _DropdownHalfDayState();
}

class _DropdownHalfDayState extends State<DropdownHalfDay> {
  String? _value;

  @override
  void initState() {
    super.initState();

    if (widget.value != null) {
      setState(() {
        _value = widget.value!;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField(
      value: _value,
      items: HALF_DAYPART_LIST
          .map(
            (value) => DropdownMenuItem(
              value: value['value'],
              child: Text(value['label']!),
            ),
          )
          .toList(),
      onChanged: (value) {
        setState(() => _value = value);
        widget.onSelected(value);
      },
      decoration: InputDecoration(
        labelText: widget.labelText,
      ),
    );
  }
}
