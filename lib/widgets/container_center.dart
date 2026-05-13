import 'package:flutter/material.dart';

class ContainerCenter extends StatelessWidget {
  final String title;
  final String? desc;

  const ContainerCenter({
    super.key,
    required this.title,
    this.desc = '',
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          desc != null
              ? Column(
                  children: [
                    const SizedBox(height: 5),
                    Text(desc!),
                  ],
                )
              : Container(),
        ],
      ),
    );
  }
}
