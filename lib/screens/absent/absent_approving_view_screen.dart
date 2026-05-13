import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/models/absent.dart';
import 'package:intania_staff_buddy/models/absent_approve.dart';
import 'package:intania_staff_buddy/models/result.dart';
import 'package:intania_staff_buddy/screens/absent/absent_approving_history_view.dart';
import 'package:intania_staff_buddy/screens/absent/absent_approving_not_approve_view.dart';
import 'package:intania_staff_buddy/services/absent_approve_service.dart';
import 'package:intania_staff_buddy/utils/display_datetime.dart';
import 'package:intania_staff_buddy/utils/mixins/absent_page_mixin.dart';
import 'package:intania_staff_buddy/utils/mixins/alert_mixin.dart';
import 'package:intania_staff_buddy/widgets/button.dart';
import 'package:intania_staff_buddy/widgets/container_center.dart';
import 'package:intania_staff_buddy/widgets/panel.dart';
import 'package:intania_staff_buddy/widgets/row_detail.dart';
import 'package:intania_staff_buddy/widgets/template_blank.dart';

class AbsentApprovingViewScreen extends StatefulWidget {
  final String id;
  final String? staffId;
  final String? approveId;
  final String? type;
  final String? progress;
  final String? position;
  final String? signDate;
  final String? enDate;
  final String? inTime;
  final String? outTime;

  const AbsentApprovingViewScreen({
    super.key,
    required this.id,
    this.staffId,
    this.approveId,
    this.type,
    this.progress,
    this.position,
    this.signDate,
    this.enDate,
    this.inTime,
    this.outTime,
  });

  @override
  State<AbsentApprovingViewScreen> createState() =>
      _AbsentApprovingViewScreenState();
}

