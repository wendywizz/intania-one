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
import 'package:intania_staff_buddy/widgets/dropdown_approver.dart';
import 'package:intania_staff_buddy/widgets/dropdown_half_day.dart';
import 'package:intania_staff_buddy/widgets/input_agent.dart';
import 'package:intania_staff_buddy/widgets/template_absent.dart';
import 'package:provider/provider.dart';

class AbsentBusinessScreen extends StatefulWidget {
  final String? id;

  const AbsentBusinessScreen({
    super.key,
    this.id,
  });

  @override
  State<AbsentBusinessScreen> createState() => _AbsentBusinessScreenState();
}

class _AbsentBusinessScreenState extends State<AbsentBusinessScreen>
    with AbsentPageMixin, AlertMixin {
  final _formKey = GlobalKey<FormState>();
  bool _ready = false;
  bool _progressing = false;
  Absent? _data;
  String _processType = '';
  String _message = '';

  String? _selectedApprover;
  List<String> _selectedAgents = [];
  List<String> _exceptAgents = [];
  DateTime? _selectedStartDate, _selectedEndDate;
  String? _selectedHalfDayType = HALF_DAY_NULL['value'];

  final TextEditingController _ctrlReason = TextEditingController();
  final TextEditingController _ctrlAbsentDays = TextEditingController();
  final TextEditingController _ctrlContact = TextEditingController();
  final TextEditingController _ctrlTravelDetail = TextEditingController();

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
                .initAbsentData(staffId, TYPE_ABSENT_BUSINESS);
          } else {
            result = await AbsentService()
                .getData(widget.id.toString(), TYPE_ABSENT_BUSINESS);
          }

          processType = result.processType;
          message = result.message;
          data = result.data;

          // Initial except agents values
          var eaValues = _exceptAgents;
          eaValues.add(staffId);

          setState(() {
            _ready = true;
            _processType = processType;
            _message = message.toString();
            _data = data;
            _exceptAgents = eaValues;
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
      _ctrlTravelDetail.text =
          _data!.travelDetail != null ? _data!.travelDetail.toString() : '';

      setState(() {
        _selectedStartDate = _data!.startDate;
        _selectedEndDate = _data!.endDate;
        _selectedApprover = _data!.approverPosition;
        _selectedHalfDayType = _data!.partFlag;
        _selectedAgents = List<String>.from(_data!.selectedAgents as List);
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
        'absence_type': TYPE_ABSENT_BUSINESS,
        'start_date': _selectedStartDate.toString(),
        'end_date': _selectedEndDate.toString(),
        'startpart': _selectedHalfDayType,
        'num_days': _ctrlAbsentDays.text,
        'contact': _ctrlContact.text,
        'reason': _ctrlReason.text,
        'travel_detail': _ctrlTravelDetail.text,
        'agents': _selectedAgents,
      };

      Timer(CONNECTION_TIMEOUT, () async {
        Result result;

        if (widget.id != null) {
          data['id'] = _data!.id;

          result = await AbsentService()
              .updateData(widget.id!, data, TYPE_ABSENT_BUSINESS);
        } else {
          result = await AbsentService().addData(data, TYPE_ABSENT_BUSINESS);
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
                decoration: const InputDecoration(
                  labelText: LABEL_ABSENT_BUSINESS_REASON,
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
                      minimumDate: DateTime.now(),
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
              const SizedBox(height: 40),
              TextFormField(
                controller: _ctrlTravelDetail,
                maxLines: 2,
                autofocus: false,
                textInputAction: TextInputAction.done,
                decoration: const InputDecoration(
                  labelText: LABEL_ABSENT_TRAVEL_DETAIL,
                ),
              ),
              const SizedBox(height: 40),
              InputAgent(
                data: _data!.agentList,
                values: widget.id != null ? _data!.selectedAgents : null,
                exceptValues: _exceptAgents,
                onSelected: (values) {
                  setState(() {
                    _selectedAgents = values;
                  });
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
    _ctrlTravelDetail.dispose();

    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TemplateAbsent(
      appTitle: PAGE_ABSENT_BUSINESS,
      progressing: _progressing,
      showNavbar: _processType == PROCESS_SUCCESS ? true : false,
      onSubmit: handleSubmit,
      child: !_ready
          ? const Center(child: CircularProgressIndicator())
          : displayWidget(),
    );
  }
}
