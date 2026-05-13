import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/widgets/image_thumbnail.dart';

class ListItemPerson extends StatelessWidget {
  final String? imageUrl;
  final String name;
  final String? description;
  final Function? onTap;

  const ListItemPerson({
    super.key,
    this.imageUrl,
    required this.name,
    this.description,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: imageUrl != null ? ImageThumbnail(imageUrl: imageUrl!) : null,
      title: Text(name),
      subtitle: description != null ? Text(description!) : null,
      trailing: onTap != null ? const Icon(Icons.chevron_right) : null,
      onTap: () => onTap != null ? onTap!() : null,
    );
  }
}
