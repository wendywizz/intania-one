import 'dart:async';
import 'dart:io';
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
import 'package:intania_staff_buddy/widgets/box_upload_image.dart';
import 'package:intania_staff_buddy/widgets/button_datepicker.dart';
import 'package:intania_staff_buddy/widgets/container_center.dart';
import 'package:intania_staff_buddy/widgets/dropdown_approver.dart';
import 'package:intania_staff_buddy/widgets/dropdown_half_day.dart';
import 'package:intania_staff_buddy/widgets/template_absent.dart';
import 'package:provider/provider.dart';

class AbsentLeaveScreen extends StatefulWidget {
  final String? id;

  const AbsentLeaveScreen({
    super.key,
    this.id,
  });

  @override
  State<AbsentLeaveScreen> createState() => _AbsentLeaveScreenState();
}

class _AbsentLeaveScreenState extends State<AbsentLeaveScreen>
    with AbsentPageMixin, AlertMixin {
  final _formKey = GlobalKey<FormState>();
  bool _ready = false;
  bool _progressing = false;
  Absent? _data;
  String _processType = '';
  String _message = '';
  bool _enableUpload = false;
  dynamic _fileUpload;
  String? _oldFileUpload;

  String? _selectedApprover;
  DateTime? _selectedStartDate, _selectedEndDate;
  String? _selectedHalfDayType = HALF_DAY_NULL['value'];

  final TextEditingController _ctrlReason = TextEditingController();
  final TextEditingController _ctrlAbsentDays = TextEditingController();
  final TextEditingController _ctrlContact = TextEditingController();

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
            result = await AbsentService()
                .initAbsentData(staffId, TYPE_ABSENT_LEAVE);
          } else {
            result = await AbsentService()
                .getData(widget.id.toString(), TYPE_ABSENT_LEAVE);
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
    if (_data != null) {
      _ctrlReason.text = _data!.reason != null ? _data!.reason.toString() : '';
      _ctrlAbsentDays.text =
          _data!.absentDays != null ? _data!.absentDays.toString() : '';
      _ctrlContact.text =
          _data!.contact != null ? _data!.contact.toString() : '';

      setState(() {
        _selectedStartDate = _data!.startDate;
        _selectedEndDate = _data!.endDate;
        _selectedApprover = _data!.approverPosition;
        _selectedHalfDayType = _data!.partFlag;
        _enableUpload = _data!.fileUpload!.isNotEmpty ? true : false;
        _fileUpload = _data!.fileUploadLink;
        _oldFileUpload = _data!.fileUpload;
      });
    }
  }

  void handleSubmit() {
    if (_formKey.currentState!.validate()) {
      setState(() {
        _progressing = true;
      });

      var data = {
        'staff_id': _data!.staffId,
        'dept_id': _data!.deptId,
        'step': _data!.step,
        'status': _data!.status,
        'write_date': _data!.writeDate.toString(),
        'times': _data!.absentTime,
        'approver_position': _selectedApprover,
        'absence': TYPE_ABSENT_BUSINESS,
        'start_date': _selectedStartDate.toString(),
        'end_date': _selectedEndDate.toString(),
        'startpart': _selectedHalfDayType,
        'num_days': _ctrlAbsentDays.text,
        'contact': _ctrlContact.text,
        'reason': _ctrlReason.text,
      };

      Timer(CONNECTION_TIMEOUT, () async {
        Result result;
        File? selectedFile;

        if (_fileUpload is File) {
          selectedFile = _fileUpload;
        }

        if (widget.id != null) {
          data['id'] = _data!.id;
          data['old_file_upload'] = _oldFileUpload;

          result = await AbsentService().updateData(
              widget.id.toString(), data, TYPE_ABSENT_LEAVE,
              fileUpload: selectedFile);
        } else {
          result = await AbsentService()
              .addData(data, TYPE_ABSENT_LEAVE, fileUpload: selectedFile);
        }

        if (widget.id == null) {
          Future.delayed(DELAY_TIMEOUT, () async {
            await Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (context) =>
                        const AbsentScreen(selectedTabIndex: 1)));
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

  void handlePickedFile(value) {
    setState(() => _fileUpload = value);
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
              DropdownApprover(
                items: _data!.approverList,
                defaultValue:
                    widget.id != null ? _data!.approverPosition : null,
                onSelected: (value) {
                  setState(() {
                    _selectedApprover = value;
                  });
                },
              ),
              const SizedBox(height: 40),
              TextFormField(
                controller: _ctrlReason,
                autofocus: false,
                textInputAction: TextInputAction.done,
                keyboardType: TextInputType.multiline,
                maxLines: null,
                decoration: const InputDecoration(
                  labelText: LABEL_ABSENT_LEAVE_REASON,
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return TEXT_INPUT_REQUIRED;
                  }
                  return null;
                },
              ),
              const SizedBox(height: 40),
              Row(
                children: [
                  Flexible(
                    child: ButtonDatepicker(
                      labelText: LABEL_ABSENT_START,
                      value: _data?.startDate,
                      maximumDate: DateTime.now().add(const Duration(hours: 2)),
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
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        DropdownHalfDay(
                          labelText: LABEL_ABSENT_HALFDAY,
                          value: widget.id != null ? _data!.partFlag : null,
                          onSelected: (value) {
                            setState(() {
                              _selectedHalfDayType = value;
                            });
                            displayDiffDays(
                                _selectedStartDate, _selectedEndDate);
                          },
                        )
                      ],
                    ),
                  ),
                  const SizedBox(width: 40),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        TextField(
                          controller: _ctrlAbsentDays,
                          readOnly: true,
                          decoration: const InputDecoration(
                            labelText: LABEL_ABSENT_TOTAL_DAY,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 50),
              Row(
                children: [
                  Switch(
                      value: _enableUpload,
                      activeColor: Colors.green,
                      onChanged: (bool value) {
                        setState(() {
                          _enableUpload = value;
                        });
                      }),
                  const SizedBox(width: 5),
                  const Text(LABEL_ABSENT_MEDICAL_CERT,
                      style: TextStyle(fontSize: 16)),
                ],
              ),
              const SizedBox(height: 10),
              _enableUpload
                  ? BoxUploadImage(
                      onPickedFile: handlePickedFile,
                      imageSource: _fileUpload,
                    )
                  : Container(),
              const SizedBox(height: 40),
              TextFormField(
                controller: _ctrlContact,
                decoration: const InputDecoration(
                  labelText: LABEL_ABSENT_CONTACT,
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return TEXT_INPUT_REQUIRED;
                  }
                  return null;
                },
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
  void dispose() {
    _ctrlAbsentDays.dispose();
    _ctrlContact.dispose();
    _ctrlReason.dispose();

    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TemplateAbsent(
      appTitle: PAGE_ABSENT_LEAVE,
      progressing: _progressing,
      showNavbar: _processType == PROCESS_SUCCESS ? true : false,
      onSubmit: handleSubmit,
      child: !_ready
          ? const Center(
              child: CircularProgressIndicator(),
            )
          : displayWidget(),
    );
  }
}
