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

class AbsentRelaxScreen extends StatefulWidget {
  final String? id;

  const AbsentRelaxScreen({
    super.key,
    this.id,
  });

  @override
  State<AbsentRelaxScreen> createState() => _AbsentRelaxScreenState();
}

class _AbsentRelaxScreenState extends State<AbsentRelaxScreen>
    with AbsentPageMixin, AlertMixin {
  final _formKey = GlobalKey<FormState>();
  bool _ready = false;
  bool _progressing = false;
  Absent? _data;
  String _processType = '';
  String _message = '';

  String? _selectedApprover;
  List<String> _selectedAgents = [];
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
                .initAbsentData(staffId, TYPE_ABSENT_RELAX);
          } else {
            result = await AbsentService()
                .getData(widget.id.toString(), TYPE_ABSENT_RELAX);
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
    _ctrlContact.text = _data!.contact != null ? _data!.contact.toString() : '';
    _ctrlTravelDetail.text =
        _data!.travelDetail != null ? _data!.travelDetail.toString() : '';
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
          'absence': TYPE_ABSENT_RELAX,
          'start_date': _selectedStartDate.toString(),
          'end_date': _selectedEndDate.toString(),
          'startpart': _selectedHalfDayType,
          'num_days': _ctrlAbsentDays.text,
          'contact': _ctrlContact.text,
          'reason': _ctrlReason.text,
          'travel_detail': _ctrlTravelDetail.text,
          'agents': _selectedAgents,
          'main_approver': avStaffId,
        };

        Timer(CONNECTION_TIMEOUT, () async {
          Result result;

          if (widget.id != null) {
            result = await AbsentService()
                .updateData(widget.id.toString(), data, TYPE_ABSENT_RELAX);
          } else {
            result = await AbsentService().addData(data, TYPE_ABSENT_RELAX);
          }

          if (widget.id == null) {
            Future.delayed(const Duration(milliseconds: 1000), () async {
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

  Widget displayRelaxDetail() {
    const double fontSize = 16;
    final relaxRemain = _data!.relaxRemain;
    final relaxTotal = _data!.relaxTotal;

    var relaxRemainColor = Colors.red;
    var relaxTotalColor = Colors.red;

    if (relaxRemain != null && relaxRemain > 0) {
      relaxRemainColor = Colors.green;
    }
    if (relaxTotal != null && relaxTotal > 0) {
      relaxTotalColor = Colors.blue;
    }

    return Row(
      children: [
        const Text(TEXT_ABSENT_RELAX_ALL, style: TextStyle(fontSize: fontSize)),
        const SizedBox(width: 5),
        Text(
          relaxTotal.toString(),
          style: TextStyle(
            color: relaxTotalColor,
            fontSize: fontSize,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(width: 5),
        const Text(TEXT_ABSENT_RELAX_REMAIN,
            style: TextStyle(fontSize: fontSize)),
        const SizedBox(width: 5),
        Text(
          relaxRemain.toString(),
          style: TextStyle(
            color: relaxRemainColor,
            fontSize: fontSize,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(width: 5),
        const Text(TEXT_DAY_UNIT, style: TextStyle(fontSize: fontSize)),
      ],
    );
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
                onSelected: (value) {
                  setState(() {
                    _selectedApprover = value;
                  });
                },
              ),
              const SizedBox(height: 40),
              displayRelaxDetail(),
              const SizedBox(height: 30),
              Row(
                children: [
                  Flexible(
                    child: ButtonDatepicker(
                      labelText: LABEL_ABSENT_START,
                      minimumDate: DateTime.now(),
                      maximumDate: _selectedEndDate,
                      onTapCallback: (value) {
                        setState(() {
                          _selectedStartDate = value;
                        });
                        displayDiffDays(_selectedStartDate, _selectedEndDate);
                      },
                    ),
                  ),
                  const SizedBox(width: 40),
                  Flexible(
                    child: ButtonDatepicker(
                      labelText: LABEL_ABSENT_END,
                      minimumDate: _selectedStartDate,
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
      appTitle: PAGE_ABSENT_RELAX,
      progressing: _progressing,
      showNavbar: _processType == PROCESS_SUCCESS ? true : false,
      onSubmit: handleSubmit,
      child: !_ready
          ? const Center(child: CircularProgressIndicator())
          : displayWidget(),
    );
  }
}
