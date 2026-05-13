import 'package:flutter/material.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/models/repair_computer.dart';
import 'package:intania_staff_buddy/models/result.dart';
import 'package:intania_staff_buddy/screens/repair_computer/fman/repair_computer_assign_screen.dart';
import 'package:intania_staff_buddy/services/repair_computer_service.dart';
import 'package:intania_staff_buddy/utils/snack_message.dart';
import 'package:intania_staff_buddy/widgets/container_center.dart';
import 'package:intania_staff_buddy/widgets/list_item_repaircomputer.dart';

class RepairComputerNewJobScreen extends StatefulWidget {
  const RepairComputerNewJobScreen({super.key});

  @override
  State<RepairComputerNewJobScreen> createState() =>
      _RepairComputerNewJobScreenState();
}

class _RepairComputerNewJobScreenState
    extends State<RepairComputerNewJobScreen> {
  List<RepairComputer> _items = [];

  Widget slideAction(String id) {
    return SlidableAction(
      backgroundColor: Colors.blue,
      foregroundColor: Colors.white,
      icon: Icons.check_circle,
      label: TEXT_RC_CLOSE_JOB,
      onPressed: (BuildContext context) {
        showDialog<bool?>(
          context: context,
          builder: (BuildContext context) {
            Widget noButton = ElevatedButton(
              child: const Text(TEXT_NO),
              onPressed: () {
                Navigator.of(context).pop(false);
              },
            );
            Widget yesButton = ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue,
                foregroundColor: Colors.white,
              ),
              child: const Text(TEXT_YES),
              onPressed: () async {
                if (context.mounted) {
                  Navigator.of(context).pop(false);

                  Result result = await RepairComputerService().closeJob(id);
                  String barType;
                  if (result.success) {
                    barType = RESPONSE_TYPE_INFO;
                  } else {
                    barType = RESPONSE_TYPE_ERROR;
                  }

                  if (context.mounted) {
                    SnackMessage(
                            barType: barType, content: Text(result.message))
                        .show(context);
                  }
                }
              },
            );
            AlertDialog alert = AlertDialog(
              title: const Text(TITLE_RC_CLOSEJOB),
              content: const Text(MESSAGE_RC_CLOSEJOB),
              actions: [yesButton, noButton],
            );
            return alert;
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: RepairComputerService().listForemanNewJob(),
      builder: (BuildContext context, AsyncSnapshot<Result> snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        } else if (snapshot.connectionState == ConnectionState.done ||
            snapshot.connectionState == ConnectionState.active) {
          if (snapshot.hasError) {
            return const ContainerCenter(
              title: TITLE_ERROR,
              desc: MESSAGE_SERVER_ERROR,
            );
          }
        }

        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        } else {
          if (snapshot.hasError) {
            return const ContainerCenter(
              title: TITLE_ERROR,
              desc: MESSAGE_SERVER_ERROR,
            );
          }
          if (snapshot.hasData) {
            Result result = snapshot.data!;

            switch (result.processType) {
              case PROCESS_SUCCESS:
                if (result.totalCount > 0) {
                  _items = result.data as List<RepairComputer>;

                  return ListView.separated(
                    itemBuilder: (BuildContext context, int index) {
                      String id = _items[index].id;
                      String? supplyCode = _items[index].supplyCode;
                      String? statusValue = _items[index].status;
                      String statusName = _items[index].statusName.toString();
                      DateTime informDateTime = _items[index].informDateTime;

                      return Slidable(
                        endActionPane: ActionPane(
                          motion: const ScrollMotion(),
                          children: [slideAction(id)],
                        ),
                        child: ListItemRepairComputer(
                          supplyCode: supplyCode,
                          statusValue: statusValue,
                          statusName: statusName,
                          informDateTime: informDateTime,
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) =>
                                  RepairComputerAssignScreen(id: id),
                            ),
                          ),
                        ),
                      );
                    },
                    separatorBuilder: (context, index) => const Divider(),
                    itemCount: result.totalCount,
                  );
                } else {
                  return const ContainerCenter(
                    title: TITLE_NO_DATA,
                    desc: MESSAGE_RC_NO_DATA,
                  );
                }
              default:
                return ContainerCenter(title: result.message);
            }
          } else {
            return const ContainerCenter(title: MESSAGE_SERVER_ERROR);
          }
        }
      },
    );
  }
}
