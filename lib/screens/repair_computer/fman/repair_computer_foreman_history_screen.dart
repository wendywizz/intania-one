import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/models/repair_computer.dart';
import 'package:intania_staff_buddy/models/result.dart';
import 'package:intania_staff_buddy/screens/repair_computer/fman/repair_computer_manage_view_screen.dart';
import 'package:intania_staff_buddy/services/repair_computer_service.dart';
import 'package:intania_staff_buddy/widgets/container_center.dart';
import 'package:intania_staff_buddy/widgets/list_item_repaircomputer.dart';

class RepairComputerForemanHistoryScreen extends StatefulWidget {
  final String staffId;

  const RepairComputerForemanHistoryScreen({
    super.key,
    required this.staffId,
  });

  @override
  State<RepairComputerForemanHistoryScreen> createState() =>
      _RepairComputerForemanHistoryScreenState();
}

class _RepairComputerForemanHistoryScreenState
    extends State<RepairComputerForemanHistoryScreen> {
  List<RepairComputer> _items = [];

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: RepairComputerService().listForemanHistory(widget.staffId),
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

                      return ListItemRepairComputer(
                          supplyCode: supplyCode,
                          statusValue: statusValue,
                          statusName: statusName,
                          informDateTime: informDateTime,
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => RepairComputerManageViewScreen(
                                  staffId: widget.staffId,
                                  jobId: jobId,
                                ),
                              ),
                            );
                          });
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
