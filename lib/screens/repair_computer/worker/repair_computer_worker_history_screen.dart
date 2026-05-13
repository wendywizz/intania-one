import 'package:flutter/material.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/models/repair_computer.dart';
import 'package:intania_staff_buddy/models/result.dart';
import 'package:intania_staff_buddy/screens/repair_computer/fman/repair_computer_assign_screen.dart';
import 'package:intania_staff_buddy/screens/repair_computer/worker/repair_computer_worker_history_view_screen.dart';
import 'package:intania_staff_buddy/services/repair_computer_service.dart';
import 'package:intania_staff_buddy/widgets/container_center.dart';
import 'package:intania_staff_buddy/widgets/list_item_repaircomputer.dart';

class RepairComputerWorkerHistoryScreen extends StatefulWidget {
  final String staffId;

  const RepairComputerWorkerHistoryScreen({
    super.key,
    required this.staffId,
  });

  @override
  State<RepairComputerWorkerHistoryScreen> createState() =>
      _RepairComputerWorkerHistoryScreenState();
}

class _RepairComputerWorkerHistoryScreenState
    extends State<RepairComputerWorkerHistoryScreen> {
  List<RepairComputer> _items = [];

  Widget slideAction(String id) {
    return SlidableAction(
      backgroundColor: Colors.blue,
      foregroundColor: Colors.white,
      icon: Icons.check_circle,
      label: TEXT_RC_VIEW,
      onPressed: (BuildContext context) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => RepairComputerAssignScreen(id: id),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: RepairComputerService().listWorkerHistory(widget.staffId),
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
                                  RepairComputerWorkerHistoryViewScreen(
                                      jobId: id),
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
