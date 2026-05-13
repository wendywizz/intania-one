import 'package:flutter/material.dart';

class ButtonCalendarSeperator extends StatelessWidget {
  const ButtonCalendarSeperator({super.key});

  @override
  Widget build(BuildContext context) {
    return const SizedBox(
      width: 1,
      height: double.infinity,
      child: DecoratedBox(
        decoration: BoxDecoration(color: Color(0xffdfe4ea)),
      ),
    );
  }
}
