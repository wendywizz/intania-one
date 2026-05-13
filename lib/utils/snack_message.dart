import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/constants/variable.dart';

class SnackMessage extends SnackBar {
  final String? barType;
  final Icon? icon;

  const SnackMessage({
    super.key,
    required super.content,
    this.icon,
    this.barType = 'default',
  });

  show(BuildContext context) {
    Color bgColor;
    Icon displayIcon;
    switch (barType) {
      case RESPONSE_TYPE_SUCCESS:
        displayIcon = const Icon(Icons.check, color: Colors.white);
        bgColor = Colors.green;
        break;
      case RESPONSE_TYPE_ERROR:
        displayIcon = const Icon(Icons.check, color: Colors.white);
        bgColor = Colors.red;
        break;
      case RESPONSE_TYPE_WARNING:
        displayIcon = const Icon(Icons.check, color: Colors.white);
        bgColor = Colors.yellow;
        break;
      case RESPONSE_TYPE_INFO:
        displayIcon = const Icon(Icons.info_outline, color: Colors.white);
        bgColor = Colors.cyan;
      case RESPONSE_TYPE_DEFAULT:
      default:
        displayIcon = const Icon(Icons.check, color: Colors.white);
        bgColor = Colors.black;
        break;
    }

    if (icon != null) {
      displayIcon = icon!;
    }

    var scaffold = ScaffoldMessenger.of(context);
    scaffold.showSnackBar(SnackBar(
      duration: const Duration(milliseconds: 1000),
      content: Row(
        children: [displayIcon, const SizedBox(width: 5), content],
      ),
      action: SnackBarAction(
        label: CHAR_CLOSE,
        onPressed: () => {},
      ),
      backgroundColor: bgColor,
    ));
  }
}
