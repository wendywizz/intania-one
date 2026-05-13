import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/text.dart';

class Alert extends Dialog {
  const Alert({super.key});

  void showMessage(BuildContext context, String message) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        Widget closeButton = ElevatedButton(
          child: const Text(TEXT_CLOSE),
          onPressed: () {
            Navigator.of(context).pop(false);
          },
        );
        AlertDialog alert = AlertDialog(
          content: Text(message),
          actions: [closeButton],
        );
        return alert;
      },
    );
  }
}
