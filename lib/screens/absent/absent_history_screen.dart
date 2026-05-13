import 'package:flutter/material.dart';
import 'package:infinite_scroll_pagination/infinite_scroll_pagination.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/models/absent.dart';
import 'package:intania_staff_buddy/models/result.dart';
import 'package:intania_staff_buddy/services/absent_service.dart';
import 'package:intania_staff_buddy/services/auth_service.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:intania_staff_buddy/utils/display_datetime.dart';

class AbsentHistoryScreen extends StatefulWidget {
  const AbsentHistoryScreen({super.key});

  @override
  State<AbsentHistoryScreen> createState() => _AbsentHistoryScreenState();
}

class _AbsentHistoryScreenState extends State<AbsentHistoryScreen> {
  static const _pageSize = DEFAULT_DISPLAY_LENGTH;
  bool _ready = false;
  String _staffId = '';
  late PagingController<int, Absent> _pagingController;

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
      final service = AbsentService();
      Result result = await service.historyData(
        _staffId,
        start: pageKey,
        length: _pageSize,
      );
      List<Absent> data = result.data as List<Absent>;
      final isLastPage = data.isEmpty || data.length < _pageSize;

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
      return PagedListView<int, Absent>.separated(
        pagingController: _pagingController,
        separatorBuilder: (context, index) {
          return const Divider();
        },
        builderDelegate: PagedChildBuilderDelegate<Absent>(
          itemBuilder: (context, Absent item, index) {
            final DateTime? startDate = item.startDate;
            final DateTime? endDate = item.endDate;
            final DateTime writeDate = item.writeDate;

            final parsedWriteDate = DateFormat('dd MMMM y').format(writeDate);
            return ListTile(
              leading: SizedBox(
                  width: 54,
                  child: Text(
                    item.absentTypeName.toString(),
                    style: const TextStyle(fontSize: 14),
                    textAlign: TextAlign.center,
                  )),
              title: Container(
                padding: const EdgeInsets.only(bottom: 7),
                child: Row(
                  children: [
                    const Text('ลาวันที่'),
                    const SizedBox(width: 5),
                    Text(DisplayDateTime.beautyfulBetweenDate(
                        startDate!, endDate!)),
                  ],
                ),
              ),
              subtitle: Row(
                children: [
                  const Text('$TEXT_ABSENT_SINCE_DATE: '),
                  Text(parsedWriteDate.toString())
                ],
              ),
            );
          },
        ),
      );
    } else {
      return Container();
    }
  }

  /*@override
  Widget build(BuildContext context) {
    if (_ready) {
      final service = AbsentService();
      return FutureBuilder(
        future: service.historyData(_staffId,
            start: _pageIndex * DEFAULT_DISPLAY_LENGTH,
            length: DEFAULT_DISPLAY_LENGTH),
        builder: (BuildContext context, AsyncSnapshot<List<Absent>> snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          } else {
            if (snapshot.hasData && snapshot.data!.isNotEmpty) {
              return (ListView.separated(
                controller: _scrollController,
                itemCount: snapshot.data!.length,
                itemBuilder: (BuildContext context, int index) {
                  final DateTime? startDate = snapshot.data![index].startDate;
                  final DateTime? endDate = snapshot.data![index].endDate;
                  final DateTime writeDate = snapshot.data![index].writeDate;

                  final parsedWriteDate =
                      DateFormat('dd MMMM y').format(writeDate);

                  return ListTile(
                    leading: SizedBox(
                        width: 54,
                        child: Text(
                          snapshot.data![index].absentTypeName.toString(),
                          style: const TextStyle(fontSize: 14),
                          textAlign: TextAlign.center,
                        )),
                    title: Container(
                      padding: const EdgeInsets.only(bottom: 7),
                      child: Row(
                        children: [
                          const Text('ลาวันที่'),
                          const SizedBox(width: 5),
                          Text(DisplayDateTime.beautyfulBetweenDate(
                              startDate!, endDate!)),
                        ],
                      ),
                    ),
                    subtitle: Row(
                      children: [
                        const Text('ลาเมืื่อ: '),
                        Text(parsedWriteDate.toString())
                      ],
                    ),
                  );
                },
                separatorBuilder: (context, index) => const Divider(),
              ));
            } else {
              return const Center(child: Text(NO_DATA));
            }
          }
        },
      );
    } else {
      return Container();
    }
  }*/
}
