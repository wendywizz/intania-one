import 'package:flutter/material.dart';

class ImageThumbnail extends StatelessWidget {
  final String _placeholderImage = 'assets/img/user_placeholder.jpg';
  final String imageUrl;
  final double height;
  final double width;
  final String shapeType;

  const ImageThumbnail({
    super.key,
    required this.imageUrl,
    this.height = 60,
    this.width = 50,
    this.shapeType = 'rectangular',
  });

  Widget getDefaultImage() {
    return FadeInImage(
      fit: BoxFit.cover,
      image: NetworkImage(imageUrl),
      placeholder: AssetImage(_placeholderImage),
      imageErrorBuilder: (context, error, stackTrace) {
        return Image.asset(_placeholderImage);
      },
    );
  }

  Widget getCircularImage() {
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: const BoxDecoration(
        color: Color(0xff636e72),
        shape: BoxShape.circle,
      ),
      child: ClipOval(
        child: SizedBox.fromSize(
          size: const Size.fromRadius(48),
          child: getDefaultImage(),
        ),
      ),
    );
  }

  Widget getImage() {
    switch (shapeType) {
      case 'circular':
        return getCircularImage();
      case 'rectangular':
      default:
        return getDefaultImage();
    }
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      height: height,
      child: getImage(),
    );
  }
}
