import 'package:flutter/material.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:intania_staff_buddy/models/person.dart';

class InputAgent extends StatefulWidget {
  final Function onSelected;
  final List<Person>? data;
  final List<dynamic>? values;
  final List<String>? exceptValues;

  const InputAgent({
    super.key,
    required this.onSelected,
    this.data,
    this.values,
    this.exceptValues,
  });

  @override
  State<InputAgent> createState() => _InputAgentState();
}

class _InputAgentState extends State<InputAgent> {
  final GlobalKey<FormFieldState> _key = GlobalKey<FormFieldState>();

  List<Person> _listValues = [];
  Person? _selectedValues;
  bool _canAppend = false;

  @override
  void initState() {
    super.initState();

    if (widget.data != null && widget.values != null) {
      List<Person> selectedValue = widget.data!
          .where((Person data) => widget.values!.contains(data.staffId))
          .toList();

      setState(() {
        _listValues = selectedValue;
      });
      //callbackValue();
    }
  }

  void appendValue() {
    var setValues = _listValues.toSet();
    setValues.add(_selectedValues!);

    setState(() {
      _listValues = setValues.toList();
    });
    _key.currentState?.reset();
    callbackValue();
  }

  void removeValue(Person removeValue) {
    List<Person> values = _listValues;
    values.removeWhere((element) => element.staffId == removeValue.staffId);

    setState(() {
      _listValues = values;
    });
    callbackValue();
  }

  void callbackValue() {
    var values = <String>{};

    for (var i = 0; i < _listValues.length; i++) {
      values.add(_listValues[i].staffId);
    }
    widget.onSelected(values.toList());
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Flexible(
              child: DropdownButtonFormField(
                key: _key,
                items: widget.data?.map((value) {
                  return DropdownMenuItem(
                    value: value,
                    child: Text('${value.firstNameTH} ${value.lastNameTH}'),
                  );
                }).toList(),
                onChanged: (value) {
                  setState(() {
                    _canAppend = true;
                    _selectedValues = value;
                  });
                },
                decoration: const InputDecoration(
                  labelText: 'เลือกผู้ปฎิบัติงานแทน',
                ),
                validator: (value) {
                  if (_listValues.isEmpty) {
                    return 'Plz selected value';
                  }
                  return null;
                },
              ),
            ),
            const SizedBox(width: 20),
            SizedBox(
              width: 75,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 5),
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: Colors.grey,
                ),
                onPressed: _canAppend ? () => appendValue() : null,
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.add),
                    Text('เพิ่ม'),
                  ],
                ),
              ),
            )
          ],
        ),
        const SizedBox(height: 30),
        ListView.builder(
          scrollDirection: Axis.vertical,
          shrinkWrap: true,
          itemCount: _listValues.length,
          itemBuilder: (context, i) {
            return Slidable(
              endActionPane: ActionPane(
                motion: const ScrollMotion(),
                children: [
                  SlidableAction(
                    onPressed: (context) => removeValue(_listValues[i]),
                    backgroundColor: Colors.red,
                    foregroundColor: Colors.white,
                    icon: Icons.close,
                    label: 'ลบ',
                  ),
                ],
              ),
              child: ListTile(
                title: Text(
                    '${_listValues[i].firstNameTH} ${_listValues[i].lastNameTH}'),
                trailing: const Icon(Icons.chevron_left),
              ),
            );
          },
        ),
      ],
    );
  }
}
