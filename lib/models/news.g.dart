// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'news.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

News _$NewsFromJson(Map<String, dynamic> json) {
  //String parseFormat = 'dd MMM yyyy HH:mm:ss zzz';
  //final parsedDate = DateFormat(parseFormat).parse(json['pubDate']);

  /*String strDate = json['pubDate'];
  String format = 'EEE, d MMM yyyy HH:mm:ss zzz';

  final parsedDate = DateFormat(format).format(DateTime.parse(strDate));
  final dd = DateTime.parse(parsedDate);*/

  //DateTime date = DateTime.parse(strDate);
  //final parsedDate = DateFormat(format).format(date);

  String strDate = json['pubDate'];
  String parseFormat = "E, dd MMM yyyy h:mm:ss z";
  final pubDate = DateFormat(parseFormat).parse(strDate);

  return News(
    title: json['title'] as String,
    link: json['link'] as String,
    guid: json['guid'] as String,
    description: json['description'] as String,
    category: json['category'] as String,
    pubDate: pubDate,
  );
}

Map<String, dynamic> _$NewsToJson(News instance) => <String, dynamic>{
      'title': instance.title,
      'link': instance.link,
      'guid': instance.guid,
      'description': instance.description,
      'category': instance.category,
      'pubDate': instance.pubDate.toIso8601String(),
    };
