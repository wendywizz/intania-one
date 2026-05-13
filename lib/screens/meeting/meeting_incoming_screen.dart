import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/screens/meeting/meeting_content_screen.dart';

class MeetingIncomingScreen extends StatelessWidget {
  const MeetingIncomingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const MeetingContentScreen(
        displayType: TYPE_CONTENT_MEETING_INCOMING);
  }
}
