import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/models/absent.dart';
import 'package:intania_staff_buddy/utils/display_datetime.dart';
import 'package:intania_staff_buddy/widgets/container_center.dart';
import 'package:intania_staff_buddy/widgets/template_blank.dart';

class AbsentApprovingHistoryView extends StatelessWidget {
  final List<Absent>? data;
  const AbsentApprovingHistoryView({super.key, this.data});

  Widget getIcon(String absentType) {
    switch (absentType) {
      case TYPE_ABSENT_LEAVE:
        return const Icon(Icons.medical_services);
      case TYPE_ABSENT_BUSINESS:
        return const Icon(Icons.fact_check);
      case TYPE_ABSENT_RELAX:
        return const Icon(Icons.flight_takeoff);
      case TYPE_ABSENT_BIRTH:
        return const Icon(Icons.child_care);
      case TYPE_ABSENT_SOLDIER:
        return const Icon(Icons.military_tech);
      case TYPE_ABSENT_HAJJ:
        return const Icon(Icons.mosque);
      default:
        return const Icon(Icons.remove_circle);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (data != null) {
      List<Absent> absentData = data as List<Absent>;
      List<Absent> sortedData =
          List.from(absentData); // Create a copy of the list
      sortedData.sort((a, b) {
        return (b.startDate as DateTime).compareTo(a.startDate as DateTime);
      });

      return TemplateBlank(
        child: ListView.separated(
          itemCount: sortedData.length,
          itemBuilder: (context, index) {
            return ListTile(
              leading: getIcon(sortedData[index].absentType.toString()),
              title: Text(sortedData[index].absentTypeName.toString()),
              subtitle: Text(
                  '$TEXT_ABSENT_SINCE_DATE ${DisplayDateTime.beautyfulBetweenDate(sortedData[index].startDate as DateTime, sortedData[index].endDate as DateTime)}'
                  ' (${sortedData[index].absentDays} $TEXT_SUFFIX_DAY)'),
            );
          },
          separatorBuilder: (context, index) {
            return const Divider();
          },
        ),
      );
    } else {
      return const ContainerCenter(
        title: TITLE_NO_DATA,
        desc: MESSAGE_NO_DATA,
      );
    }
  }
}
