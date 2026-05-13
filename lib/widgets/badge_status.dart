import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/app.dart';

class BadgeStatus extends StatelessWidget {
  final String appId;
  final String? statusValue;

  const BadgeStatus({
    super.key,
    required this.appId,
    this.statusValue,
  });

  Widget renderRepairComputerStatus() {
    Color backgroundColor;
    Icon icon;

    switch (statusValue) {
      case '0':
      case '2':
        backgroundColor = Colors.yellow;
        icon = const Icon(
          Icons.schedule,
          color: Colors.black,
        );
        break;
      case '2.1':
      case '6':
        backgroundColor = Colors.red;
        icon = const Icon(Icons.close, color: Colors.white);
        break;
      case '3':
        backgroundColor = Colors.blue;
        icon = const Icon(Icons.done, color: Colors.white);
        break;
      case '4':
      case '4.2':
        backgroundColor = Colors.blue;
        icon = const Icon(Icons.sync, color: Colors.white);
        break;
      case '4.3':
        backgroundColor = Colors.yellow;
        icon = const Icon(Icons.arrow_forward, color: Colors.black);
        break;
      case '4.1':
      case '5':
        backgroundColor = Colors.green;
        icon = const Icon(Icons.done, color: Colors.white);
        break;
      case '7':
      case '7.1':
        backgroundColor = Colors.yellow;
        icon = const Icon(Icons.pending_actions, color: Colors.black);
        break;
      case '7.2':
        backgroundColor = Colors.red;
        icon = const Icon(Icons.block, color: Colors.white);
        break;
      default:
        backgroundColor = Colors.grey;
        icon = const Icon(Icons.remove, color: Colors.black);
        break;
    }
    return circleShape(icon, backgroundColor);
  }

  Widget circleShape(Widget child, Color backgroundColor) {
    return Container(
      padding: const EdgeInsets.all(6),
      width: 64,
      height: 80,
      decoration: BoxDecoration(shape: BoxShape.circle, color: backgroundColor),
      child: child,
    );
  }

  Widget unknownStatus() {
    return circleShape(
      const Icon(Icons.remove, color: Colors.black),
      Colors.grey,
    );
  }

  @override
  Widget build(BuildContext context) {
    switch (appId) {
      case RP_APP_ID:
        return renderRepairComputerStatus();
      default:
        return unknownStatus();
    }
  }
}
