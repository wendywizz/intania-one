import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class LocalNotificationService {
  LocalNotificationService();

  final FlutterLocalNotificationsPlugin _localNotificationService =
      FlutterLocalNotificationsPlugin();

  Future<void> deviceTokenRegister(token) async {}

  Future<void> initialize() async {
    AndroidInitializationSettings androidInitializationSettings =
        const AndroidInitializationSettings('@mipmap/ic_launcher');

    const DarwinInitializationSettings iosInitializationSettings =
        DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
      //onDidReceiveLocalNotification: onDidReceiveLocalNotification,
    );

    InitializationSettings settings = InitializationSettings(
      android: androidInitializationSettings,
      iOS: iosInitializationSettings,
    );

    await _localNotificationService.initialize(
      onDidReceiveNotificationResponse: (NotificationResponse response) async =>
          // ignore: avoid_print
          print(response),
      settings: settings,
    );
  }

  Future<NotificationDetails> _notificationDetails() async {
    const AndroidNotificationDetails androidNotificationDetails =
        AndroidNotificationDetails(
      '34i93849sd0f90sd9fajdfsdfsdxxq3LSkld',
      'staff_buddy',
      importance: Importance.max,
      priority: Priority.max,
      playSound: true,
    );

    const DarwinNotificationDetails iosNotificationDetails =
        DarwinNotificationDetails();

    return const NotificationDetails(
        android: androidNotificationDetails, iOS: iosNotificationDetails);
  }

  Future<void> showNotification({
    required int id,
    required String title,
    required String body,
  }) async {
    final details = await _notificationDetails();
    await _localNotificationService.show(
      id: id,
      title: title,
      body: body,
      notificationDetails: details,
    );
  }

  onDidReceiveLocalNotification(
      int id, String? title, String? body, String? payload) {
    // ignore: avoid_print
    print('id $id');
  }
}
