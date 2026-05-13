import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/models/person.dart';

class DropdownApprover extends StatefulWidget {
  final List<Person>? items;
  final String? defaultValue;
  final Function onSelected;

  const DropdownApprover({
    super.key,
    this.items,
    this.defaultValue,
    required this.onSelected,
  });

  @override
  State<DropdownApprover> createState() => _DropdownApproverState();
}

class _DropdownApproverState extends State<DropdownApprover> {
  String? _selectedValue;

  @override
  void initState() {
    super.initState();

    if (widget.defaultValue != null) {
      setState(() {
        _selectedValue = widget.defaultValue;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField(
      isExpanded: true,
      items: widget.items!
          .map(
            (value) => DropdownMenuItem(
              value: value.positionId,
              child: Text(
                '${value.positionName} (${value.firstNameTH} ${value.lastNameTH})',
              ),
            ),
          )
          .toList(),
      value: _selectedValue,
      onChanged: (value) {
        setState(() {
          _selectedValue = value.toString();
        });
        widget.onSelected(value);
      },
      decoration: InputDecoration(
        labelText: widget.items != null ? 'เลือกผู้อนุมัติ' : 'ไม่พบผู้อนุมัติ',
      ),
      validator: (value) {
        if (value == null) {
          return TEXT_INPUT_REQUIRED;
        }
        return null;
      },
    );
  }
}
