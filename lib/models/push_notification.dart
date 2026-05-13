import 'package:json_annotation/json_annotation.dart';

part 'push_notification.g.dart';

@JsonSerializable()
class PushNotification {
  final String? title;
  final String? body;

  PushNotification({
    required this.title,
    required this.body,
  });

  factory PushNotification.fromJson(Map<String, dynamic> json) =>
      _$PushNotificationFromJson(json);

  Map<String, dynamic> toJson() => _$PushNotificationToJson(this);
}
