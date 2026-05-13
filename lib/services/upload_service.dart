import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/services.dart';
import 'package:intania_staff_buddy/models/result.dart';
import 'package:intania_staff_buddy/utils/rest_request.dart';

class UploadService extends RestRequest {
  Future<Result> uploadImage(
    Uri apiEndpoint,
    File imageFile, {
    Map<String, dynamic>? params,
  }) async {
    var bytes = await rootBundle.load(imageFile.path);
    var buffer = bytes.buffer;
    var imageBytes =
        buffer.asUint8List(bytes.offsetInBytes, bytes.lengthInBytes);
    var base64Image = base64Encode(imageBytes);
    Map<String, dynamic> bodyData = {'image': base64Image};
    if (params != null) {
      bodyData.addAll(params);
    }

    Map<String, dynamic> result = await insert(apiEndpoint, bodyData);
    return toResultRow(result);
  }
}
