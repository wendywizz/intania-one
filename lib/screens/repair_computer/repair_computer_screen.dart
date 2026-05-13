import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/route.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/models/privillege/repair_computer_privilege.dart';
import 'package:intania_staff_buddy/widgets/container_center.dart';
import 'package:provider/provider.dart';
import 'package:intania_staff_buddy/constants/privilege.dart';
import 'package:intania_staff_buddy/screens/repair_computer/fman/repair_computer_approve_screen.dart';
import 'package:intania_staff_buddy/screens/repair_computer/worker/repair_computer_current_job_screen.dart';
import 'package:intania_staff_buddy/screens/repair_computer/fman/repair_computer_foreman_history_screen.dart';
import 'package:intania_staff_buddy/screens/repair_computer/user/repair_computer_history_screen.dart';
import 'package:intania_staff_buddy/screens/repair_computer/user/repair_computer_inform_add_screen.dart';
import 'package:intania_staff_buddy/screens/repair_computer/fman/repair_computer_manage_screen.dart';
import 'package:intania_staff_buddy/screens/repair_computer/fman/repair_computer_new_job_screen.dart';
import 'package:intania_staff_buddy/screens/repair_computer/user/repair_computer_queue_screen.dart';
import 'package:intania_staff_buddy/screens/repair_computer/worker/repair_computer_receive_job_screen.dart';
import 'package:intania_staff_buddy/screens/repair_computer/worker/repair_computer_worker_history_screen.dart';
import 'package:intania_staff_buddy/screens/repair_computer/user/repair_computer_current_screen.dart';
import 'package:intania_staff_buddy/services/auth_service.dart';
import 'package:intania_staff_buddy/services/privilege_service.dart';
import 'package:intania_staff_buddy/widgets/template_blank.dart';

class RepairComputerScreen extends StatefulWidget {
  final int activeTabIndex;

  const RepairComputerScreen({
    super.key,
    this.activeTabIndex = 0,
  });

  @override
  State<RepairComputerScreen> createState() => _RepairComputerScreenState();
}

class _RepairComputerScreenState extends State<RepairComputerScreen> {
  bool _ready = false;
  String? _processType;
  String? _privilege;
  String _staffId = '';
  int _selectedIndex = 0;

  @override
  void initState() {
    super.initState();

    setState(() {
      _selectedIndex = widget.activeTabIndex;
    });
    Provider.of<AuthService>(context, listen: false).currentUser.then(
      (user) async {
        if (user != null) {
          String staffId = user.staffId;

          RepairComputerPrivilege? privilegeData =
              await PrivilegeService().repairComputerPrivilege(staffId);

          if (privilegeData == null) {
            setState(() {
              _ready = true;
              _processType = PROCESS_FAILED;
            });
          } else {
            setState(() {
              _ready = true;
              _processType = PROCESS_SUCCESS;
              _staffId = staffId;
              _privilege = privilegeData.privilege;
            });
          }
        }
      },
    );
  }

  Widget renderScreen() {
    if (_processType == PROCESS_SUCCESS) {
      switch (_privilege) {
        case PRIVILEGE_RC_FOREMAN:
          List<Widget> screens = [
            const RepairComputerNewJobScreen(),
            RepairComputerManageScreen(staffId: _staffId),
            RepairComputerApproveScreen(staffId: _staffId),
            RepairComputerForemanHistoryScreen(staffId: _staffId),
          ];
          return screens[_selectedIndex];
        case PRIVILEGE_RC_TECH:
          List<Widget> screens = [
            RepairComputerReceiveJobScreen(staffId: _staffId),
            RepairComputerCurrentJobScreen(staffId: _staffId),
            RepairComputerWorkerHistoryScreen(staffId: _staffId),
          ];
          return screens[_selectedIndex];
        case PRIVILEGE_RC_USER:
        default:
          List<Widget> screens = [
            RepairComputerCurrentScreen(staffId: _staffId),
            RepairComputerQueueScreen(staffId: _staffId),
            RepairComputerHistoryScreen(staffId: _staffId),
          ];
          return screens[_selectedIndex];
      }
    } else {
      return const ContainerCenter(
          title: TITLE_ERROR, desc: MESSAGE_SERVER_ERROR);
    }
  }

