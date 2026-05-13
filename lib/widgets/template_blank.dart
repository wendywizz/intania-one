import 'dart:math';

import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/color.dart';

class TemplateBlank extends StatelessWidget {
  final String appBarTitle;
  final Widget child;
  final BottomNavigationBar? bottomNavigationBar;
  final Widget? bottomSheet;
  final FloatingActionButton? floatingActionButton;
  final List<Widget>? topBarActionButton;
  final Widget? leading;
  final bool automaticallyImplyLeading;

  const TemplateBlank({
    super.key,
    this.appBarTitle = '',
    required this.child,
    this.bottomNavigationBar,
    this.bottomSheet,
    this.floatingActionButton,
    this.topBarActionButton,
    this.leading,
    this.automaticallyImplyLeading = true,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: leading,
        automaticallyImplyLeading: automaticallyImplyLeading,
        backgroundColor: primaryColor,
        foregroundColor: appBarFontColor,
        elevation: 0,
        title: Text(
          appBarTitle,
          style: const TextStyle(
            fontSize: 16,
          ),
        ),
        actions: topBarActionButton,
      ),
      body: LayoutBuilder(
          builder: (BuildContext context, BoxConstraints constraints) {
        return ConstrainedBox(
          constraints:
              BoxConstraints.tightFor(height: max(500, constraints.maxHeight)),
          child: child,
        );
      }),
      floatingActionButton: floatingActionButton,
      bottomNavigationBar: bottomNavigationBar,
      bottomSheet: bottomSheet,
    );
  }
}
