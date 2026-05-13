import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/models/person.dart';
import 'package:intania_staff_buddy/widgets/image_thumbnail.dart';
import 'package:intania_staff_buddy/widgets/template_blank.dart';

class PersonDetailScreen extends StatelessWidget {
  const PersonDetailScreen({
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final args = ModalRoute.of(context)?.settings.arguments as Map;

    if (args.isNotEmpty) {
      final Person person = args['data'];

      return TemplateBlank(
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(vertical: 20),
              color: const Color(0xffdfe6e9),
              child: Center(
                child: ImageThumbnail(
                  imageUrl: person.getPhoto(),
                  height: 150,
                  width: 150,
                  shapeType: 'circular',
                ),
              ),
            ),
            Expanded(
              child: ListView(
                shrinkWrap: true,
                children: [
                  ListTile(
                    minLeadingWidth: 55,
                    leading: const Text('ชื่อ'),
                    title: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                            '${person.getPrefixName()! + person.firstNameTH} ${person.lastNameTH}'),
                        Text('${person.firstNameEN} ${person.lastNameEN}'),
                      ],
                    ),
                  ),
                  ListTile(
                    minLeadingWidth: 55,
                    leading: const Text('หน่วยงาน'),
                    title: person.deptName!.isNotEmpty
                        ? Text(person.deptName!)
                        : const Text('-'),
                  ),
                  ListTile(
                    minLeadingWidth: 55,
                    leading: const Text('โทรศัพท์'),
                    title: person.officeTel!.isNotEmpty
                        ? Text(person.officeTel!)
                        : const Text('-'),
                  ),
                  ListTile(
                    minLeadingWidth: 55,
                    leading: const Text('อีเมล'),
                    title: person.email!.isNotEmpty
                        ? Text(person.email!)
                        : const Text('-'),
                  )
                ],
              ),
            ),
          ],
        ),
      );
    } else {
      return const Center(
        child: Text('No argument passed'),
      );
    }
  }
}
