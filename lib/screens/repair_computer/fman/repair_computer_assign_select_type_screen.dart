import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/models/result.dart';
import 'package:intania_staff_buddy/screens/repair_computer/fman/repair_computer_assign_select_worker_screen.dart';
import 'package:intania_staff_buddy/services/repair_computer_service.dart';
import 'package:intania_staff_buddy/widgets/container_center.dart';
import 'package:intania_staff_buddy/widgets/template_blank.dart';

class RepairComputerAssignSelectTypeScreen extends StatefulWidget {
  final String jobId;

  const RepairComputerAssignSelectTypeScreen({super.key, required this.jobId});

  @override
  State<RepairComputerAssignSelectTypeScreen> createState() =>
      _RepairComputerAssignSelectTypeScreenState();
}

class _RepairComputerAssignSelectTypeScreenState
    extends State<RepairComputerAssignSelectTypeScreen> {
  List<Map<String, String>> _items = [];

  @override
  Widget build(BuildContext context) {
    return TemplateBlank(
      appBarTitle: PAGE_RC_ASSIGN_SELECT_TYPE,
      child: FutureBuilder(
        future: RepairComputerService().getRepairTypes(),
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
                    _items = result.data as List<Map<String, String>>;
                    return ListView.separated(
                      padding: const EdgeInsets.symmetric(vertical: 20),
                      itemBuilder: (BuildContext context, int index) {
                        String name = _items[index]['name'].toString();

                        Map<String, String> repairType = _items[index];
                        return ListTile(
                          title: Text(name),
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) =>
                                  RepairComputerAssignSelectWorkerScreen(
                                jobId: widget.jobId,
                                repairType: repairType,
                              ),
                            ),
                          ),
                          trailing: const Icon(Icons.chevron_right),
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
      ),
    );
  }
}
