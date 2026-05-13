import 'package:flutter/material.dart';

class ListItemClass extends StatelessWidget {
  final String startTime;
  final String endTime;
  final String title;

  const ListItemClass({
    super.key,
    required this.startTime,
    required this.endTime,
    required this.title,
  });

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
                startTime,
              ),
              Text(
                style: const TextStyle(color: Colors.black, fontSize: 12.0),
                endTime,
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
