import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as https;
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/constants/uri.dart';
import 'package:intania_staff_buddy/models/absent.dart';
import 'package:intania_staff_buddy/models/result.dart';
import 'package:intania_staff_buddy/services/upload_service.dart';
import 'package:intania_staff_buddy/utils/common.dart';
import 'package:intania_staff_buddy/utils/rest_request.dart';

class AbsentService extends RestRequest<Absent> {
  String getRequestUrlSuffix(absentType) {
    switch (absentType) {
      case TYPE_ABSENT_LEAVE:
        return '/personnel/apis/absent/leave/';
      case TYPE_ABSENT_BUSINESS:
        return '/personnel/apis/absent/business/';
      case TYPE_ABSENT_RELAX:
        return '/personnel/apis/absent/relax/';
      case TYPE_ABSENT_BIRTH:
        return '/personnel/apis/absent/birth/';
      case TYPE_ABSENT_HAJJ:
        return '/personnel/apis/absent/hajj/';
      default:
        return '';
    }
  }

  String getSuffixUriEndpoint(String absentType) {
    switch (absentType) {
      case TYPE_ABSENT_LEAVE:
        return '/personnel/apis/absent/leave/';

      case TYPE_ABSENT_BUSINESS:
        return '/personnel/apis/absent/business/';

      case TYPE_ABSENT_RELAX:
        return '/personnel/apis/absent/relax/';

      case TYPE_ABSENT_BIRTH:
        return '/personnel/apis/absent/birth/';

      case TYPE_ABSENT_HAJJ:
        return '/personnel/apis/absent/hajj/';
      default:
        return '';
    }
  }

  Future<Result> initAbsentData(String staffId, String absentType) async {
    String processType = '';
    Absent? data;
    String? message;
    String? suffixUrl;

    try {
      suffixUrl = getRequestUrlSuffix(absentType);

      final queryParams = {'staff_id': staffId};
      final url = Uri.https(PHOENIX_URL, '${suffixUrl}init/', queryParams);

      final response = await https.get(url, headers: {
        'Content-Type': 'application/json',
      }).timeout(CONNECTION_TIMEOUT,
          onTimeout: () =>
              throw TimeoutException(MESSAGE_CANNOT_CONNECT_TO_SERVER));

      if (response.statusCode != 200 && response.body.isEmpty) {
        throw const SocketException(MESSAGE_SERVER_ERROR);
      } else {
        final jsonData = json.decode(response.body);

        processType = jsonData['process_type'];
        message = jsonData['message'];

        if (processType == PROCESS_SUCCESS) {
          data = Absent.fromJson(jsonData['data']);
        }
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

  Future<Result> getData(String id, String absentType) async {
    String suffixUri = getRequestUrlSuffix(absentType);

    final queryParams = {'id': id};
    final uri = Uri.https(PHOENIX_URL, suffixUri, queryParams);
    Map<String, dynamic> result = await get(uri);

    return toResultRow(result, jsonConverter: Absent.fromJson);
  }

  Future<Result> addData(Map data, String absentType,
      {File? fileUpload}) async {
    String suffixUri = getSuffixUriEndpoint(absentType);
    String? fileName;

    if (fileUpload != null) {
      fileName = '${Common.generateMedUploadFileName(data['staff_id'])}.jpg';
      var endpoint = Uri.https(PHOENIX_URL, '$suffixUri/upload');

      Map<String, dynamic>? params = {'file_name': fileName};
      Result uploadResult = await UploadService()
          .uploadImage(endpoint, fileUpload, params: params);

      if (!uploadResult.success) {
        return uploadResult;
      }
    }

    final uri = Uri.https(PHOENIX_URL, suffixUri);
    data['file_upload'] = fileName;

    Map<String, dynamic> result = await insert(uri, data);

    return toResultRow(result);
  }

  Future<Result> uploadMedFile(Uri endpoint, File fileUpload,
      {Map<String, dynamic>? params}) async {
    return await UploadService()
        .uploadImage(endpoint, fileUpload, params: params);
  }

  Future<Result> updateData(String id, Map data, String absentType,
      {File? fileUpload}) async {
    String suffixUri = getSuffixUriEndpoint(absentType);

    String? fileName;
    bool reUpload = false;

    if (fileUpload != null) {
      fileName = '${Common.generateMedUploadFileName(data['staff_id'])}.jpg';
      var endpoint = Uri.https(PHOENIX_URL, '$suffixUri/upload');
      reUpload = true;

      Map<String, dynamic>? params = {
        'file_name': fileName,
        'old_file_name': data['old_file_upload'],
      };

      Result uploadResult =
          await uploadMedFile(endpoint, fileUpload, params: params);
      if (!uploadResult.success) {
        return uploadResult;
      }
    }

    final uri = Uri.https(PHOENIX_URL, suffixUri);
    if (reUpload) {
      data['file_upload'] = fileName;
    }

    Map<String, dynamic> result = await update(uri, id, data);
    return toResultRow(result);
  }

  Future<Result> waitingData(String staffId) async {
    String processType = '';
    String? message;
    Absent? remainResult, cancelResult;

    try {
      final queryParams = {'staff_id': staffId};
      final url = Uri.https(
          PHOENIX_URL, '/personnel/apis/absent/home/waiting', queryParams);
      final response = await https.get(url, headers: {
        'Content-Type': 'application/json',
      }).timeout(CONNECTION_TIMEOUT,
          onTimeout: () =>
              throw TimeoutException(MESSAGE_CANNOT_CONNECT_TO_SERVER));

      if (response.statusCode != 200 || response.body.isEmpty) {
        throw const SocketException(MESSAGE_PROCESS_FAILED);
      } else {
        final jsonData = json.decode(response.body);
        final remainData = jsonData['remain'];
        final cancelData = jsonData['cancel'];
        message = jsonData['message'];

        if (remainData != null) {
          remainResult = Absent.fromJson(remainData);
        }
        if (cancelData != null) {
          cancelResult = Absent.fromJson(cancelData);
        }
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
      data: {
        'remainResult': remainResult,
        'cancelResult': cancelResult,
      },
      message: message.toString(),
    );
  }

  Future<Result> historyData(String staffId,
      {int length = DEFAULT_DISPLAY_LENGTH, int start = 0}) async {
    final queryParams = {
      'staff_id': staffId,
      'start': start.toString(),
      'length': length.toString(),
    };
    final uri =
        Uri.https(PHOENIX_URL, '/personnel/apis/absent/history', queryParams);

    Map<String, dynamic> result = await list(uri);
    return toResultList(result, Absent.fromJson);
  }
}
