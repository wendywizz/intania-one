import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/constants/variable.dart';
import 'package:intania_staff_buddy/models/news.dart';
import 'package:intania_staff_buddy/widgets/card_news.dart';
import 'package:intania_staff_buddy/widgets/list_item_event.dart';
import 'package:provider/provider.dart';
import 'package:intania_staff_buddy/constants/route.dart';
import 'package:intania_staff_buddy/services/auth_service.dart';
import 'package:intania_staff_buddy/services/news_service.dart';
import 'package:intania_staff_buddy/widgets/button_icon_vertical.dart';
import 'package:intania_staff_buddy/widgets/section.dart';
import 'package:flutter_card_swiper/flutter_card_swiper.dart';

final List<String> imgList = [
  "assets/img/slide_1.png",
];

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void dispose() {
    super.dispose();
  }

  Widget sectionNewsFeed(BuildContext context) {
    final service = NewsService();
    return FutureBuilder(
      future: service.staffNewsFeed(),
      builder: (BuildContext context, AsyncSnapshot snapshot) {
        if (snapshot.hasData) {
          return Section(
            title: TITLE_NEWS,
            child: ListView.builder(
              itemCount: NEWS_DISPLAY_LENGTH,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemBuilder: (BuildContext context, int index) {
                final News item = snapshot.data?[index];
                DateTime pubDate = item.pubDate;

                return ListEventItem(
                  date: pubDate,
                  title: item.title,
                  onTap: () => {
                    Navigator.pushNamed(context, newsDetailRoute,
                        arguments: {'item': item})
                  },
                );
              },
            ),
          );
        } else {
          return const Center(
            child: CircularProgressIndicator(),
          );
        }
      },
    );
  }

  Widget sectionNews(BuildContext context) {
    final service = NewsService();
    return FutureBuilder(
      future: service.staffNewsFeed(),
      builder: (BuildContext context, AsyncSnapshot snapshot) {
        if (snapshot.hasData && (snapshot.data.length > 0)) {
          return CardSwiper(
              cardsCount: snapshot.data.length,
              numberOfCardsDisplayed: 1,
              cardBuilder:
                  (context, index, percentThresholdX, percentThresholdY) {
                News data = snapshot.data[index];
                return CardNews(
                  title: data.title,
                  pubDate: data.pubDate,
                );
              });
        } else {
          return const Center(
            child: CircularProgressIndicator(),
          );
        }
      },
    );
  }

  Widget sectionApp() {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 25),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 25, horizontal: 5),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                Expanded(
                  flex: 1,
                  child: ButtonIconVertical(
                    icon: Image.asset(
                      iconAbsent,
                      height: homeIconHeight,
                    ),
                    label: textIconAbsent,
                    onPressed: () => Navigator.pushNamed(context, absentRoute),
                  ),
                ),
                Expanded(
                  flex: 1,
                  child: ButtonIconVertical(
                    icon: Image.asset(
                      iconMissTimestamp,
                      height: homeIconHeight,
                    ),
                    label: textIconMissTimestamp,
                    onPressed: () =>
                        Navigator.pushNamed(context, forgetTimestampRoute),
                  ),
                ),
                Expanded(
                  flex: 1,
                  child: ButtonIconVertical(
                    icon: Image.asset(
                      iconRepairComputer,
                      height: homeIconHeight,
                    ),
                    label: textIconRepairComputer,
                    onPressed: () => Navigator.pushNamed(context, rcRoute),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  flex: 1,
                  child: ButtonIconVertical(
                    icon: Image.asset(
                      iconCalendarExecutive,
                      height: homeIconHeight,
                    ),
                    label: textIconCalendarExecutive,
                    onPressed: () =>
                        Navigator.pushNamed(context, calendarExecutiveRoute),
                  ),
                ),
                Expanded(
                  flex: 1,
                  child: ButtonIconVertical(
                    icon: Image.asset(
                      iconMeeting,
                      height: homeIconHeight,
                    ),
                    label: textIconMeeting,
                    onPressed: () => Navigator.pushNamed(context, meetingRoute),
                  ),
                ),
                Expanded(
                  flex: 1,
                  child: ButtonIconVertical(
                    icon: Image.asset(
                      iconPersonSearch,
                      height: homeIconHeight,
                    ),
                    label: textIconPersonSearch,
                    onPressed: () =>
                        Navigator.pushNamed(context, personSearchRoute),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    var loggedIn = context.watch<AuthService>().isLoggedIn;
    double newsWidgetHeight = MediaQuery.sizeOf(context).height * 0.35;

    return FutureBuilder<bool>(
        future: loggedIn,
        builder: (context, snapshot) {
          Widget sectionAppWidget = const SizedBox(height: 0);
          if (snapshot.hasData && snapshot.data == true) {
            sectionAppWidget = Column(children: [
              sectionApp(),
              const SizedBox(
                height: 20,
              )
            ]);
          }
          return SingleChildScrollView(
            child: Column(
              children: [
                Container(
                  constraints: BoxConstraints(
                    maxHeight: newsWidgetHeight,
                    minWidth: double.infinity,
                  ),
                  child: sectionNews(context),
                ),
                sectionAppWidget,
              ],
            ),
          );
        });
  }
}
