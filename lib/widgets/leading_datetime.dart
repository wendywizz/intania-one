import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class LeadingDatetime extends StatelessWidget {
  final DateTime dateValue;
  final String leadingType;
  final bool isBEYear;
  final Color backgroundColor;
  final Color yearColor;
  final Color monthColor;
  final Color dayColor;
  final Color timeColor;
  final String timeLabel;
  final Color timeLabelColor;

  const LeadingDatetime({
    super.key,
    required this.dateValue,
    this.leadingType = 'date',
    this.isBEYear = false,
    this.backgroundColor = Colors.transparent,
    this.yearColor = Colors.black,
    this.monthColor = Colors.red,
    this.dayColor = Colors.black,
    this.timeColor = Colors.black,
    this.timeLabel = 'เริ่มเวลา',
    this.timeLabelColor = Colors.red,
  });

  Widget labelTime() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Text(
          timeLabel,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 10.0,
            color: timeLabelColor,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          DateFormat('HH:mm').format(dateValue),
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 18.0,
            fontWeight: FontWeight.w600,
            color: timeColor,
          ),
        ),
      ],
    );
  }

  Widget labelDate() {
    return Container(
      decoration: BoxDecoration(color: backgroundColor),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text(
            DateFormat('MMM').format(dateValue),
            textAlign: TextAlign.center,
            style: TextStyle(
              color: monthColor,
              fontSize: 12,
            ),
          ),
          Text(
            dateValue.day.toString().padLeft(2, '0'),
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 24.0,
              fontWeight: FontWeight.w600,
              height: 1,
              color: dayColor,
            ),
          ),
          Text(
            isBEYear
                ? (dateValue.year + 543).toString()
                : dateValue.year.toString(),
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 10,
              color: yearColor,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return leadingType == 'time' ? labelTime() : labelDate();
  }
}
