import 'package:flutter/material.dart';

class TextDescription extends StatelessWidget {
  final String text;

  const TextDescription({
    super.key,
    required this.text,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const SizedBox(height: 7),
        Text(text, style: const TextStyle(color: Colors.grey, fontSize: 12)),
      ],
    );
  }
}
