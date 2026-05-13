import 'package:flutter/material.dart';

class RowDetail extends StatelessWidget {
  final String title;
  final String description;
  final int titleFlexSize;
  final int descriptionFlexSize;

  const RowDetail({
    super.key,
    required this.title,
    required this.description,
    this.titleFlexSize = 2,
    this.descriptionFlexSize = 3,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(15),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: titleFlexSize,
            child: Text(
              title,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          Expanded(
              flex: descriptionFlexSize,
              child: Text(
                description,
                style: const TextStyle(fontSize: 14),
              ))
        ],
      ),
    );
  }
}
