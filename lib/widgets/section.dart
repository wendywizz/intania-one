import 'package:flutter/material.dart';

class Section extends StatelessWidget {
  final Widget child;
  final String title;

  const Section({
    super.key,
    required this.child,
    required this.title,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 15, horizontal: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Color(0xff333333),
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Container(
                width: 12,
                height: 12,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: Color(0xff3498db),
                ),
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Container(
                  width: double.infinity,
                  height: 6,
                  color: Colors.red,
                ),
              )
            ],
          ),
          const SizedBox(height: 15),
          Container(child: child)
        ],
      ),
    );
  }
}
