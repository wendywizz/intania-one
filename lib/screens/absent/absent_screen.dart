import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/color.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/models/privillege/absent_privilege.dart';
import 'package:intania_staff_buddy/models/result.dart';
import 'package:intania_staff_buddy/screens/absent/absent_approving_screen.dart';
import 'package:provider/provider.dart';
import 'package:intania_staff_buddy/screens/absent/absent_history_screen.dart';
import 'package:intania_staff_buddy/screens/absent/absent_stat_screen.dart';
import 'package:intania_staff_buddy/screens/absent/absent_waiting_screen.dart';
import 'package:intania_staff_buddy/services/auth_service.dart';
import 'package:intania_staff_buddy/services/privilege_service.dart';
import 'package:intania_staff_buddy/widgets/template_blank.dart';

class AbsentScreen extends StatefulWidget {
  final int? selectedTabIndex;
  const AbsentScreen({
    super.key,
    this.selectedTabIndex,
  });

  @override
  State<AbsentScreen> createState() => _AbsentScreenState();
}

class _AbsentScreenState extends State<AbsentScreen> {
  bool _ready = false;
  bool _isHeadman = false;
  int _selectedIndex = 0;

  @override
  void initState() {
    super.initState();

    if (widget.selectedTabIndex != null) {
      _selectedIndex = widget.selectedTabIndex!;
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();

    Provider.of<AuthService>(context, listen: false).currentUser.then(
      (user) async {
        if (user != null) {
          final String staffId = user.staffId;
          Result pvResult = await PrivilegeService().absentPrivillege(staffId);
          AbsentPrivilege? data = pvResult.data;
          bool isHeadman = false;

          if (data != null) {
            setState(() {
              isHeadman = data.isHeadman;
            });
          }

          setState(() {
            _isHeadman = isHeadman;
            _ready = true;
          });
        }
      },
    );
  }

  void _onTap(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  final List<Widget> _childrenGeneralPerson = const [
    AbsentWaitingScreen(),
    AbsentStatScreen(),
    AbsentHistoryScreen()
  ];

  final List<Widget> _childrenHeadman = const [
    AbsentApprovingScreen(),
    AbsentWaitingScreen(),
    AbsentStatScreen(),
    AbsentHistoryScreen()
  ];

  String generalPersonMenuTitle(index) {
    switch (index) {
      case 0:
        return PAGE_ABSENT_WAITING;
      case 1:
        return PAGE_ABSENT_STAT;
      case 2:
        return PAGE_ABSENT_HISTORY;
      default:
        return '';
    }
  }

  String headmanMenuTitle(index) {
    switch (index) {
      case 0:
        return PAGE_ABSENT_APPROVING;
      case 1:
        return PAGE_ABSENT_WAITING;
      case 2:
        return PAGE_ABSENT_STAT;
      case 3:
        return PAGE_ABSENT_HISTORY;
      default:
        return '';
    }
  }

  List<BottomNavigationBarItem> headmanMenuItem() {
    return const [
      BottomNavigationBarItem(
        icon: Icon(Icons.timelapse),
        label: MENU_ABSENT_APPROVING,
      ),
      BottomNavigationBarItem(
        icon: Icon(Icons.access_alarm),
        label: MENU_ABSENT_WAITING,
      ),
      BottomNavigationBarItem(
        icon: Icon(Icons.bar_chart),
        label: MENU_ABSENT_STAT,
      ),
      BottomNavigationBarItem(
        icon: Icon(Icons.history),
        label: MENU_ABSENT_HISTORY,
      ),
    ];
  }

  List<BottomNavigationBarItem> generalPersonMenuItem() {
    return const [
      BottomNavigationBarItem(
        icon: Icon(Icons.access_alarm),
        label: MENU_ABSENT_WAITING,
      ),
      BottomNavigationBarItem(
        icon: Icon(Icons.bar_chart),
        label: MENU_ABSENT_STAT,
      ),
      BottomNavigationBarItem(
        icon: Icon(Icons.history),
        label: MENU_ABSENT_HISTORY,
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    List<BottomNavigationBarItem> menuItems;
    String menuTitle;
    List<Widget> children;

    if (_isHeadman) {
      menuTitle = headmanMenuTitle(_selectedIndex);
      menuItems = headmanMenuItem();
      children = _childrenHeadman;
    } else {
      menuTitle = generalPersonMenuTitle(_selectedIndex);
      menuItems = generalPersonMenuItem();
      children = _childrenGeneralPerson;
    }

    return TemplateBlank(
      appBarTitle: menuTitle,
      bottomNavigationBar: _ready == true
          ? BottomNavigationBar(
              type: BottomNavigationBarType.fixed,
              backgroundColor: bottomBarBackgroundColor,
              iconSize: BOTTOM_BAR_ICON_SIZE,
              selectedItemColor: bottomBarSelectItemColor,
              unselectedItemColor: bottomBarUnselectItemColor,
              currentIndex: _selectedIndex,
              items: menuItems,
              onTap: _onTap,
            )
          : null,
      child: _ready == false
          ? const Center(
              child: CircularProgressIndicator(),
            )
          : children[_selectedIndex],
    );
  }
}
