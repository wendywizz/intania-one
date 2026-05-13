import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/models/result.dart';
import 'package:intania_staff_buddy/services/repair_computer_service.dart';
import 'package:intania_staff_buddy/utils/display_datetime.dart';
import 'package:intania_staff_buddy/widgets/row_detail.dart';

class RepairComputerRejectDetail extends StatefulWidget {
  final String jobId;
  final String? worker;

  const RepairComputerRejectDetail({
    super.key,
    required this.jobId,
    this.worker,
  });

  @override
  State<RepairComputerRejectDetail> createState() =>
      _RepairComputerRejectDetailState();
}

class _RepairComputerRejectDetailState
    extends State<RepairComputerRejectDetail> {
  Map<String, String>? _data;
  String? _processType;
  bool _ready = false;

  @override
  void initState() {
    super.initState();

    void initData() async {
      String processType = '';
      Map<String, String>? data;

      if (widget.jobId.isNotEmpty) {
        Result result = await RepairComputerService()
            .getRejectReason(widget.jobId.toString(), worker: widget.worker);

        processType = result.processType;
        data = result.data as Map<String, String>;
      } else {
        processType = PROCESS_ERROR;
      }

      setState(() {
        _ready = true;
        _data = data;
        _processType = processType;
      });
    }

    initData();
  }

  String showDetail() {
    switch (_processType) {
      case PROCESS_SUCCESS:
        return _data!['detail'].toString();
      default:
        return TEXT_NONE;
    }
  }

  String showDatetime() {
    String? dateTimeValue = _data!['dateTime'];
    if (dateTimeValue!.isNotEmpty) {
      String dateTime =
          DisplayDateTime.formatDateTime(DateTime.parse(dateTimeValue));
      switch (_processType) {
        case PROCESS_SUCCESS:
          return dateTime.toString();
        default:
          return TEXT_NONE;
      }
    } else {
      return '-';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        RowDetail(
          title: LABEL_RC_REJECTED_REASON,
          description: _ready ? showDetail() : '',
        ),
        RowDetail(
          title: LABEL_RC_REJECTED_REASON_DATETIME,
          description: _ready ? showDatetime() : '',
        ),
      ],
    );
  }
}
