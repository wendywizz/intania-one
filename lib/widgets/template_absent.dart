import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:intania_staff_buddy/constants/text.dart';
import 'package:intania_staff_buddy/widgets/template_blank.dart';

class TemplateAbsent extends StatefulWidget {
  final String appTitle;
  final Widget child;
  final VoidCallback onSubmit;
  final bool isEditMode;
  final bool progressing;
  final bool showNavbar;

  const TemplateAbsent({
    super.key,
    required this.appTitle,
    required this.child,
    required this.onSubmit,
    this.isEditMode = false,
    this.progressing = false,
    this.showNavbar = true,
  });

  @override
  State<TemplateAbsent> createState() => _TemplateAbsentState();
}

class _TemplateAbsentState extends State<TemplateAbsent> {
  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      child: TemplateBlank(
        appBarTitle: widget.appTitle,
        bottomSheet: widget.showNavbar
            ? Container(
                alignment: Alignment.center,
                decoration: const BoxDecoration(
                  color: Colors.white70,
                  border: Border(
                    top: BorderSide(
                      width: 1,
                    ),
                  ),
                ),
                height: 100,
                width: double.maxFinite,
                child: SizedBox(
                  width: 200.0,
                  height: 40.0,
                  child: ElevatedButton(
                    onPressed: widget.progressing ? null : widget.onSubmit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.black87,
                      foregroundColor: Colors.white,
                      disabledBackgroundColor: Colors.grey,
                    ),
                    child: widget.progressing
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                            ))
                        : widget.isEditMode
                            ? const Text(TEXT_SAVE)
                            : const Text(TEXT_SUBMIT),
                  ),
                ),
              )
            : Container(height: 0),
        child: widget.child,
      ),
    );
  }
}