  String appTitle(index) {
    switch (_privilege) {
      case PRIVILEGE_RC_FOREMAN:
        switch (index) {
          case TABINDEX_RC_FOREMAN_MANAGE_JOB:
            return PAGE_RC_MANAGE_JOB;
          case TABINDEX_RC_FOREMAN_SUPPLY:
            return PAGE_RC_APPROVE;
          case TABINDEX_RC_FOREMAN_HISTORY:
            return PAGE_RC_HISTORY;
          case TABINDEX_RC_FOREMAN_NEW_JOB:
          default:
            return PAGE_RC_NEW_JOB;
        }
      case PRIVILEGE_RC_TECH:
        switch (index) {
          case TABINDEX_RC_WORKER_CURRENT_JOB:
            return PAGE_RC_CURRENT_JOB;
          case TABINDEX_RC_WORKER_HISTORY:
            return PAGE_RC_TECHNICIAN_HISTORY;
          case TABINDEX_RC_WORKER_RECEIVE_JOB:
          default:
            return PAGE_RC_RECEIVE_JOB;
        }
      case PRIVILEGE_RC_USER:
      default:
        switch (index) {
          case TABINDEX_RC_USER_QUEUE:
            return PAGE_RC_QUEUE;
          case TABINDEX_RC_USER_HISTORY:
            return PAGE_RC_HISTORY;
          case TABINDEX_RC_USER_CURRENT:
          default:
            return PAGE_RC_CURRENT;
        }
    }
  }

  BottomNavigationBar? renderBottomMenu() {
    if (_processType == PROCESS_SUCCESS) {
      List<BottomNavigationBarItem> menuItems;

      switch (_privilege) {
        case PRIVILEGE_RC_FOREMAN:
          menuItems = const [
            BottomNavigationBarItem(
              icon: Icon(Icons.abc),
              label: MENU_RC_NEW_JOB,
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.access_alarm),
              label: MENU_RC_MANAGE_JOB,
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.dangerous),
              label: MENU_RC_APPROVE,
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.zoom_in),
              label: MENU_RC_FOREMAN_HISTORY,
            ),
          ];
          break;
        case PRIVILEGE_RC_TECH:
          menuItems = const [
            BottomNavigationBarItem(
              icon: Icon(Icons.abc),
              label: MENU_RC_RECEIVE_JOB,
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.access_alarm),
              label: MENU_RC_CURRENT_JOB,
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.dangerous),
              label: MENU_RC_TECHNICIAN_HISTORY,
            ),
          ];
        case PRIVILEGE_RC_USER:
        default:
          menuItems = const [
            BottomNavigationBarItem(
              icon: Icon(Icons.access_alarm),
              label: MENU_RC_WAITING,
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.dangerous),
              label: MENU_RC_QUEUE,
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.zoom_in),
              label: MENU_RC_HISTORY,
            ),
          ];
      }

      return _ready
          ? BottomNavigationBar(
              type: BottomNavigationBarType.fixed,
              backgroundColor: const Color(0xffb33939),
              iconSize: 34,
              unselectedItemColor: const Color(0xffaaaaaa),
              selectedItemColor: const Color(0xffffffff),
              currentIndex: _selectedIndex,
              items: menuItems,
              onTap: (int index) => setState(() {
                _selectedIndex = index;
              }),
            )
          : null;
    } else {
      return null;
    }
  }

  Widget _handleGoToHome() {
    return BackButton(onPressed: () => Navigator.pushNamed(context, rootRoute));
  }

  @override
  Widget build(BuildContext context) {
    return TemplateBlank(
      leading: _handleGoToHome(),
      automaticallyImplyLeading: false,
      appBarTitle: appTitle(_selectedIndex),
      bottomNavigationBar: renderBottomMenu(),
      topBarActionButton: _selectedIndex == 0
          ? [
              TextButton.icon(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) => RepairComputerInformAddScreen(
                            staffId: _staffId,
                          )),
                ),
                icon: const Icon(Icons.add),
                label: const Text(TEXT_RC_ADDJOB),
              ),
            ]
          : null,
      child: !_ready
          ? const Center(child: CircularProgressIndicator())
          : renderScreen(),
    );
  }
}
