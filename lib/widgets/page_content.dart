import 'package:flutter/material.dart';

class PageContent extends StatelessWidget {
  final Widget child;

  const PageContent({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 15.0, vertical: 12.0),
        child: child,
      ),
    );
  }
}
