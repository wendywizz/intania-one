import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/models/news.dart';
import 'package:intania_staff_buddy/widgets/template_blank.dart';
import 'package:html/parser.dart';

class NewsDetailScreen extends StatelessWidget {
  const NewsDetailScreen({super.key});

  String _parseHtmlString(String htmlString) {
    final document = parse(htmlString);
    final String parsedString =
        parse(document.body?.text).documentElement!.text;

    return parsedString;
  }

  @override
  Widget build(BuildContext context) {
    final args = ModalRoute.of(context)?.settings.arguments as Map;

    if (args.isNotEmpty) {
      final News item = args['item'];

      return TemplateBlank(
        child: SingleChildScrollView(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 15),
            child: Column(
              children: [
                Text(
                  item.title,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 20,
                  ),
                ),
                const SizedBox(height: 20),
                Text(_parseHtmlString(item.description),
                    style: const TextStyle(
                      fontSize: 16,
                    )),
              ],
            ),
          ),
        ),
      );
    } else {
      return const Center(
        child: Text('No argument passed'),
      );
    }
  }
}
