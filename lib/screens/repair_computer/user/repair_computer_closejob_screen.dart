import 'package:flutter/material.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/models/repair_computer.dart';
import 'package:intania_staff_buddy/models/result.dart';
import 'package:intania_staff_buddy/screens/repair_computer/user/repair_computer_inform_view_screen.dart';
import 'package:intania_staff_buddy/services/repair_computer_service.dart';
import 'package:intania_staff_buddy/utils/snack_message.dart';
import 'package:intania_staff_buddy/widgets/container_center.dart';
import 'package:intania_staff_buddy/widgets/list_item_repaircomputer.dart';

class RepairComputerCloseJobScreen extends StatefulWidget {
  final String staffId;
  const RepairComputerCloseJobScreen({
    super.key,
    required this.staffId,
  });

  @override
  State<RepairComputerCloseJobScreen> createState() =>
      _RepairComputerCloseJobScreenState();
}

class _RepairComputerCloseJobScreenState
    extends State<RepairComputerCloseJobScreen> {
  Widget slideActionButton(String id, String statusValue) {
    return SlidableAction(
      backgroundColor: Colors.green,
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
      future: RepairComputerService().getUncloseJob(widget.staffId),
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
                  final List<RepairComputer> data =
                      result.data as List<RepairComputer>;
                  return ListView.separated(
                    itemBuilder: (BuildContext context, int index) {
                      String id = data[index].id;
                      String? supplyCode = data[index].supplyCode;
                      String? statusValue = data[index].status;
                      String statusName = data[index].statusName.toString();
                      DateTime informDateTime = data[index].informDateTime;

                      return Slidable(
                          endActionPane: ActionPane(
                            motion: const ScrollMotion(),
                            children: [slideActionButton(id, statusValue)],
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
                                      RepairComputerInformViewScreen(
                                        staffId: widget.staffId,
                                        jobId: id,
                                      )),
                            ),
                          ));
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
          } else {
            return const ContainerCenter(title: MESSAGE_SERVER_ERROR);
          }
        }
      },
    );
  }
}
