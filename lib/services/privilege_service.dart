import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:intania_staff_buddy/constants/app.dart';
import 'package:intania_staff_buddy/constants/auth.dart';
import 'package:intania_staff_buddy/constants/privilege.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/constants/uri.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/models/privillege/absent_privilege.dart';
import 'package:intania_staff_buddy/models/privillege/repair_computer_privilege.dart';
import 'package:intania_staff_buddy/models/result.dart';

class PrivilegeService {
  Future<RepairComputerPrivilege?> repairComputerPrivilege(
      String staffId) async {
    String appId = RP_APP_ID;
    RepairComputerPrivilege? data;

    try {
      final queryParams = {
        'app_id': appId,
        'staff_id': staffId,
      };
      /*final url =
          Uri.https(SCOOBA_ENDPOINT, '/scooba/api/app-privilege', queryParams);*/
      final url = Uri.https(INFOR_URL, '${RP_PATH_API}privilege', queryParams);

      final response = await http.get(url, headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $SCOOBA_API_TOKENS'
      }).timeout(CONNECTION_TIMEOUT);

      if (response.statusCode == 200 && response.body.isNotEmpty) {
        final jsonData = json.decode(response.body);
        String pvData = jsonData['data'];
        if (pvData.isEmpty) {
          pvData = PRIVILEGE_RC_USER;
        }

        data = RepairComputerPrivilege.fromJson({
          'staffId': staffId,
          'privilege': pvData,
        });
      } else if (response.statusCode == 400) {
      } else {
        throw const SocketException(MESSAGE_SERVER_ERROR);
      }
    } on TimeoutException {
      data = null;
    } on SocketException {
      data = null;
    } catch (e) {
      data = null;
    }

    return data;
  }

  Future<Result> absentPrivillege(String staffId) async {
    String processType = '';
    String appId = PERSONNEL_APP_ID;
    AbsentPrivilege? data;
    String? message;

    try {
      final queryParams = {
        'app_id': appId,
        'staff_id': staffId,
      };

      final url = Uri.https(
          PHOENIX_URL, '${PERSONNEL_PATH_API}privillege', queryParams);

      final response = await http.get(url, headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $SCOOBA_API_TOKENS'
      }).timeout(CONNECTION_TIMEOUT,
          onTimeout: () =>
              throw TimeoutException(MESSAGE_CANNOT_CONNECT_TO_SERVER));

      if (response.statusCode != 200 && response.body.isEmpty) {
        throw const SocketException(MESSAGE_SERVER_ERROR);
      } else {
        final jsonData = json.decode(response.body);
        data = AbsentPrivilege.fromJson(jsonData['data']);
      }
    } on TimeoutException catch (e) {
      processType = PROCESS_ERROR;
      message = e.message;
    } on SocketException catch (e) {
      processType = PROCESS_ERROR;
      message = e.message;
    } catch (e) {
      processType = PROCESS_ERROR;
      message = e.toString();
    }

    return Result(
      data: data,
      message: message.toString(),
      processType: processType,
    );
  }
}
