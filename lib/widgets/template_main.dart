import 'dart:io';
import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/color.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/models/auth_user.dart';
import 'package:intania_staff_buddy/services/auth_service.dart';
import 'package:intania_staff_buddy/services/device_service.dart';
import 'package:device_info_plus/device_info_plus.dart';

class MainTemplate extends StatefulWidget {
  final Widget child;

  const MainTemplate({super.key, required this.child});

  @override
  State<MainTemplate> createState() => _MainTemplateState();
}

class _MainTemplateState extends State<MainTemplate> {
  AuthUser? _user;
  // ignore: unused_field
  bool _loggedIn = false;
  bool _ready = true;

  @override
  void initState() {
    super.initState();
    initData();
  }

  void initData() async {
    setState(() {
      _ready = false;
    });
    AuthService authService = context.read<AuthService>();
    bool loggedIn = await authService.isLoggedIn;

    if (loggedIn) {
      AuthUser? user = await authService.currentUser;

      setState(() {
        _loggedIn = loggedIn;
        _user = user;
      });
    }
    setState(() {
      _ready = true;
    });

    await saveDeviceInfo();
  }

  Future<void> saveDeviceInfo() async {
    SharedPreferences prefs = await SharedPreferences.getInstance();
    final isInited = prefs.getBool(IS_INITED);

    if ((isInited == null) || (isInited == false)) {
      final String? staffId = _user?.staffId;

      if (staffId != null) {
        final String deviceToken = prefs.getString(DEVICE_ID).toString();
        final deviceInfo = DeviceInfoPlugin();
        String osName = 'n/a';
        String modelName = 'n/a';

        if (Platform.isAndroid) {
          AndroidDeviceInfo info = await deviceInfo.androidInfo;
          modelName = info.model;
          osName = OS_ANDROID;
        } else if (Platform.isIOS) {
          IosDeviceInfo info = await deviceInfo.iosInfo;
          String? modelStr = info.utsname.machine;

          if (modelStr.isNotEmpty || modelStr != '') {
            modelName = modelStr;
          }
          osName = OS_IOS;
        }

        bool success = await DeviceService()
            .addDevice(staffId, deviceToken, osName, modelName);

        if (success) {
          await prefs.setBool(IS_INITED, true);
        }
      }
    }
  }

  String avatar() {
    if (_user != null) {
      return _user!.email;
    } else {
      return 'NOT NULL';
    }
  }

  Widget renderActionAppbar(BuildContext context) {
    var user = context.watch<AuthService>().currentUser;

    return FutureBuilder<AuthUser?>(
      future: user,
      builder: (context, snapshot) {
        if (snapshot.hasData) {
          return Padding(
            padding: const EdgeInsets.only(right: 20.0),
            child: GestureDetector(
              onTap: onPressedLogout,
              child: Text(snapshot.data!.email),
            ),
          );
        } else {
          return Padding(
            padding: const EdgeInsets.only(right: 20.0),
            child: GestureDetector(
              onTap: onPressedLogin,
              child: const Text('LOG IN'),
            ),
          );
        }
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        backgroundColor: primaryColor,
        foregroundColor: appBarFontColor,
        elevation: 0,
        actions: [
          renderActionAppbar(context),
        ],
      ),
      body: !_ready
          ? const Center(child: CircularProgressIndicator())
          : widget.child,
    );
  }

  Future<void> onPressedLogin() async {
    setState(() {
      _ready = false;
    });

    AuthService authService = context.read<AuthService>();
    bool success = await authService.login();

    if (success) {
      await saveDeviceInfo();
      initData();
    }
  }

  Future<void> onPressedLogout() async {
    AuthService authService = context.read<AuthService>();
    await authService.logout();

    setState(() {
      _loggedIn = false;
      _ready = true;
    });
  }
}
