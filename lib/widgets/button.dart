import 'package:flutter/material.dart';

class Button extends StatelessWidget {
  final Color foregroundColor;
  final Color backgroundColor;
  final Color disabledForegroundColor;
  final Color disabledBackgroundColor;
  final Widget child;
  final double? height;
  final double? width;
  final bool progressing;
  final VoidCallback? onPressed;

  const Button({
    super.key,
    this.foregroundColor = Colors.white,
    this.backgroundColor = Colors.black,
    this.disabledForegroundColor = Colors.white,
    this.disabledBackgroundColor = Colors.grey,
    required this.child,
    this.height = 40,
    this.width = 160,
    this.progressing = false,
    this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
        width: width,
        height: height,
        child: ElevatedButton(
          onPressed: !progressing ? onPressed : null,
          style: ElevatedButton.styleFrom(
            shape: const RoundedRectangleBorder(
                borderRadius: BorderRadius.all(Radius.zero)),
            backgroundColor: backgroundColor,
            foregroundColor: foregroundColor,
            disabledBackgroundColor: disabledBackgroundColor,
            disabledForegroundColor: disabledForegroundColor,
          ),
          child: child,
        ));
  }
}
