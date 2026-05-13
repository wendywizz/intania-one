import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/models/person.dart';
import 'package:intania_staff_buddy/models/result.dart';
import 'package:intania_staff_buddy/screens/repair_computer/fman/repair_computer_assign_confirm_screen.dart';
import 'package:intania_staff_buddy/services/personnel_service.dart';
import 'package:intania_staff_buddy/widgets/container_center.dart';
import 'package:intania_staff_buddy/widgets/list_item_person.dart';
import 'package:intania_staff_buddy/widgets/template_blank.dart';

class RepairComputerAssignSelectWorkerScreen extends StatefulWidget {
  final String jobId;
  final Map<String, String> repairType;

  const RepairComputerAssignSelectWorkerScreen({
    super.key,
    required this.jobId,
    required this.repairType,
  });

  @override
  State<RepairComputerAssignSelectWorkerScreen> createState() =>
      _RepairComputerAssignSelectWorkerScreenState();
}

class _RepairComputerAssignSelectWorkerScreenState
    extends State<RepairComputerAssignSelectWorkerScreen> {
  List<Person> _items = [];

  @override
  Widget build(BuildContext context) {
    return TemplateBlank(
      appBarTitle: PAGE_RC_ASSIGN_SELECT_TECH,
      child: FutureBuilder(
        future: PersonnelService().getRepairComputerWorkers(),
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
                    _items = result.data as List<Person>;
                    return ListView.separated(
                      padding: const EdgeInsets.symmetric(vertical: 20),
                      itemBuilder: (BuildContext context, int index) {
                        return ListItemPerson(
                            imageUrl: _items[index].getPhoto(),
                            name:
                                '${_items[index].getPrefixName()} ${_items[index].firstNameTH} ${_items[index].lastNameTH}',
                            onTap: () => Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                      builder: (_) =>
                                          RepairComputerAssignConfirmScreen(
                                            jobId: widget.jobId,
                                            worker: _items[index],
                                            repairType: widget.repairType,
                                          )),
                                ));
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
