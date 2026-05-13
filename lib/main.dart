import 'package:intania_staff_buddy/constants/color.dart';
import 'package:intania_staff_buddy/constants/route.dart';
import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/screens/absent/absent_birth_screen.dart';
import 'package:intania_staff_buddy/screens/absent/absent_hajj_screen.dart';
import 'package:intania_staff_buddy/screens/absent/absent_leave_screen.dart';
import 'package:intania_staff_buddy/screens/absent/absent_menu_screen.dart';
import 'package:intania_staff_buddy/screens/absent/absent_relax_screen.dart';
import 'package:intania_staff_buddy/screens/meeting/meeting_history_screen.dart';
import 'package:intania_staff_buddy/screens/meeting/meeting_incoming_screen.dart';
import 'package:intania_staff_buddy/screens/meeting/meeting_screen.dart';
import 'package:intania_staff_buddy/screens/meeting/meeting_today_screen.dart';
import 'package:intania_staff_buddy/screens/news_detail_screen.dart';
import 'package:intania_staff_buddy/screens/person_detail_screen.dart';
import 'package:provider/provider.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/screens/absent/absent_business_screen.dart';
import 'package:intania_staff_buddy/screens/absent/absent_screen.dart';
import 'package:intania_staff_buddy/screens/calendar_executive_screen.dart';
import 'package:intania_staff_buddy/screens/forget_timestamp_screen.dart';
import 'package:intania_staff_buddy/screens/home_screen.dart';
import 'package:intania_staff_buddy/screens/repair_computer/repair_computer_screen.dart';
import 'package:intania_staff_buddy/screens/person_search_screen.dart';
import 'package:intania_staff_buddy/services/auth_service.dart';
import 'package:intania_staff_buddy/widgets/template_main.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Initial instance
  /*await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  LocalNotificationService().initialize();

  SharedPreferences prefs = await SharedPreferences.getInstance();
  FirebaseMessaging firebaseMessaging = FirebaseMessaging.instance;
  firebaseMessaging.subscribeToTopic('all');*/

  // Save Device token
  /*final storedDevice = prefs.getString(DEVICE_ID);
  if (storedDevice == null) {
    final String? deviceToken = await firebaseMessaging.getToken();
    prefs.setString(DEVICE_ID, deviceToken!);
  }*/

  // Show notification settings
  /*FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  NotificationSettings settings = await firebaseMessaging.requestPermission(
    alert: true,
    badge: true,
    provisional: false,
    sound: true,
  );

  // Foreground Notification setup
  if (settings.authorizationStatus == AuthorizationStatus.authorized) {
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      // ignore: avoid_print
      print("Message received");
      if (message.notification != null) {
        String? title = message.notification!.title;
        String? body = message.notification!.body;

        LocalNotificationService()
            .showNotification(id: 2, title: title!, body: body!);
      }
    });
  }*/

  /*Intl.defaultLocale = "th";
  initializeDateFormatting('th');*/

  runApp(const MainApp());
}

class MainApp extends StatefulWidget {
  const MainApp({super.key});

  @override
  State<MainApp> createState() => _MainAppState();
}

class _MainAppState extends State<MainApp> {
  @override
  void initState() {
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (context) => AuthService(),
        ),
      ],
      child: Builder(
        builder: (BuildContext context) {
          return MaterialApp(
            theme: ThemeData(
              fontFamily: 'PSU_Stidti',
              textTheme: const TextTheme(
                bodyMedium: TextStyle(fontSize: 16, color: Colors.black),
              ),
              scaffoldBackgroundColor: bodyBackgroundColor,
            ),
            routes: {
              rootRoute: (context) => const MainTemplate(child: HomeScreen()),
              // News
              newsDetailRoute: (context) => const NewsDetailScreen(),
              // Absent
              absentRoute: (context) => const AbsentScreen(),
              absentNewRoute: (context) => const AbsentMenuScreen(),
              absentLeaveRoute: (context) => const AbsentLeaveScreen(),
              absentBusinessRoute: (context) => const AbsentBusinessScreen(),
              absentRelaxRoute: (context) => const AbsentRelaxScreen(),
              absentBirthRoute: (context) => const AbsentBirthScreen(),
              absentHajjRoute: (context) => const AbsentHajjScreen(),
              absentViewRoute: (context) => const AbsentScreen(),
              forgetTimestampRoute: (context) => const ForgetTimestampScreen(),
              // Repair Computer
              rcRoute: (context) => const RepairComputerScreen(),
              rcUserCurrentRoute: (context) => const RepairComputerScreen(
                  activeTabIndex: TABINDEX_RC_USER_CURRENT),
              rcUserQueueRoute: (context) => const RepairComputerScreen(
                  activeTabIndex: TABINDEX_RC_USER_QUEUE),
              rcUserHistoryRoute: (context) => const RepairComputerScreen(
                  activeTabIndex: TABINDEX_RC_USER_HISTORY),
              rcForemanAssignRoute: (context) => const RepairComputerScreen(
                  activeTabIndex: TABINDEX_RC_FOREMAN_NEW_JOB),
              rcForemanManageRoute: (context) => const RepairComputerScreen(
                  activeTabIndex: TABINDEX_RC_FOREMAN_MANAGE_JOB),
              rcForemanSupply: (context) => const RepairComputerScreen(
                  activeTabIndex: TABINDEX_RC_FOREMAN_SUPPLY),
              rcForemanHistory: (context) => const RepairComputerScreen(
                  activeTabIndex: TABINDEX_RC_FOREMAN_HISTORY),
              /*rcForemanViewJob: (context) =>
                  const RepairComputerManageViewScreen(),*/
              // Person Search
              personSearchRoute: (context) => const PersonSearchScreen(),
              personDetailRoute: (context) => const PersonDetailScreen(),
              // Schedule
              calendarExecutiveRoute: (context) =>
                  const CalendarExecutiveScreen(),
              // Meeting
              meetingRoute: (context) => const MeetingScreen(),
              meetingTodayRoute: (context) => const MeetingTodayScreen(),
              meetingIncomingRoute: (context) => const MeetingIncomingScreen(),
              meetingHistoryRoute: (context) => const MeetingHistoryScreen(),
            },
          );
        },
      ),
    );
  }
}
