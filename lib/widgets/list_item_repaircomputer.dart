import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/app.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/utils/display_datetime.dart';
import 'package:intania_staff_buddy/widgets/badge_status.dart';

class ListItemRepairComputer extends StatelessWidget {
  final String statusValue;
  final String statusName;
  final String? supplyCode;
  final DateTime informDateTime;
  final VoidCallback? onTap;

  const ListItemRepairComputer({
    super.key,
    required this.statusValue,
    required this.statusName,
    this.supplyCode,
    required this.informDateTime,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    String? dateTime = DisplayDateTime.formatDate(informDateTime);

    return ListTile(
      leading: BadgeStatus(
        appId: RP_APP_ID,
        statusValue: statusValue,
      ),
      title: supplyCode!.isNotEmpty
          ? Text(supplyCode!, style: const TextStyle(fontSize: 16))
          : const Text(TEXT_RC_NO_SUPPLYCODE, style: TextStyle(fontSize: 16)),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 5),
          Row(
            children: [
              const SizedBox(
                width: 58,
                child: Text(TEXT_DATE_LABEL),
              ),
              const SizedBox(width: 10),
              Text(dateTime)
            ],
          ),
          const SizedBox(height: 3),
          Row(
            children: [
              const SizedBox(
                width: 58,
                child: Text(TEXT_STATUS_LABEL),
              ),
              const SizedBox(width: 10),
              Flexible(
                  child: Text(
                statusName.toString(),
                overflow: TextOverflow.clip,
                maxLines: 1,
                softWrap: false,
                textAlign: TextAlign.left,
              )),
            ],
          ),
        ],
      ),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }
}
