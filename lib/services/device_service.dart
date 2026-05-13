import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:intania_staff_buddy/configs/endpoint.dart';
import 'package:intania_staff_buddy/constants/auth.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/utils/rest_request.dart';

class DeviceService extends RestRequest {
  Future<bool> addDevice(String staffId, String deviceToken, String osName,
      String modelName) async {
    bool success = false;

    try {
      final url = Uri.https(SCOOBA_ENDPOINT, '/scooba/api/devices');
      final response = await http
          .post(url,
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer $SCOOBA_API_TOKENS'
              },
              body: jsonEncode({
                "data": {
                  'owner': staffId,
                  'device_id': deviceToken,
                  'os': osName,
                  'model_name': modelName,
                }
              }))
          .timeout(CONNECTION_TIMEOUT);
      if (response.statusCode == 200) {
        success = true;
      }
    } on TimeoutException catch (e) {
      // ignore: avoid_print
      print(e.message);
    } on SocketException catch (e) {
      // ignore: avoid_print
      print(e.message);
    } catch (e) {
      // ignore: avoid_print
      print(e.toString());
    }

    return success;
  }
}
