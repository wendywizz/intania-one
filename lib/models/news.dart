import 'dart:core';
import 'package:intl/intl.dart';
import 'package:json_annotation/json_annotation.dart';

part 'news.g.dart';

@JsonSerializable()
class News {
  final String title;
  final String link;
  final String guid;
  final String description;
  final String category;
  final DateTime pubDate;

  const News({
    required this.title,
    required this.link,
    required this.guid,
    required this.description,
    required this.category,
    required this.pubDate,
  });

  factory News.fromJson(Map<String, dynamic> json) => _$NewsFromJson(json);

  Map<String, dynamic> toJson() => _$NewsToJson(this);
}
