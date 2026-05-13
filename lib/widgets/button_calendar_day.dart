import 'dart:core';
import 'package:flutter/material.dart';

typedef DateTimeCallback = void Function(DateTime text);

class ButtonCalendarDay extends StatelessWidget {
  final String dayName;
  final String day;
  final String month;
  final String year;
  final bool active;
  final DateTimeCallback onPressed;

  const ButtonCalendarDay({
    super.key,
    required this.dayName,
    required this.day,
    required this.month,
    required this.year,
    this.active = false,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      style: ElevatedButton.styleFrom(
        shape: const BeveledRectangleBorder(
          borderRadius: BorderRadius.zero,
        ),
        elevation: 5,
        backgroundColor: !active ? Colors.transparent : Colors.blue,
        shadowColor: Colors.transparent,
      ),
      onPressed: () {
        final dateValue =
            DateTime(int.parse(year), int.parse(month), int.parse(day));
        onPressed(dateValue);
      },
      child: Column(
        children: [
          Text(
            dayName,
            style: TextStyle(
              color: !active ? Colors.red : Colors.yellow,
              fontSize: 14,
            ),
          ),
          Text(
            day.padLeft(2, '0'),
            style: TextStyle(
              height: 1.3,
              color: !active ? Colors.black : Colors.white,
              fontSize: 24,
            ),
          ),
          Text(
            "${month.padLeft(2, '0')}/$year",
            style: TextStyle(
              color: !active ? Colors.black : Colors.white,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}
