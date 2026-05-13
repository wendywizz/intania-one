import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/models/meeting.dart';
import 'package:intania_staff_buddy/models/result.dart';
import 'package:intania_staff_buddy/services/auth_service.dart';
import 'package:intania_staff_buddy/services/meeting_service.dart';
import 'package:intania_staff_buddy/widgets/container_center.dart';
import 'package:intania_staff_buddy/widgets/leading_datetime.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

class MeetingContentScreen extends StatefulWidget {
  final String displayType;

  const MeetingContentScreen({
    super.key,
    required this.displayType,
  });

  @override
  State<MeetingContentScreen> createState() => _MeetingContentScreenState();
}

class _MeetingContentScreenState extends State<MeetingContentScreen> {
  bool _ready = false;
  String _staffId = '';

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();

    Provider.of<AuthService>(context, listen: false).currentUser.then(
      (user) async {
        if (user != null) {
          final String staffId = user.staffId;
          setState(() {
            _staffId = staffId;
            _ready = true;
          });
        }
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_ready) {
      return FutureBuilder(
          future: MeetingService().listMeeting(userId: _staffId, type: 'p'),
          builder: (BuildContext context, AsyncSnapshot<Result> snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            } else {
              if (snapshot.hasError || !snapshot.hasData) {
                return const ContainerCenter(
                    title: TITLE_ERROR, desc: MESSAGE_SERVER_ERROR);
              }
              Result result = snapshot.data!;

              switch (result.processType) {
                case PROCESS_SUCCESS:
                  if (result.totalCount <= 0) {
                    return const Center(child: Text(MESSAGE_NO_DATA));
                  } else {
                    final List<Meeting> data = result.data as List<Meeting>;

                    return ListView.separated(
                      itemCount: result.totalCount,
                      itemBuilder: (BuildContext context, int index) {
                        const format = 'hh:mm';
                        final parsedDate =
                            DateTime.parse(data[index].startDate.toString());
                        final dateFormated =
                            DateFormat(format).format(parsedDate);

                        return ListTile(
                          leading: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              LeadingDatetime(
                                dateValue: parsedDate,
                              ),
                            ],
                          ),
                          title: Container(
                            padding: const EdgeInsets.only(bottom: 7),
                            child: Text(data[index].name, maxLines: 2),
                          ),
                          subtitle: Row(
                            children: [
                              const Icon(Icons.lock_clock, size: 14),
                              const SizedBox(width: 3),
                              Text(dateFormated.toString()),
                            ],
                          ),
                        );
                      },
                      separatorBuilder: (context, index) => const Divider(),
                    );
                  }
                default:
                  return ContainerCenter(title: result.message);
              }
            }
          });
    } else {
      return Container();
    }
  }
}
