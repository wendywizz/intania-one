import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/route.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/models/absent.dart';
import 'package:intania_staff_buddy/models/result.dart';
import 'package:intania_staff_buddy/screens/absent/absent_birth_screen.dart';
import 'package:intania_staff_buddy/screens/absent/absent_business_screen.dart';
import 'package:intania_staff_buddy/screens/absent/absent_hajj_screen.dart';
import 'package:intania_staff_buddy/screens/absent/absent_leave_screen.dart';
import 'package:intania_staff_buddy/screens/absent/absent_relax_screen.dart';
import 'package:intania_staff_buddy/services/absent_service.dart';
import 'package:intania_staff_buddy/services/auth_service.dart';
import 'package:intania_staff_buddy/widgets/container_center.dart';
import 'package:provider/provider.dart';
import 'package:intania_staff_buddy/utils/display_datetime.dart';

class AbsentWaitingScreen extends StatefulWidget {
  const AbsentWaitingScreen({super.key});

  @override
  State<AbsentWaitingScreen> createState() => _AbsentWaitingScreenState();
}

class _AbsentWaitingScreenState extends State<AbsentWaitingScreen> {
  bool _ready = false;
  Absent? _remainData, _cancelData;

  @override
  void initState() {
    super.initState();

    Provider.of<AuthService>(context, listen: false).currentUser.then(
      (user) async {
        if (user != null) {
          final String staffId = user.staffId;
          final Result result = await AbsentService().waitingData(staffId);

          setState(() {
            _ready = true;
            _remainData = result.data['remainResult'];
            _cancelData = result.data['cancelResult'];
          });
        }
      },
    );
  }

  Widget renderItem(Absent? data) {
    if (data != null) {
      Widget redirectWidget;

      switch (data.absentType) {
        case TYPE_ABSENT_LEAVE:
          redirectWidget = AbsentLeaveScreen(
            id: data.id,
          );
          break;
        case TYPE_ABSENT_BUSINESS:
          redirectWidget = AbsentBusinessScreen(
            id: data.id,
          );
          break;
        case TYPE_ABSENT_BIRTH:
          redirectWidget = const AbsentBirthScreen();
          break;
        case TYPE_ABSENT_RELAX:
          redirectWidget = const AbsentRelaxScreen();
          break;
        case TYPE_ABSENT_HAJJ:
          redirectWidget = const AbsentHajjScreen();
          break;
        default:
          redirectWidget = const ContainerCenter(
            title: TITLE_ERROR,
            desc: MESSAGE_PAGE_NOT_FOUND,
          );
          break;
      }

      return Card(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 5),
          child: ListTile(
            title: Text(data.absentTypeName.toString()),
            subtitle: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(data.progressTypeName.toString()),
                Text(DisplayDateTime.beautyfulBetweenDate(
                    data.startDate!, data.endDate!))
              ],
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => redirectWidget),
            ),
          ),
        ),
      );
    } else {
      return Container(height: 0);
    }
  }

  @override
  Widget build(BuildContext context) {
    return !_ready
        ? const Center(
            child: CircularProgressIndicator(),
          )
        : (_remainData == null && _cancelData == null)
            ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(MESSAGE_ABSENT_NO_WAIT_APPROVE_DATA,
                        style: TextStyle(fontSize: 14)),
                    const SizedBox(height: 10),
                    FilledButton.icon(
                      onPressed: () =>
                          Navigator.pushNamed(context, absentNewRoute),
                      icon: const Icon(Icons.add),
                      label: const Text('ส่งเรื่องลาใหม่'),
                      iconAlignment: IconAlignment.start,
                    ),
                  ],
                ),
              )
            : SingleChildScrollView(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 15),
                child: Column(
                  children: [
                    renderItem(_remainData),
                    renderItem(_cancelData),
                  ],
                ),
              );
  }
}
