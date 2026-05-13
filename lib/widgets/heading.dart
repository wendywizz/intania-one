import 'package:flutter/material.dart';

class Heading extends StatelessWidget {
  final String text;
  final String? size;
  final Color color;

  const Heading({
    super.key,
    required this.text,
    this.size,
    this.color = Colors.black,
  });

  @override
  Widget build(BuildContext context) {
    double sizeValue;
    switch (size) {
      case 'h1':
        sizeValue = 48;
        break;
      case 'h2':
        sizeValue = 42;
        break;
      case 'h3':
        sizeValue = 36;
        break;
      case 'h4':
        sizeValue = 24;
        break;
      case 'h5':
      default:
        sizeValue = 18;
        break;
    }
    return Text(
      text,
      style: TextStyle(fontSize: sizeValue, color: color),
    );
  }
}
