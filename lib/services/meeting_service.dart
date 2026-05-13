import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/constants/uri.dart';
import 'package:intania_staff_buddy/models/meeting.dart';
import 'package:intania_staff_buddy/models/result.dart';
import 'package:intania_staff_buddy/utils/rest_request.dart';

class MeetingService extends RestRequest<Meeting> {
  Future<Result> listMeeting({String userId = '', String type = ''}) async {
    String processType = '';
    List<Meeting> data = [];
    String? message;
    try {
      final queryParams = {'user_id': userId, 'type': type};

      final url = Uri.https(
          PHOENIX_URL, '/meetingv2/api/index.php/meeting/list', queryParams);
      final response = await http.get(url, headers: {
        'Content-Type': 'application/json',
      });

      if (response.statusCode != 200 || response.body.isEmpty) {
        throw const SocketException(MESSAGE_PROCESS_FAILED);
      } else {
        final jsonData = json.decode(response.body);
        message = jsonData['message'];

        data = data.map((json) => Meeting.fromJson(jsonData['data'])).toList();
        processType = PROCESS_SUCCESS;
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
      processType: processType,
      data: data,
      totalCount: data.length,
      message: message.toString(),
    );
  }
}
