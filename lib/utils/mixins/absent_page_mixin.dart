import 'package:flutter/material.dart';

mixin AbsentPageMixin<T extends StatefulWidget> on State<T> {
  String? calculateDiffDays(DateTime? startDate, DateTime? endDate) {
    if (startDate != null && endDate != null) {
      double dayCount = ((endDate.difference(startDate).inDays) + 1);

      return dayCount.toString();
    }
    return null;
  }
}
