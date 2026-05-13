import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/app.dart';
import 'package:intania_staff_buddy/widgets/screen_webview.dart';

class RepairComputerApproveScreen extends StatelessWidget {
  final String staffId;

  const RepairComputerApproveScreen({
    super.key,
    required this.staffId,
  });

  @override
  Widget build(BuildContext context) {
    return const ScreenWebview(
      appId: RP_APP_ID,
      url: '$RP_URL?page=fman-approve',
    );
  }
}
