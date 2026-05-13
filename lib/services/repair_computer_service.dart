import 'dart:async';
import 'package:intania_staff_buddy/constants/uri.dart';
import 'package:intania_staff_buddy/models/repair_computer.dart';
import 'package:intania_staff_buddy/models/result.dart';
import 'package:intania_staff_buddy/utils/rest_request.dart';

class RepairComputerService extends RestRequest<RepairComputer> {
  Future<Result> updateInformData(String id, Map data,
      {String? actionPath}) async {
    Uri uri;
    if (actionPath != null) {
      uri = Uri.https(INFOR_URL, '${RP_PATH_API}inform/$actionPath');
    } else {
      uri = Uri.https(INFOR_URL, '${RP_PATH_API}inform');
    }

    Map<String, dynamic> result = await update(uri, id, data);

    return toResultRow(result);
  }

  Future<Result> updateManageData(String id, Map data,
      {String? actionPath}) async {
    Uri uri;

    if (actionPath != null) {
      uri = Uri.https(INFOR_URL, '${RP_PATH_API}manage/$actionPath');
    } else {
      uri = Uri.https(INFOR_URL, '${RP_PATH_API}manage/');
    }
    Map<String, dynamic> result = await update(uri, id, data);

    return toResultRow(result);
  }

  Future<Result> updateOperateData(String id, Map data,
      {String? actionPath}) async {
    Uri uri;

    if (actionPath != null) {
      uri = Uri.https(INFOR_URL, '${RP_PATH_API}operate/$actionPath');
    } else {
      uri = Uri.https(INFOR_URL, '${RP_PATH_API}operate/');
    }
    Map<String, dynamic> result = await update(uri, id, data);

    return toResultRow(result);
  }

  Future<Result> checkCanInform(String staffId) async {
    final query = {'staff_id': staffId};
    final uri =
        Uri.https(INFOR_URL, '${RP_PATH_API}inform/check_can_inform', query);
    Map<String, dynamic> result = await get(uri);

    return toResultRow(result);
  }

  Future<Result> getJobDetail(String id) async {
    final query = {'id': id};
    final uri = Uri.https(INFOR_URL, '${RP_PATH_API}inform', query);
    Map<String, dynamic> result = await get(uri);

    return toResultRow(result, jsonConverter: RepairComputer.fromJson);
  }

  Future<Result> addData(Map data) async {
    final uri = Uri.https(INFOR_URL, '$RP_PATH_API/inform');
    Map<String, dynamic> result = await insert(uri, data);

    return toResultRow(result);
  }

  Future<Result> closeJob(String id) async {
    final data = {'id': id};
    return await updateInformData(id, data, actionPath: 'close');
  }

  Future<Result> removeJob(String id) async {
    final uri = Uri.https(INFOR_URL, '${RP_PATH_API}inform');
    Map<String, dynamic> result = await delete(uri, id);

    return toResultRow(result);
  }

  Future<Result> getUserCurrentJob(
    String staffId, {
    int? start,
    int? length,
  }) async {
    final query = {
      'staff_id': staffId,
      'start': start,
      'length': length,
    };
    final uri = Uri.https(INFOR_URL, '${RP_PATH_API}inform/current', query);
    Map<String, dynamic> result = await list(uri);

    return toResultList(result, RepairComputer.fromJson);
  }

  Future<Result> workerQueue() async {
    final uri = Uri.https(INFOR_URL, '${RP_PATH_API}inform/queue');
    Map<String, dynamic> result = await list(uri);

    List<Map<String, dynamic>> data = (result['data'] as List).map((e) {
      Map<String, dynamic> item = {
        'staffId': e['staffId'],
        'workerFullname': e['workerFullname'],
        'jobCount': e['jobCount'],
        'jobCountDescription': e['jobCountDescription'],
      };

      return item;
    }).toList();

    return Result(
      data: data,
      message: result['message'],
      totalCount: result['totalCount'],
      processType: result['processType'],
    );
  }

  Future<Result> getUserHistory(
    String staffId, {
    String type = '',
    int? start,
    int? length,
  }) async {
    final query = {
      'staff_id': staffId,
      'type': type,
      'start': start,
      'length': length,
    };
    final uri = Uri.https(INFOR_URL, '${RP_PATH_API}inform/history', query);
    Map<String, dynamic> result = await list(uri);

    return toResultList(result, RepairComputer.fromJson);
  }

  Future<Result> getUncloseJob(
    String staffId, {
    int? start,
    int? length,
  }) async {
    final query = {
      'staff_id': staffId,
      'start': start,
      'length': length,
    };
    final uri = Uri.https(INFOR_URL, '${RP_PATH_API}inform/unclose_job', query);
    Map<String, dynamic> result = await list(uri);

    return toResultList(result, RepairComputer.fromJson);
  }

  /* Manage */
  Future<Result> listForemanNewJob({
    int? start,
    int? length,
  }) async {
    final query = {
      'start': start,
      'length': length,
    };
    final uri = Uri.https(INFOR_URL, '${RP_PATH_API}manage/new', query);
    Map<String, dynamic> result = await list(uri);

    return toResultList(result, RepairComputer.fromJson);
  }

