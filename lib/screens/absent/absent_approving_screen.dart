import 'package:flutter/material.dart';
import 'package:infinite_scroll_pagination/infinite_scroll_pagination.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/models/absent_approve.dart';
import 'package:intania_staff_buddy/models/result.dart';
import 'package:intania_staff_buddy/screens/absent/absent_approving_view_screen.dart';
import 'package:intania_staff_buddy/services/absent_approve_service.dart';
import 'package:intania_staff_buddy/services/auth_service.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

class AbsentApprovingScreen extends StatefulWidget {
  const AbsentApprovingScreen({super.key});

  @override
  State<AbsentApprovingScreen> createState() => _AbsentApprovingScreenState();
}

class _AbsentApprovingScreenState extends State<AbsentApprovingScreen> {
  static const _pageSize = DEFAULT_DISPLAY_LENGTH;
  bool _ready = false;
  String _staffId = '';
  late PagingController<int, AbsentApprove> _pagingController;

  @override
  void initState() {
    super.initState();
    _pagingController = PagingController(firstPageKey: 0);
    _pagingController.addPageRequestListener(_fetchPage);
  }

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

  Future<void> _fetchPage(int pageKey) async {
    try {
      final AbsentApproveService service = AbsentApproveService();
      Result result = await service.approveData(
        _staffId,
        start: pageKey,
        length: _pageSize,
      );
      List<AbsentApprove> data = result.data as List<AbsentApprove>;

      final bool isLastPage = data.length < _pageSize;
      if (isLastPage) {
        _pagingController.appendLastPage(data);
      } else {
        final nextPageKey = pageKey + 1;
        _pagingController.appendPage(data, nextPageKey);
      }
    } catch (error) {
      _pagingController.error = error;
    }
  }

  @override
  void dispose() {
    _pagingController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_ready) {
      return PagedListView<int, AbsentApprove>.separated(
        pagingController: _pagingController,
        separatorBuilder: (context, index) {
          return const Divider();
        },
        builderDelegate: PagedChildBuilderDelegate<AbsentApprove>(
          noItemsFoundIndicatorBuilder: (context) => const Center(
            child: Text(MESSAGE_ABSENT_NO_APPROVE_DATA),
          ),
          itemBuilder: (BuildContext context, AbsentApprove item, int index) {
            final DateTime? writeDate = item.writeDate;

            String parsedWriteDate = '-';
            if (writeDate != null) {
              parsedWriteDate = DateFormat('dd MMMM y').format(writeDate);
            }

            return ListTile(
                leading: SizedBox(
                  width: 54,
                  child: Text(
                    item.approveName.toString(),
                    style: const TextStyle(fontSize: 14),
                    textAlign: TextAlign.center,
                  ),
                ),
                title: Container(
                  padding: const EdgeInsets.only(bottom: 7),
                  child: Text(item.name!),
                ),
                subtitle: Row(
                  children: [
                    const Text(LABEL_ABSENT_DATE_ACTION),
                    Text(parsedWriteDate.toString()),
                    Text(' ${item.forgetId}'),
                  ],
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) {
                      if (item.type == TYPE_ABSENT_APPROVE_ABSENT) {
                        return AbsentApprovingViewScreen(
                          id: item.absenceId.toString(),
                          approveId: item.approveId,
                          type: item.type.toString(),
                          progress: item.progress.toString(),
                        );
                      }
                      if (item.type == TYPE_ABSENT_APPROVE_MISS_TIMESTAMP) {
                        return AbsentApprovingViewScreen(
                          id: item.forgetId.toString(),
                          approveId: item.approveId,
                          inTime: item.inTime,
                          outTime: item.outTime,
                        );
                      }
                      return Container();
                    }),
                  );
                });
          },
        ),
      );
    } else {
      return Container();
    }
  }
}
