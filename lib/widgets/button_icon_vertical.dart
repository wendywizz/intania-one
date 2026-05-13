import 'package:flutter/material.dart';

class ButtonIconVertical extends StatelessWidget {
  final Widget icon;
  final String label;
  final Function onPressed;

  const ButtonIconVertical({
    super.key,
    required this.icon,
    required this.label,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: () => onPressed(),
      child: Column(
        children: [
          icon,
          const SizedBox(height: 8),
          Text(
            label,
            style: const TextStyle(color: Color(0xff444444)),
          ),
        ],
      ),
    );
  }
}
