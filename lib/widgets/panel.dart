import 'package:flutter/material.dart';

class Panel extends StatelessWidget {
  final Widget child;

  const Panel({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      alignment: Alignment.center,
      decoration: const BoxDecoration(
        color: Colors.white70,
        border: Border(
          top: BorderSide(
            width: 1,
          ),
        ),
      ),
      height: 100,
      width: double.maxFinite,
      child: Padding(
        padding: const EdgeInsets.all(8.0),
        child: child,
      ),
    );
  }
}
