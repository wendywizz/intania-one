import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/app.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/widgets/screen_webview.dart';
import 'package:intania_staff_buddy/widgets/template_blank.dart';

class ForgetTimestampScreen extends StatelessWidget {
  const ForgetTimestampScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const TemplateBlank(
      appBarTitle: PAGE_FT,
      child: ScreenWebview(
        appId: PERSONNEL_APP_ID,
        url: '$PERSONNEL_URL?page=forgot_timestamp',
      ),
    );
  }
}
