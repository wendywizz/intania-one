import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/route.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/widgets/template_blank.dart';

class AbsentMenuScreen extends StatelessWidget {
  const AbsentMenuScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TemplateBlank(
      appBarTitle: PAGE_ABSENT_NEW,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            ElevatedButton(
              onPressed: () => Navigator.pushNamed(context, absentLeaveRoute),
              child: const Text(PAGE_ABSENT_LEAVE),
            ),
            ElevatedButton(
              onPressed: () =>
                  Navigator.pushNamed(context, absentBusinessRoute),
              child: const Text(PAGE_ABSENT_BUSINESS),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pushNamed(context, absentRelaxRoute),
              child: const Text(PAGE_ABSENT_RELAX),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pushNamed(context, absentBirthRoute),
              child: const Text(PAGE_ABSENT_BIRTH),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pushNamed(context, absentHajjRoute),
              child: const Text(PAGE_ABSENT_HAJJ),
            ),
          ],
        ),
      ),
    );
  }
}
