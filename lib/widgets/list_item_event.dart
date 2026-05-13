import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/widgets/leading_datetime.dart';

class ListEventItem extends StatelessWidget {
  final VoidCallback? onTap;
  final DateTime date;
  final String title;
  final String? subTitle;

  const ListEventItem({
    super.key,
    this.onTap,
    required this.date,
    required this.title,
    this.subTitle,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Card(
        margin: const EdgeInsets.only(bottom: 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 70,
              alignment: Alignment.center,
              padding: const EdgeInsets.fromLTRB(5, 10, 5, 10),
              child: LeadingDatetime(dateValue: date),
            ),
            Expanded(
              child: Container(
                padding: const EdgeInsets.fromLTRB(5, 12, 5, 12),
                child: Text(
                  title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  softWrap: false,
                  style: const TextStyle(
                    fontSize: 14,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
