import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/models/absent.dart';
import 'package:intania_staff_buddy/models/result.dart';
import 'package:intania_staff_buddy/screens/absent/absent_screen.dart';
import 'package:intania_staff_buddy/services/absent_service.dart';
import 'package:intania_staff_buddy/services/auth_service.dart';
import 'package:intania_staff_buddy/utils/mixins/absent_page_mixin.dart';
import 'package:intania_staff_buddy/utils/mixins/alert_mixin.dart';
import 'package:intania_staff_buddy/widgets/button_datepicker.dart';
import 'package:intania_staff_buddy/widgets/container_center.dart';
import 'package:intania_staff_buddy/widgets/template_absent.dart';
import 'package:provider/provider.dart';

class AbsentHajjScreen extends StatefulWidget {
  final String? id;

  const AbsentHajjScreen({
    super.key,
    this.id,
  });

  @override
  State<AbsentHajjScreen> createState() => _AbsentHajjScreenState();
}

class _AbsentHajjScreenState extends State<AbsentHajjScreen>
    with AbsentPageMixin, AlertMixin {
  final _formKey = GlobalKey<FormState>();
  bool _ready = false;
  bool _progressing = false;
  Absent? _data;
  String _processType = '';
  String _message = '';

  String? _selectedApprover;
  DateTime? _selectedStartDate, _selectedEndDate;

  final TextEditingController _ctrlReason = TextEditingController();
  final TextEditingController _ctrlAbsentDays = TextEditingController();

  @override
  void initState() {
    super.initState();

    Provider.of<AuthService>(context, listen: false).currentUser.then(
      (user) async {
        if (user != null) {
          final String staffId = user.staffId;
          Result result;
          String processType = '';
          String? message;
          Absent? data;

          if (widget.id == null) {
            result =
                await AbsentService().initAbsentData(staffId, TYPE_ABSENT_HAJJ);
          } else {
            result = await AbsentService()
                .getData(widget.id.toString(), TYPE_ABSENT_HAJJ);
          }

          processType = result.processType;
          message = result.message;
          data = result.data;

          setState(() {
            _ready = true;
            _processType = processType;
            _message = message.toString();
            _data = data;
          });

          if (widget.id != null) {
            setInitialValue();
          }
        }
      },
    );
  }

  void setInitialValue() {
    _ctrlReason.text = _data!.reason != null ? _data!.reason.toString() : '';
    _ctrlAbsentDays.text =
        _data!.absentDays != null ? _data!.absentDays.toString() : '';
  }

  void handleSubmit() {
    if (_formKey.currentState!.validate()) {
      var approverValue = _selectedApprover;
      var avParts = approverValue?.split('|');

      if (avParts!.length == 2) {
        setState(() {
          _progressing = true;
        });

        var avStaffId = avParts[0];
        var avPositionId = avParts[1];
        var data = {
          'staff_id': _data!.staffId,
          'dept_id': _data!.deptId,
          'step': _data!.step,
          'status': _data!.status,
          'write_date': _data!.writeDate.toString(),
          'times': _data!.absentTime,
          'approver_position': avPositionId,
          'absence': TYPE_ABSENT_HAJJ,
          'start_date': _selectedStartDate.toString(),
          'end_date': _selectedEndDate.toString(),
          'num_days': _ctrlAbsentDays.text,
          'main_approver': avStaffId,
        };

        Timer(CONNECTION_TIMEOUT, () async {
          Result result;
          if (widget.id != null) {
            data['id'] = _data!.id;

            result = await AbsentService()
                .updateData(widget.id.toString(), data, TYPE_ABSENT_HAJJ);
          } else {
            result = await AbsentService().addData(data, TYPE_ABSENT_HAJJ);
          }

          if (widget.id == null) {
            Future.delayed(DELAY_TIMEOUT, () async {
              await Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (context) => const AbsentScreen(
                          selectedTabIndex: TABINDEX_ABSENT_USER_WAITING)));
            });
          }

          if (mounted) {
            showSnackBarByResult(context, result);
          }

          setState(() {
            _progressing = false;
          });
        });
      }
    }
    return;
  }

  Widget form() {
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
              const Row(
                children: [
                  Text(TEXT_DEAR,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      )),
                  SizedBox(width: 12),
                  Text(TEXT_DEAN, style: TextStyle(fontSize: 16)),
                ],
              ),
              const SizedBox(height: 40),
              const Text(
                MESSAGE_ABSENT_HAJJ,
                style: TextStyle(fontSize: 16, height: 1.8),
              ),
              const SizedBox(height: 30),
              Row(
                children: [
                  Flexible(
                    child: ButtonDatepicker(
                      labelText: LABEL_ABSENT_START,
                      value: _data?.startDate,
                      minimumDate: DateTime.now(),
                      maximumDate: _selectedEndDate,
                      onTapCallback: (value) {
                        setState(() {
                          _selectedStartDate = value;
                        });

                        if (_selectedEndDate != null &&
                            _selectedStartDate != null) {
                          if (_selectedStartDate!.compareTo(_selectedEndDate!) >
                              0) {
                            setState(() {
                              _selectedEndDate = _selectedStartDate;
                            });
                          }
                        }
                        displayDiffDays(_selectedStartDate, _selectedEndDate);
                      },
                    ),
                  ),
                  const SizedBox(width: 40),
                  Flexible(
                    child: ButtonDatepicker(
                      labelText: LABEL_ABSENT_END,
                      minimumDate: _selectedStartDate,
                      value: _data?.endDate,
                      onTapCallback: (value) {
                        setState(() {
                          _selectedEndDate = value;
                        });
                        displayDiffDays(_selectedStartDate, _selectedEndDate);
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 40),
              TextField(
                controller: _ctrlAbsentDays,
                readOnly: true,
                decoration: const InputDecoration(
                  labelText: LABEL_ABSENT_TOTAL_DAY,
                ),
              ),
              SizedBox(height: MediaQuery.of(context).size.height * 0.12),
            ],
          ),
        ),
      ),
    );
  }

  Widget displayWidget() {
    switch (_processType) {
      case PROCESS_SUCCESS:
        return form();
      case PROCESS_REMAIN:
      case PROCESS_NO_APPROVER:
      case PROCESS_NO_DEPT_ADMIN:
        return ContainerCenter(
          title: TITLE_ABSENT_CANNOT_ABSENT,
          desc: _message,
        );
      default:
        return ContainerCenter(
          title: TITLE_ERROR,
          desc: _message,
        );
    }
  }

  void displayDiffDays(DateTime? startDate, DateTime? endDate) {
    String? diffDays = super.calculateDiffDays(startDate, endDate);

    if (diffDays != null) {
      _ctrlAbsentDays.text = diffDays.toString();
    }
  }

  @override
  Widget build(BuildContext context) {
    return TemplateAbsent(
      appTitle: PAGE_ABSENT_HAJJ,
      progressing: _progressing,
      showNavbar: _processType == PROCESS_SUCCESS ? true : false,
      onSubmit: handleSubmit,
      child: !_ready
          ? const Center(child: CircularProgressIndicator())
          : displayWidget(),
    );
  }
}
