import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/utils/display_datetime.dart';
import 'package:intl/intl.dart';

class CardNews extends StatelessWidget {
  final String title;
  final DateTime? pubDate;

  const CardNews({
    super.key,
    required this.title,
    this.pubDate,
  });

  @override
  Widget build(BuildContext context) {
    String parsedTitle =
        Bidi.stripHtmlIfNeeded(title.toString()).replaceAll(' ', '');
    String? formattedDate;

    if (pubDate != null) {
      formattedDate = DisplayDateTime.formatDateTime(pubDate as DateTime);
    }

    return Card(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 30, horizontal: 15),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(parsedTitle,
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            formattedDate != null
                ? Column(
                    children: [
                      const SizedBox(height: 10),
                      Text(
                        formattedDate,
                        textAlign: TextAlign.end,
                      ),
                    ],
                  )
                : Container()
          ],
        ),
      ),
    );
  }
}
