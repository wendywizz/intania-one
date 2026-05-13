import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/models/repair_computer.dart';
import 'package:intania_staff_buddy/models/result.dart';
import 'package:intania_staff_buddy/screens/repair_computer/user/repair_computer_inform_view_screen.dart';
import 'package:intania_staff_buddy/services/repair_computer_service.dart';
import 'package:intania_staff_buddy/widgets/container_center.dart';
import 'package:intania_staff_buddy/widgets/list_item_repaircomputer.dart';

class RepairComputerHistoryScreen extends StatefulWidget {
  final String staffId;

  const RepairComputerHistoryScreen({
    super.key,
    required this.staffId,
  });

  @override
  State<RepairComputerHistoryScreen> createState() =>
      _RepairComputerHistoryScreenState();
}

class _RepairComputerHistoryScreenState
    extends State<RepairComputerHistoryScreen> {
  Widget renderContent(String type) {
    return FutureBuilder(
      future:
          RepairComputerService().getUserHistory(widget.staffId, type: type),
      builder: (BuildContext context, AsyncSnapshot<Result> snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        } else {
          if (snapshot.hasError || !snapshot.hasData) {
            return const ContainerCenter(
                title: TITLE_ERROR, desc: MESSAGE_SERVER_ERROR);
          }
          Result result = snapshot.data!;

          switch (result.processType) {
            case PROCESS_SUCCESS:
              if (result.totalCount <= 0) {
                return const ContainerCenter(title: MESSAGE_NO_DATA);
              } else {
                final List<RepairComputer> data =
                    result.data as List<RepairComputer>;

                return ListView.separated(
                  itemCount: result.totalCount,
                  itemBuilder: (BuildContext context, int index) {
                    String id = data[index].id;
                    String? supplyCode = data[index].supplyCode;
                    String statusValue = data[index].status;
                    String statusName = data[index].statusName.toString();
                    DateTime informDateTime = data[index].informDateTime;

                    return ListItemRepairComputer(
                      supplyCode: supplyCode,
                      statusValue: statusValue,
                      statusName: statusName,
                      informDateTime: informDateTime,
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => RepairComputerInformViewScreen(
                                  staffId: widget.staffId,
                                  jobId: id,
                                )),
                      ),
                    );
                  },
                  separatorBuilder: (context, index) => const Divider(),
                );
              }
            default:
              return ContainerCenter(title: result.message);
          }
        }
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
        length: 2,
        child: Builder(builder: (BuildContext context) {
          return Column(
            children: [
              const TabBar(
                tabs: [
                  Tab(text: TAB_RC_HISTORY_FINISH),
                  Tab(text: TAB_RC_HISTORY_CANCEL),
                ],
                labelColor: Colors.black,
              ),
              const SizedBox(height: 20),
              Expanded(
                child: TabBarView(
                  children: <Tab>[
                    Tab(child: renderContent(TYPE_CONTENT_FINISH)),
                    Tab(child: renderContent(TYPE_CONTENT_CANCEL)),
                  ],
                ),
              ),
            ],
          );
        }));
  }
}
