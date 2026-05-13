import 'package:flutter/material.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/models/repair_computer.dart';
import 'package:intania_staff_buddy/models/result.dart';
import 'package:intania_staff_buddy/screens/repair_computer/user/repair_computer_inform_add_screen.dart';
import 'package:intania_staff_buddy/screens/repair_computer/user/repair_computer_inform_edit_screen.dart';
import 'package:intania_staff_buddy/screens/repair_computer/user/repair_computer_inform_view_screen.dart';
import 'package:intania_staff_buddy/services/repair_computer_service.dart';
import 'package:intania_staff_buddy/utils/snack_message.dart';
import 'package:intania_staff_buddy/widgets/container_center.dart';
import 'package:intania_staff_buddy/widgets/list_item_repaircomputer.dart';

class RepairComputerCurrentScreen extends StatefulWidget {
  final String staffId;

  const RepairComputerCurrentScreen({
    super.key,
    required this.staffId,
  });

  @override
  State<RepairComputerCurrentScreen> createState() =>
      _RepairComputerCurrentScreenState();
}

class _RepairComputerCurrentScreenState
    extends State<RepairComputerCurrentScreen> {
  List<RepairComputer> _items = [];

  Widget slideActionButton(String id, String status) {
    switch (status) {
      case STATUS_RC_NEW_JOB:
        return SlidableAction(
          backgroundColor: Colors.red,
          foregroundColor: Colors.white,
          icon: Icons.archive,
          label: TEXT_CANCEL,
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
                    backgroundColor: Colors.red,
                    foregroundColor: Colors.white,
                  ),
                  child: const Text(TEXT_YES),
                  onPressed: () async {
                    Navigator.of(context).pop(false);

                    Result result = await RepairComputerService().removeJob(id);
                    String barType;
                    if (result.success) {
                      barType = RESPONSE_TYPE_SUCCESS;
                      _items.removeAt(0);
                    } else {
                      barType = RESPONSE_TYPE_ERROR;
                    }

                    if (context.mounted) {
                      SnackMessage(
                              barType: barType, content: Text(result.message))
                          .show(context);
                    }
                  },
                );
                AlertDialog alert = AlertDialog(
                  title: const Text(TITLE_RC_CANCEL_JOB),
                  content: const Text(MESSAGE_RC_CANCEL_JOB),
                  actions: [yesButton, noButton],
                );
                return alert;
              },
            );
          },
        );
      case STATUS_RC_WAIT_CLOSEJOB:
      case STATUS_RC_REJECT:
      case STATUS_RC_WORKER_REJECT:
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

                      Result result =
                          await RepairComputerService().closeJob(id);
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
      default:
        return Container();
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: RepairComputerService().getUserCurrentJob(widget.staffId),
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
                          children: [slideActionButton(id, statusValue)],
                        ),
                        child: ListItemRepairComputer(
                            supplyCode: supplyCode,
                            statusValue: statusValue,
                            statusName: statusName,
                            informDateTime: informDateTime,
                            onTap: () {
                              if (statusValue == STATUS_RC_NEW_JOB) {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) =>
                                        RepairComputerInformEditScreen(
                                      staffId: widget.staffId,
                                      jobId: id,
                                    ),
                                  ),
                                );
                              } else {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) =>
                                        RepairComputerInformViewScreen(
                                      staffId: widget.staffId,
                                      jobId: id,
                                    ),
                                  ),
                                );
                              }
                            }),
                      );
                    },
                    separatorBuilder: (context, index) => const Divider(),
                    itemCount: result.totalCount,
                  );
                } else {
                  return Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const ContainerCenter(
                        title: TITLE_NO_DATA,
                        desc: MESSAGE_RC_NO_DATA,
                      ),
                      const SizedBox(height: 10),
                      ElevatedButton(
                          onPressed: () => Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => RepairComputerInformAddScreen(
                                    staffId: widget.staffId,
                                  ),
                                ),
                              ),
                          child: const Text(TEXT_RC_ADDJOB))
                    ],
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
