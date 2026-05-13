import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';

class BoxUploadImage extends StatelessWidget {
  final Function onPickedFile;
  final dynamic imageSource;

  const BoxUploadImage({
    super.key,
    required this.onPickedFile,
    this.imageSource,
  });

  Widget boxReselect() {
    dynamic image;

    if (imageSource != null) {
      if (imageSource is File) {
        image = AssetImage((imageSource as File).path);
      } else if (imageSource is String) {
        image = NetworkImage(imageSource);
      }
    }
    return Column(
      children: [
        Container(
          height: 80,
          width: 120,
          decoration: BoxDecoration(
            image: DecorationImage(
              image: image,
              fit: BoxFit.cover,
            ),
          ),
        ),
        const SizedBox(height: 5),
        const Text('อัพโหลดใบรับรองแพทย์แล้ว'),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.red,
            foregroundColor: Colors.white,
          ),
          onPressed: () => handlePickfile(),
          child: const Text('เลือกไฟล์ใหม่'),
        )
      ],
    );
  }

  Widget boxNewSelect() {
    return Column(
      children: [
        const Icon(
          Icons.file_upload,
          size: 48.0,
        ),
        const Text('อัพโหลดใบรับรองแพทย์'),
        const SizedBox(height: 5),
        ElevatedButton(
            onPressed: () => handlePickfile(), child: const Text('เลือกไฟล์'))
      ],
    );
  }

  Future handlePickfile() async {
    try {
      final pickImage =
          await ImagePicker().pickImage(source: ImageSource.gallery);

      if (pickImage == null) return;

      final imageTemp = File(pickImage.path);
      onPickedFile(imageTemp);
    } on PlatformException catch (e) {
      print('Failed to pick image: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        border: Border.all(width: 1.0, color: Colors.grey),
      ),
      child: (imageSource == '' || imageSource == null)
          ? boxNewSelect()
          : boxReselect(),
    );
  }
}
