import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/screens/meeting/meeting_history_screen.dart';
import 'package:intania_staff_buddy/screens/meeting/meeting_incoming_screen.dart';
import 'package:intania_staff_buddy/screens/meeting/meeting_today_screen.dart';
import 'package:intania_staff_buddy/widgets/template_blank.dart';

class MeetingScreen extends StatefulWidget {
  const MeetingScreen({super.key});

  @override
  State<MeetingScreen> createState() => _MeetingScreenState();
}

class _MeetingScreenState extends State<MeetingScreen> {
  int _selectedIndex = 0;

  void _onTap(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  final List<Widget> _children = const [
    MeetingTodayScreen(),
    MeetingIncomingScreen(),
    MeetingHistoryScreen(),
  ];

  String menuTitle(index) {
    switch (index) {
      case 0:
        return PAGE_MEETING_TODAY;
      case 1:
        return PAGE_MEETING_INCOMING;
      case 2:
        return PAGE_MEETING_HISTORY;
      default:
        return '';
    }
  }

  List<BottomNavigationBarItem> renderGeneralPersonMenuItem() {
    return const [
      BottomNavigationBarItem(
        icon: Icon(Icons.abc),
        label: MENU_MEETING_TODAY,
      ),
      BottomNavigationBarItem(
        icon: Icon(Icons.access_alarm),
        label: MENU_MEETING_INCOMING,
      ),
      BottomNavigationBarItem(
        icon: Icon(Icons.dangerous),
        label: MENU_MEETING_HISTORY,
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return TemplateBlank(
      appBarTitle: menuTitle(_selectedIndex),
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        backgroundColor: const Color(0xffb33939),
        iconSize: 34,
        unselectedItemColor: const Color(0xffaaaaaa),
        selectedItemColor: const Color(0xffffffff),
        currentIndex: _selectedIndex,
        items: renderGeneralPersonMenuItem(),
        onTap: _onTap,
      ),
      child: Container(
        padding: const EdgeInsets.only(top: 10),
        child: (_children[_selectedIndex]),
      ),
    );
  }
}
