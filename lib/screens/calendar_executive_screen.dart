import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/app.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/widgets/screen_webview.dart';
import 'package:intania_staff_buddy/widgets/template_blank.dart';

class CalendarExecutiveScreen extends StatefulWidget {
  const CalendarExecutiveScreen({super.key});

  @override
  State<CalendarExecutiveScreen> createState() =>
      _CalendarExecutiveScreenState();
}

class _CalendarExecutiveScreenState extends State<CalendarExecutiveScreen> {
  @override
  Widget build(BuildContext context) {
    return const TemplateBlank(
      appBarTitle: PAGE_SCHEDULE_EXCUTIVE,
      child: ScreenWebview(
        appId: PERSONNEL_SCHEDULE_APP_ID,
        url: '$PERSONNEL_SCHEDULE_URL?page=exc',
      ),
    );
  }
}
