import 'package:intl/intl.dart';

class Common {
  static String generateMedUploadFileName(String staffId) {
    String fileName =
        '${DateFormat('y-M-d_H-m-s').format(DateTime.now())}_$staffId';
    return fileName;
  }
}
