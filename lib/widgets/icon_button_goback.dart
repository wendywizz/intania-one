import 'dart:io';

import 'package:flutter/material.dart';

class IconButtonGoBack extends StatelessWidget {
  final VoidCallback onPressed;

  const IconButtonGoBack({super.key, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    IconData icon;
    if (Platform.isIOS) {
      icon = Icons.arrow_back_ios;
    } else {
      icon = Icons.chevron_left;
    }
    return IconButton(
      onPressed: onPressed,
      icon: Icon(icon),
    );
  }
}
