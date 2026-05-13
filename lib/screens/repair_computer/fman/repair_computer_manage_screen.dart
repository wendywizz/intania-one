import 'package:flutter/material.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:intania_staff_buddy/constants/route.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/models/repair_computer.dart';
import 'package:intania_staff_buddy/models/result.dart';
import 'package:intania_staff_buddy/screens/repair_computer/fman/repair_computer_assign_select_type_screen.dart';
import 'package:intania_staff_buddy/screens/repair_computer/fman/repair_computer_manage_view_screen.dart';
import 'package:intania_staff_buddy/services/repair_computer_service.dart';
import 'package:intania_staff_buddy/utils/snack_message.dart';
import 'package:intania_staff_buddy/widgets/container_center.dart';
import 'package:intania_staff_buddy/widgets/list_item_repaircomputer.dart';

class RepairComputerManageScreen extends StatefulWidget {
  final String staffId;

  const RepairComputerManageScreen({
    super.key,
    required this.staffId,
  });

  @override
  State<RepairComputerManageScreen> createState() =>
      _RepairComputerManageScreenState();
}

class _RepairComputerManageScreenState
    extends State<RepairComputerManageScreen> {
  List<RepairComputer> _items = [];

  List<Widget> slideAction(String id, String status, int index) {
    switch (status) {
      case STATUS_RC_WAIT_WORKER:
        return [
          SlidableAction(
            backgroundColor: Colors.blue,
            foregroundColor: Colors.white,
            icon: Icons.description,
            onPressed: (BuildContext context) {
              String? action;

              switch (status) {
                case STATUS_RC_WAIT_WORKER:
                  action = STATUS_RC_WAIT_WORKER;
                  break;
                case STATUS_RC_WORKER_REJECT:
                  action = STATUS_RC_WORKER_REJECT;
                  break;
                default:
                  break;
              }

              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => RepairComputerManageViewScreen(
                    staffId: widget.staffId,
                    jobId: id,
                    action: action,
                  ),
                ),
              );
            },
          ),
          SlidableAction(
            backgroundColor: Colors.yellow,
            foregroundColor: Colors.white,
            icon: Icons.forward,
            onPressed: (BuildContext context) {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => RepairComputerAssignSelectTypeScreen(
                    jobId: id,
                  ),
                ),
              );
            },
          ),
          SlidableAction(
            backgroundColor: Colors.red,
            foregroundColor: Colors.white,
            icon: Icons.delete,
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
                      if (context.mounted) {
                        Navigator.of(context).pop(false);

                        Result result = await RepairComputerService()
                            .foremanUnassignJob(id);
                        String barType;
                        if (result.success) {
                          _items.removeAt(index);
                          barType = RESPONSE_TYPE_SUCCESS;
                        } else {
                          barType = RESPONSE_TYPE_ERROR;
                        }

                        if (context.mounted) {
                          SnackMessage(
                                  barType: barType,
                                  content: Text(result.message))
                              .show(context);
                        }
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
          )
        ];
      case STATUS_RC_WORKER_REJECT:
        return [
          SlidableAction(
            backgroundColor: Colors.blue,
            foregroundColor: Colors.white,
            icon: Icons.description,
            onPressed: (BuildContext context) {
              Navigator.pushNamed(context, rcForemanViewJob,
                  arguments: {'job': id});
            },
          ),
          SlidableAction(
            backgroundColor: Colors.red,
            foregroundColor: Colors.white,
            icon: Icons.close,
            onPressed: (BuildContext context) {
              showDialog<bool?>(
                context: context,
                builder: (BuildContext context) {
                  Widget okButton = ElevatedButton(
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
                                  barType: barType,
                                  content: Text(result.message))
                              .show(context);
                        }
                      }
                    },
                  );
                  AlertDialog alert = AlertDialog(
                    title: const Text(TITLE_RC_ACCEPT_FROM_REJECT),
                    content: const Text(MESSAGE_RC_ACCEPT_FROM_REJECT),
                    actions: [okButton],
                  );
                  return alert;
                },
              );
            },
          )
        ];
      default:
        return [
          SlidableAction(
            backgroundColor: Colors.blue,
            foregroundColor: Colors.white,
            icon: Icons.description,
            onPressed: (BuildContext context) {
              Navigator.pushNamed(context, rcForemanViewJob,
                  arguments: {'job': id});
            },
          )
        ];
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: RepairComputerService().listForemanManageJob(widget.staffId),
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
                      String jobId = _items[index].id;
                      String? supplyCode = _items[index].supplyCode;
                      String? statusValue = _items[index].status;
                      String statusName = _items[index].statusName.toString();
                      DateTime informDateTime = _items[index].informDateTime;

                      return Slidable(
                        endActionPane: ActionPane(
                          motion: const ScrollMotion(),
                          children: slideAction(jobId, statusValue, index),
                        ),
                        child: ListItemRepairComputer(
                            supplyCode: supplyCode,
                            statusValue: statusValue,
                            statusName: statusName,
                            informDateTime: informDateTime,
                            onTap: () {
                              String? action;

                              switch (statusValue) {
                                case STATUS_RC_WAIT_WORKER:
                                  action = STATUS_RC_WAIT_WORKER;
                                  break;
                                case STATUS_RC_WORKER_REJECT:
                                  action = STATUS_RC_WORKER_REJECT;
                                  break;
                                default:
                                  break;
                              }

                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) =>
                                      RepairComputerManageViewScreen(
                                    staffId: widget.staffId,
                                    jobId: jobId,
                                    action: action,
                                  ),
                                ),
                              );
                            }),
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
