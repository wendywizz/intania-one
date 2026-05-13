import 'package:intania_staff_buddy/constants/uri.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/models/absent_approve.dart';
import 'package:intania_staff_buddy/models/result.dart';
import 'package:intania_staff_buddy/utils/rest_request.dart';

class AbsentApproveService extends RestRequest<AbsentApprove> {
  Future<Result> approveData(String staffId,
      {int length = DEFAULT_DISPLAY_LENGTH, int start = 0}) async {
    final queryParams = {
      'staff_id': staffId,
      //'staff_id': '0000301', // Or,
      //'staff_id': '0000237', // porn,
      //'staff_id': '0000340', // Nini
      'start': start.toString(),
      'length': length.toString(),
    };
    final uri =
        Uri.https(PHOENIX_URL, '/personnel/apis/absent/approve', queryParams);

    Map<String, dynamic> result = await list(uri);
    return toResultList(result, AbsentApprove.fromJson);
  }

  Future<Result> approveAbsenceDetail(
      String absenceId, String type, String progress,
      {String? approveId}) async {
    final queryParams = {
      'absence_id': absenceId,
      'type': type,
      'progress': progress
    };
    if (approveId != null) {
      queryParams['approve_id'] = approveId;
    }
    final uri = Uri.https(PHOENIX_URL,
        '/personnel/apis/absent/approve/view_absence', queryParams);
    Map<String, dynamic> result = await get(uri);
    return toResultRow(result, jsonConverter: AbsentApprove.fromJson);
  }

  Future<Result> approveMissTimestampDetail(String forgetId) async {
    final queryParams = {'forget_id': forgetId};
    final uri = Uri.https(PHOENIX_URL,
        '/personnel/apis/absent/approve/view_miss_timestamp', queryParams);
    Map<String, dynamic> result = await get(uri);
    return toResultRow(result, jsonConverter: AbsentApprove.fromJson);
  }

  Future<Result> submitApproveAbsence(String absenceId, Map data) async {
    final uri = Uri.https(
        INFOR_URL, '$RP_PATH_API/personnel/apis/absent/approve/submit_absence');
    Map<String, dynamic> result = await update(uri, absenceId, data);

    return toResultRow(result);
  }

  Future<Result> submitApproveMissTimestamp(String forgetId, Map data) async {
    final uri = Uri.https(INFOR_URL,
        '$RP_PATH_API/personnel/apis/absent/approve/submit_forget_timestamp');
    Map<String, dynamic> result = await update(uri, forgetId, data);

    return toResultRow(result);
  }
}
