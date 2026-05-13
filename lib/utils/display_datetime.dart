import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class DisplayDateTime {
  static String formatDate(DateTime value) {
    return DateFormat('dd MMMM yyyy').format(value);
  }

  static String formatDateTime(DateTime value) {
    return DateFormat('dd MMMM yyyy - H:m').format(value);
  }

  static String beautyfulBetweenDate(DateTime startDate, DateTime endDate) {
    var displayType = '';

    if (DateFormat('yyyy').format(startDate) ==
        DateFormat('yyyy').format(endDate)) {
      displayType += 'sy';
    }

    if (DateUtils.isSameMonth(startDate, endDate)) {
      displayType += 'sm';
    }

    if (startDate == endDate) {
      displayType += 'sd';
    }

    switch (displayType) {
      case 'sy':
        String sDate = DateFormat('dd MMMM').format(startDate);
        String eDate = DateFormat('dd MMMM yyyy').format(endDate);
        return '$sDate - $eDate';
      case 'sysmsd':
        return DateFormat('dd MMMM yyyy').format(startDate);
      case 'sysm':
        String sDate = DateFormat('dd').format(startDate);
        String eDate = DateFormat('dd MMMM yyyy').format(endDate);

        return '$sDate-$eDate';
      case 'sd':
        return DateFormat('dd MMM yyy').format(startDate);
      default:
        String sDate = DateFormat('dd MMMM yyyy').format(startDate);
        String eDate = DateFormat('dd MMMM yyyy').format(endDate);
        return '$sDate - $eDate';
    }
  }

  static String strFormatTime(String value) {
    if (value.length > 6) {
      return value.substring(0, 6);
    } else {
      return value;
    }
  }
}
