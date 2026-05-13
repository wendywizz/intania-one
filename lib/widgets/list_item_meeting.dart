import 'package:flutter/material.dart';

class ListItemMeeting extends StatelessWidget {
  final String title;
  final String date;
  final String time;

  const ListItemMeeting(
      {super.key, required this.title, required this.date, required this.time});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ListTile(
          contentPadding:
              const EdgeInsets.symmetric(vertical: 8.0, horizontal: 8.0),
          leading: Container(
            width: 60,
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey),
            ),
            child: Column(children: [
              Text(
                style: const TextStyle(
                  color: Colors.red,
                  fontSize: 16.0,
                  fontWeight: FontWeight.w600,
                ),
                date,
              ),
              Text(
                style: const TextStyle(color: Colors.black, fontSize: 12.0),
                time,
              )
            ]),
          ),
          title: Text(title),
        ),
        const Divider(),
      ],
    );
  }
}
