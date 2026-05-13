import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/models/result.dart';

mixin AlertMixin {
  void showSnackBarByResult(BuildContext context, Result result) {
    var scaffold = ScaffoldMessenger.of(context);
    String respText = result.message;
    Icon icon;
    Color bgColor;

    if (result.message.isNotEmpty) {
      switch (result.success) {
        case true:
          icon = const Icon(Icons.check, color: Colors.white);
          bgColor = Colors.green;
          break;
        case false:
          icon = const Icon(Icons.remove, color: Colors.white);
          bgColor = Colors.red;
      }

      scaffold.showSnackBar(
        SnackBar(
          duration: CONNECTION_TIMEOUT,
          content: Row(
            children: [
              icon,
              const SizedBox(width: 5),
              Flexible(child: Text(respText)),
            ],
          ),
          //content: Text(respText),
          action: SnackBarAction(
              label: CHAR_CLOSE, onPressed: scaffold.hideCurrentSnackBar),
          backgroundColor: bgColor,
        ),
      );
    }
  }
}
