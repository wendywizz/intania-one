import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as https;
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/models/result.dart';

abstract class RestRequest<T> {
  Future<Map<String, dynamic>> list(Uri uri) async {
    String processType = '';
    List data = [];
    String? message;

    try {
      final response = await https.get(uri, headers: {
        'Content-Type': 'application/json',
      }).timeout(CONNECTION_TIMEOUT,
          onTimeout: () =>
              throw TimeoutException(MESSAGE_CANNOT_CONNECT_TO_SERVER));

      if (response.statusCode != 200 || response.body.isEmpty) {
        throw const SocketException(MESSAGE_PROCESS_FAILED);
      } else {
        final jsonData = json.decode(response.body);
        data = jsonData['data'];
        message = jsonData['message'];
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
    return {
      'data': data.toList(),
      'totalCount': data.length,
      'message': message,
      'processType': processType,
    };
  }

  Future<Map<String, dynamic>> get(Uri uri) async {
    String processType = '';
    dynamic data;
    String? message;

    try {
      final response = await https.get(uri, headers: {
        'Content-Type': 'application/json',
      }).timeout(CONNECTION_TIMEOUT,
          onTimeout: () =>
              throw TimeoutException(MESSAGE_CANNOT_CONNECT_TO_SERVER));

      if (response.statusCode != 200 || response.body.isEmpty) {
        throw const SocketException(MESSAGE_SERVER_ERROR);
      } else {
        final jsonData = json.decode(response.body);

        data = jsonData['data'];
        message = jsonData['message'];
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

    return {
      'data': data,
      'message': message,
      'processType': processType,
    };
  }

  Future<Map<String, dynamic>> insert(Uri uri, Map data) async {
    String processType = '';
    bool success = false;
    String message = '';

    try {
      final response = await https
          .post(uri,
              headers: {'Content-Type': 'application/json'},
              body: jsonEncode(data))
          .timeout(CONNECTION_TIMEOUT,
              onTimeout: () =>
                  throw TimeoutException(MESSAGE_CANNOT_CONNECT_TO_SERVER));

      if (response.statusCode == 200 || response.statusCode == 201) {
        if (response.body.isEmpty) {
          throw const SocketException(MESSAGE_SERVER_ERROR);
        } else {
          var jsonData = jsonDecode(response.body);

          success = jsonData['success'];
          message = jsonData['message'];
          processType = PROCESS_SUCCESS;
        }
      } else {
        throw const SocketException(MESSAGE_SAVE_FAILED);
      }
    } on TimeoutException catch (e) {
      processType = PROCESS_ERROR;
      message = e.message.toString();
    } on SocketException catch (e) {
      processType = PROCESS_ERROR;
      message = e.message.toString();
    } catch (e) {
      processType = PROCESS_ERROR;
      message = e.toString();
    }

    return {
      'success': success,
      'message': message,
      'processType': processType,
    };
  }

  Future<Map<String, dynamic>> update(Uri uri, String id, Map? data) async {
    String processType = '';
    bool success = false;
    String message = '';

    try {
      Map updateData = {};
      if (data != null) {
        updateData.addAll(data);
        updateData['id'] = id;
      } else {
        updateData['id'] = id;
      }

      final response = await https
          .put(uri,
              headers: {'Content-Type': 'application/json'},
              body: jsonEncode(updateData))
          .timeout(CONNECTION_TIMEOUT,
              onTimeout: () =>
                  throw TimeoutException(MESSAGE_CANNOT_CONNECT_TO_SERVER));

      if (response.statusCode != 200 && response.body.isEmpty) {
        throw const SocketException(MESSAGE_PROCESS_FAILED);
      } else {
        var jsonData = jsonDecode(response.body);
        success = jsonData[RESPONSE_TYPE_SUCCESS];
        message = jsonData['message'];
      }
    } on TimeoutException catch (e) {
      processType = PROCESS_ERROR;
      message = e.message.toString();
    } on SocketException catch (e) {
      processType = PROCESS_ERROR;
      message = e.message;
    } catch (e) {
      processType = PROCESS_ERROR;
      message = e.toString();
    }

    return {
      'success': success,
      'message': message,
      'processType': processType,
    };
  }

  Future<Map<String, dynamic>> delete(Uri uri, String id) async {
    String processType = '';
    bool success = false;
    String message = '';

    try {
      final response = await https
          .delete(uri,
              headers: {'Accept': 'application/json'},
              body: jsonEncode({'id', id}))
          .timeout(CONNECTION_TIMEOUT,
              onTimeout: () =>
                  throw TimeoutException(MESSAGE_CANNOT_CONNECT_TO_SERVER));

      if (response.statusCode != 200 || response.body.isEmpty) {
        throw const SocketException(MESSAGE_PROCESS_FAILED);
      } else {
        var jsonData = jsonDecode(response.body);
        success = jsonData[RESPONSE_TYPE_SUCCESS];
        message = jsonData['message'];
      }
    } on TimeoutException catch (e) {
      processType = PROCESS_ERROR;
      message = e.message.toString();
    } on SocketException catch (e) {
      processType = PROCESS_ERROR;
      message = e.message;
    } catch (e) {
      processType = PROCESS_ERROR;
      message = e.toString();
    }

    return {
      'success': success,
      'message': message,
      'processType': processType,
    };
  }

  Result toResultList(Map<String, dynamic> result, Function jsonConverter) {
    List<T> data = (result['data'] as List).map((json) {
      return jsonConverter(json) as T;
    }).toList();

    return Result(
      processType: result['processType'],
      data: data,
      message: result['message'] ?? '',
      totalCount: result['totalCount'] ?? 0,
    );
  }

  Result toResultRow(Map<String, dynamic> result, {Function? jsonConverter}) {
    T? data;
    bool success = false;

    if (result['success'] != null) {
      success = result['success'];
    }
    if (result['data'] != null && jsonConverter != null) {
      data = jsonConverter(result['data']);
    }

    return Result(
      processType: result['processType'],
      success: success,
      data: data,
      message: result['message'] ?? '',
    );
  }
}
