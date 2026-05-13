import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intania_staff_buddy/services/auth_service.dart';
import 'package:intania_staff_buddy/widgets/page_webview.dart';

class ScreenWebview extends StatelessWidget {
  final String appId;
  final String url;
  final String method;
  final BottomNavigationBar? bottomNavigationBar;

  const ScreenWebview({
    super.key,
    required this.appId,
    required this.url,
    this.method = 'GET',
    this.bottomNavigationBar,
  });

  @override
  Widget build(BuildContext context) {
    var futureUser = context.watch<AuthService>().currentUser;

    return FutureBuilder(
      future: futureUser,
      builder: ((context, snapshot) {
        if (snapshot.hasData && snapshot.data != null) {
          final params = {"app_id": appId, "stf_id": snapshot.data!.staffId};
          String queryString = Uri(queryParameters: params).query;

          return PageWebView(url: '$url&$queryString');
        } else {
          return Container();
        }
      }),
    );
  }
}
