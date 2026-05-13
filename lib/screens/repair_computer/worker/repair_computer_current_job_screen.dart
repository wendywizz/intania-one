import 'package:flutter/material.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/models/repair_computer.dart';
import 'package:intania_staff_buddy/models/result.dart';
import 'package:intania_staff_buddy/screens/repair_computer/worker/repair_computer_receive_view_screen.dart';
import 'package:intania_staff_buddy/services/repair_computer_service.dart';
import 'package:intania_staff_buddy/widgets/container_center.dart';
import 'package:intania_staff_buddy/widgets/list_item_repaircomputer.dart';

class RepairComputerCurrentJobScreen extends StatefulWidget {
  final String staffId;

  const RepairComputerCurrentJobScreen({
    super.key,
    required this.staffId,
  });

  @override
  State<RepairComputerCurrentJobScreen> createState() =>
      _RepairComputerCurrentJobScreenState();
}

class _RepairComputerCurrentJobScreenState
    extends State<RepairComputerCurrentJobScreen> {
  List<RepairComputer> _items = [];

  Widget slideAction(String jobId, {String? action}) {
    return SlidableAction(
      backgroundColor: Colors.black,
      foregroundColor: Colors.white,
      icon: Icons.check_circle,
      label: TEXT_RC_OPERATE,
      onPressed: (BuildContext context) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => RepairComputerReceiveViewScreen(
              jobId: jobId,
              staffId: widget.staffId,
              action: action,
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: RepairComputerService().listWorkerCurrentJob(widget.staffId),
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
                          children: [slideAction(jobId, action: statusValue)],
                        ),
                        child: ListItemRepairComputer(
                          supplyCode: supplyCode,
                          statusValue: statusValue,
                          statusName: statusName,
                          informDateTime: informDateTime,
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => RepairComputerReceiveViewScreen(
                                jobId: jobId,
                                staffId: widget.staffId,
                                action: statusValue,
                              ),
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