class _AbsentApprovingViewScreenState extends State<AbsentApprovingViewScreen>
    with AbsentPageMixin, AlertMixin {
  final _formKey = GlobalKey<FormState>();
  bool _ready = false;
  String? _processType;
  String? _responseMessage;
  AbsentApprove? _data;
  bool _progressing = false;

  @override
  void initState() {
    super.initState();

    void initData() async {
      String processType = '';
      String? message;
      AbsentApprove? data;
      Result? result;

      if (widget.type == TYPE_ABSENT_APPROVE_ABSENT) {
        result = await AbsentApproveService().approveAbsenceDetail(
          widget.id,
          widget.type.toString(),
          widget.progress.toString(),
          approveId: widget.approveId,
        );
      }

      if (widget.type == TYPE_ABSENT_APPROVE_MISS_TIMESTAMP) {
        result =
            await AbsentApproveService().approveMissTimestampDetail(widget.id);
      }

      if (result != null) {
        processType = result.processType;
        if (result.data != null) {
          data = result.data as AbsentApprove;
        }

        setState(() {
          _ready = true;
          _processType = processType;
          _responseMessage = message.toString();
          _data = data;
        });
      } else {
        setState(() {
          _ready = true;
          _processType = PROCESS_ERROR;
          _responseMessage = MESSAGE_DATA_NOT_FOUND;
        });
      }
    }

    initData();
  }

  Widget renderForm() {
    if (_data != null) {
      switch (_processType) {
        case PROCESS_SUCCESS:
          switch (widget.type) {
            case TYPE_ABSENT_APPROVE_ABSENT:
              return formAbsent();
            case TYPE_ABSENT_APPROVE_MISS_TIMESTAMP:
              return formMissTimestamp();
            default:
              return const ContainerCenter(
                title: TITLE_ERROR,
                desc: TEXT_ERROR,
              );
          }
        case PROCESS_FAILED:
          return ContainerCenter(
            title: TITLE_NO_DATA,
            desc: _responseMessage,
          );
        default:
          return ContainerCenter(
            title: TITLE_ERROR,
            desc: _responseMessage,
          );
      }
    } else {
      return ContainerCenter(
        title: TITLE_ERROR,
        desc: _responseMessage,
      );
    }
  }

  Widget formMissTimestamp() {
    String dateMessage = '', timeMessage = '';

    if (_data!.startDate != null) {
      dateMessage = DisplayDateTime.formatDate(_data!.startDate as DateTime);

      if (_data!.type == TYPE_ABSENT_MISS_TIMESTAMP_INTIME) {
        timeMessage = DisplayDateTime.strFormatTime(_data!.inTime.toString());
      }
      if (_data!.type == TYPE_ABSENT_MISS_TIMESTAMP_OUTTIME) {
        timeMessage = DisplayDateTime.strFormatTime(_data!.outTime.toString());
      }
    }

    return SingleChildScrollView(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 15),
        child: Form(
          key: _formKey,
          autovalidateMode: AutovalidateMode.onUserInteraction,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _data!.writeDate != null
                  ? Row(
                      children: [
                        const Text(TEXT_SUBMIT_DATE,
                            style: TextStyle(fontWeight: FontWeight.bold)),
                        const SizedBox(width: 12),
                        Text(DisplayDateTime.formatDate(
                            _data!.writeDate as DateTime)),
                      ],
                    )
                  : Container(),
              const SizedBox(height: 40),
              _data!.approverPosition != null
                  ? Column(
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(TEXT_DEAR,
                                style: TextStyle(fontWeight: FontWeight.bold)),
                            const SizedBox(width: 12),
                            Flexible(
                                child:
                                    Text(_data!.approverPosition.toString())),
                          ],
                        ),
                        const SizedBox(height: 40),
                      ],
                    )
                  : Container(),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(TEXT_ABSENT_SENDER,
                      style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_data!.name.toString()),
                      /*const SizedBox(height: 2),
                      Text(_data!.deptName.toString(),
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 16)),*/
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 40),
              Text.rich(
                TextSpan(children: [
                  const TextSpan(text: MESSAGE_ABSENT_MISS_TIMESTAMP_CONFIRM),
                  TextSpan(
                      text: ' $dateMessage ',
                      style: const TextStyle(fontWeight: FontWeight.bold)),
                  const TextSpan(text: TEXT_ONTIME_PREFIX),
                  TextSpan(
                      text: ' $timeMessage ',
                      style: const TextStyle(fontWeight: FontWeight.bold)),
                  const TextSpan(text: TEXT_ONTIME_SUFFIX),
                ]),
              ),
              const SizedBox(height: 20),
              const Text(MESSAGE_ABSENT_MISS_TIMESTAMP_MESSAGE1),
              const SizedBox(height: 20),
              Text(_data!.reason.toString(),
                  style: const TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 20),
              const Text(MESSAGE_ABSENT_MISS_TIMESTAMP_MESSAGE2),
              SizedBox(height: MediaQuery.of(context).size.height * 0.12),
            ],
          ),
        ),
      ),
    );
  }

  Widget renderHistoryData(List<Absent> data) {
    if (data.isNotEmpty) {
      final widget = data
          .map(
            (element) => RowDetail(
              title: element.absentTypeName.toString(),
              description: '${element.absentDays} วัน',
              titleFlexSize: 1,
              descriptionFlexSize: 1,
            ),
          )
          .toList();
      return Column(
        children: widget,
      );
    }
    return Container();
  }

  Widget formAbsent() {
    List<Absent> resultAbsentStats = [];
    if (_data!.absentHistory != null) {
      Map<String, Map<String, dynamic>> groupedData = {};
      for (var absent in _data!.absentHistory as List<Absent>) {
        if (groupedData.containsKey(absent.absentType)) {
          groupedData[absent.absentType]!['absentDays'] += absent.absentDays;
        } else {
          groupedData[absent.absentType.toString()] = {
            'absentTypeName': absent.absentTypeName,
            'absentDays': absent.absentDays
          };
        }
      }

      resultAbsentStats = groupedData.entries
          .map((entry) => Absent(
              absentType: entry.key,
              absentTypeName: entry.value['absentTypeName'],
              absentDays: entry.value['absentDays'],
              staffId: '',
              writeDate: DateTime.now()))
          .toList();

      resultAbsentStats
          .sort((a, b) => a.absentType!.compareTo(b.absentType.toString()));
    }

    return SingleChildScrollView(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 15),
        child: Form(
          key: _formKey,
          autovalidateMode: AutovalidateMode.onUserInteraction,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _data!.writeDate != null
                  ? Row(
                      children: [
                        const Text(TEXT_SUBMIT_DATE,
                            style: TextStyle(fontWeight: FontWeight.bold)),
                        const SizedBox(width: 12),
                        Text(DisplayDateTime.formatDate(
                            _data!.writeDate as DateTime)),
                      ],
                    )
                  : Container(),
              const SizedBox(height: 40),
              _data!.approverPosition != null
                  ? Column(
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(TEXT_DEAR,
                                style: TextStyle(fontWeight: FontWeight.bold)),
                            const SizedBox(width: 12),
                            Flexible(
                                child:
                                    Text(_data!.approverPosition.toString())),
                          ],
                        ),
                        const SizedBox(height: 40),
                      ],
                    )
                  : Container(),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(TEXT_ABSENT_SENDER,
                      style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_data!.name.toString()),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 40),
              Text.rich(
                TextSpan(
                  children: [
                    const TextSpan(text: ' $MESSAGE_ABSENT_ABSENCE_MESSAGE1 '),
                    TextSpan(
                        text: ' ${_data!.approveName}',
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                    ((_data!.startDate != null) && (_data!.endDate != null))
                        ? TextSpan(children: [
                            const TextSpan(text: ' $TEXT_SINCE_DATE '),
                            TextSpan(
                                text: DisplayDateTime.beautyfulBetweenDate(
                                    _data!.startDate as DateTime,
                                    _data!.endDate as DateTime),
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold)),
                          ])
                        : TextSpan(
                            children: [
                              const TextSpan(text: ' $TEXT_ONDATE '),
                              TextSpan(
                                  text: DisplayDateTime.formatDate(
                                      _data!.startDate as DateTime),
                                  style: const TextStyle(
                                      fontWeight: FontWeight.bold))
                            ],
                          ),
                    _data!.reason != null
                        ? TextSpan(children: [
                            const TextSpan(
                                text: ' $MESSAGE_ABSENT_ABSENCE_MESSAGE3 '),
                            TextSpan(
                                text: _data!.reason,
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold))
                          ])
                        : const TextSpan(text: ''),
                    TextSpan(
                        text: _data!.agentList != null
                            ? ' $MESSAGE_ABSENT_ABSENCE_MESSAGE2 '
                            : ''),
                  ],
                ),
              ),
              _data!.agentList != null
                  ? Column(
                      children: [
                        const SizedBox(height: 20),
                        Text(_data!.agentList.toString(),
                            style:
                                const TextStyle(fontWeight: FontWeight.bold)),
                      ],
                    )
                  : Container(),
              const SizedBox(height: 20),
              const Text(MESSAGE_ABSENT_ABSENCE_MESSAGE4),
              const SizedBox(height: 40),
              const Text(TITLE_ABSENT_STATS,
                  style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 10),
              const Text.rich(TextSpan(
                  text:
                      '$MESSAGE_ABSENT_DATE_RANGE 1 ตุลาคม 2567 $MESSAGE_AVSENT_DATE_TO 30 กันยายน 2567')),
              renderHistoryData(resultAbsentStats),
              const SizedBox(height: 20),
              Button(
                backgroundColor: Colors.transparent,
                width: double.infinity,
                onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (context) => AbsentApprovingHistoryView(
                            data: _data!.absentHistory))),
                child: const Text(TEXT_ABSENT_HISTORY),
              ),
              SizedBox(height: MediaQuery.of(context).size.height * 0.12),
            ],
          ),
        ),
      ),
    );
  }

  void handleAction() async {
    switch (widget.type) {
      case TYPE_ABSENT_APPROVE_ABSENT:
        Map data = {
          'approve_id': widget.approveId,
          'type': widget.type,
          'progress': widget.progress,
          'status': TYPE_ABSENT_APPROVE_ACCEPT,
          'reason': MESSAGE_ABSENT_APPROVE_CONFIRM,
        };
        await AbsentApproveService().submitApproveAbsence(widget.id, data);
        break;
      case TYPE_ABSENT_APPROVE_MISS_TIMESTAMP:
        Map data = {
          'approve_id': widget.approveId,
          'status': '1',
          'intime': widget.inTime,
          'outtime': widget.outTime,
        };
        await AbsentApproveService()
            .submitApproveMissTimestamp(widget.id, data);
        break;
      default:
        return;
    }
  }

  void handleSubmit() {
    setState(() {
      _progressing = true;
    });

    showDialog(
      context: context,
      builder: (BuildContext context) {
        Widget noButton = ElevatedButton(
          child: const Text(TEXT_NO),
          onPressed: () {
            Navigator.of(context).pop(false);
            setState(() {
              _progressing = false;
            });
          },
        );
        Widget yesButton = ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.blue,
            foregroundColor: Colors.white,
          ),
          child: const Text(TEXT_YES),
          onPressed: () {
            handleAction();
            if (context.mounted) {
              Navigator.of(context).pop(false);
            }
          },
        );
        AlertDialog alert = AlertDialog(
          title: const Text(TITLE_ABSENT_CONFIRM_APPROVE),
          content: const Text(MESSAGE_ABSENT_CONFIRM_APPROVE),
          actions: [yesButton, noButton],
        );
        return alert;
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    String? appTitleName;

    if (_data != null) {
      appTitleName = _data!.approveName;
    }
    return TemplateBlank(
      appBarTitle: appTitleName ?? '',
      child: !_ready
          ? const Center(child: CircularProgressIndicator())
          : Stack(
              children: [
                SingleChildScrollView(child: renderForm()),
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  child: Panel(
                    child: Row(
                      children: [
                        Expanded(
                          child: Button(
                            backgroundColor: Colors.green,
                            foregroundColor: Colors.white,
                            onPressed:
                                !_progressing ? () => handleSubmit() : null,
                            child: const Text(TEXT_ABSENT_APPROVE),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Button(
                            backgroundColor: Colors.red,
                            foregroundColor: Colors.white,
                            onPressed: !_progressing
                                ? () => Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) {
                                          return AbsentApprovingNotApproveView(
                                            id: widget.id,
                                            approveId:
                                                widget.approveId.toString(),
                                            type: widget.type.toString(),
                                          );
                                        },
                                      ),
                                    )
                                : null,
                            child: const Text(TEXT_ABSENT_NOT_APPROVE),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}
