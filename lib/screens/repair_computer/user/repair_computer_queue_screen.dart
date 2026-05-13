import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/constants/uri.dart';
import 'package:intania_staff_buddy/models/result.dart';
import 'package:intania_staff_buddy/services/repair_computer_service.dart';
import 'package:intania_staff_buddy/widgets/container_center.dart';

class RepairComputerQueueScreen extends StatefulWidget {
  final String staffId;
  const RepairComputerQueueScreen({
    super.key,
    required this.staffId,
  });

  @override
  State<RepairComputerQueueScreen> createState() =>
      _RepairComputerQueueScreenState();
}

class _RepairComputerQueueScreenState extends State<RepairComputerQueueScreen> {
  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: RepairComputerService().workerQueue(),
      builder: (BuildContext context, AsyncSnapshot<Result> snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        } else {
          if (snapshot.hasError) {
            return const ContainerCenter(
                title: TITLE_ERROR, desc: MESSAGE_SERVER_ERROR);
          }
          Result result = snapshot.data!;

          switch (result.processType) {
            case PROCESS_SUCCESS:
              if (result.totalCount > 0) {
                final List data = result.data;
                return ListView.separated(
                  itemBuilder: (BuildContext context, int index) {
                    Map<String, dynamic> item = data[index];

                    return ListTile(
                      leading: Image.network(
                          '${PHOTO_URL + item['staffId']}.jpg',
                          width: 60,
                          height: 60),
                      title: Text('${item['workerFullname']}'),
                      subtitle: Text(item['jobCountDescription'],
                          style: TextStyle(
                            color: item['jobCount'] > 0
                                ? Colors.red
                                : Colors.black,
                          )),
                    );
                  },
                  separatorBuilder: (context, index) => const Divider(),
                  itemCount: result.totalCount,
                );
              } else {
                return const ContainerCenter(title: MESSAGE_NO_DATA);
              }
            default:
              return ContainerCenter(title: result.message);
          }
        }
      },
    );
  }
}