  Future<Result> listForemanManageJob(String foreman,
      {int? start, int? length}) async {
    final query = {
      'start': start,
      'length': length,
      'staff_id': foreman,
    };
    final uri = Uri.https(INFOR_URL, '${RP_PATH_API}manage/current', query);
    Map<String, dynamic> result = await list(uri);

    return toResultList(result, RepairComputer.fromJson);
  }

  Future<Result> listForemanHistory(String foreman,
      {int? start, int? length}) async {
    final query = {
      'start': start,
      'length': length,
      'staff_id': foreman,
    };
    final uri = Uri.https(INFOR_URL, '${RP_PATH_API}manage/history', query);
    Map<String, dynamic> result = await list(uri);

    return toResultList(result, RepairComputer.fromJson);
  }

  Future<Result> changeWorker(String id, String workerId) async {
    var data = {'worker': workerId};
    return await updateManageData(id, data, actionPath: 'change_worker');
  }

  Future<Result> foremanRejectJob(String id) async {
    return await updateManageData(id, {}, actionPath: 'reject');
  }

  Future<Result> foremanUnassignJob(String id) async {
    return await updateManageData(id, {}, actionPath: 'unassign');
  }

  Future<Result> acceptRejectedFromWorker(String id) async {
    return await updateManageData(id, {}, actionPath: 'accept_rejected');
  }

  Future<Result> assignJob(
      String id, String repairType, String worker, String foreman) async {
    final data = {
      'repair_type': repairType,
      'worker': worker,
      'staff_id': foreman,
    };
    return await updateManageData(id, data, actionPath: 'assign');
  }

  Future<Result> getRepairTypes() async {
    final uri = Uri.https(INFOR_URL, '$RP_PATH_API/manage/repair_type_list');
    Map<String, dynamic> result = await list(uri);

    List<Map<String, String>> data = (result['data'] as List).map((e) {
      Map<String, String> item = {'id': e['id'], 'name': e['name'].toString()};
      return item;
    }).toList();

    return Result(
      data: data,
      message: result['message'],
      totalCount: result['totalCount'],
      processType: result['processType'],
    );
  }

  Future<Result> getRejectReason(String jobId, {String? worker}) async {
    final query = {'id': jobId};
    if (worker!.isNotEmpty) {
      query['worker'] = worker;
    }
    final uri =
        Uri.https(INFOR_URL, '$RP_PATH_API/inform/reject_reason', query);
    Map<String, dynamic> result = await get(uri);
    Map<String, dynamic> data = result['data'];

    Map<String, String> detail = {
      'detail': data['detail'].toString(),
      'dateTime': data['dateTime'].toString(),
    };

    return Result(
      data: detail,
      message: result['message'],
      processType: result['processType'],
    );
  }

  /* Operate */
  Future<Result> listWorkerNewJob(String worker,
      {int? start, int? length}) async {
    final query = {
      'start': start,
      'length': length,
      'staff_id': worker,
    };
    final uri = Uri.https(INFOR_URL, '${RP_PATH_API}operate/new', query);
    Map<String, dynamic> result = await list(uri);

    return toResultList(result, RepairComputer.fromJson);
  }

  Future<Result> listWorkerCurrentJob(String worker,
      {int? start, int? length}) async {
    final query = {
      'start': start,
      'length': length,
      'staff_id': worker,
    };
    final uri = Uri.https(INFOR_URL, '${RP_PATH_API}operate/current', query);
    Map<String, dynamic> result = await list(uri);

    return toResultList(result, RepairComputer.fromJson);
  }

  Future<Result> listWorkerHistory(String worker,
      {int? start, int? length}) async {
    final query = {
      'start': start,
      'length': length,
      'staff_id': worker,
    };
    final uri = Uri.https(INFOR_URL, '${RP_PATH_API}operate/history', query);
    Map<String, dynamic> result = await list(uri);

    return toResultList(result, RepairComputer.fromJson);
  }

  Future<Result> workerReceiveJob(String jobId, bool isAccept,
      {String? reason}) async {
    var data = {'action': isAccept ? 'accept' : 'reject'};

    if (isAccept == false) {
      data['reason'] = reason!;
    }
    return await updateOperateData(jobId, data, actionPath: 'accept_newjob');
  }

  Future<Result> workerOperateJob(
      String jobId, String repairDetail, String solveDetail) async {
    var data = {'audit': repairDetail, 'result': solveDetail};

    return await updateOperateData(jobId, data, actionPath: 'operate_job');
  }

  Future<Result> requestSupply(String jobId, String detail) async {
    var data = {'detail': detail};
    return await updateOperateData(jobId, data, actionPath: 'request_supply');
  }

  Future<Result> submitJob(String jobId, {String? userTip}) async {
    var data = {};
    if (userTip != null) {
      data = {'user_tip': userTip};
    }
    return await updateOperateData(jobId, data, actionPath: 'submit_job');
  }
}
