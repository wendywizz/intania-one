import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:intania_staff_buddy/configs/endpoint.dart';
import 'package:intania_staff_buddy/models/news.dart';
import 'package:xml2json/xml2json.dart';

class NewsService {
  Future<List<News>> staffNewsFeed() async {
    try {
      final uri = Uri.parse(STAFF_NEWS_FEED);
      final Xml2Json xml2json = Xml2Json();
      final response =
          await http.get(uri, headers: {'content-type': 'application/xml'});
      xml2json.parse(response.body.toString());

      final List jsonData =
          json.decode(xml2json.toParker())['rss']['channel']['item'];

      return jsonData.map((json) => News.fromJson(json)).toList();
    } on Exception catch (e) {
      print(e.toString());
    }

    return [];
  }
}
