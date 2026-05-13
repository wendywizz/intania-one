import 'package:flutter/material.dart';
import 'package:flutter_typeahead/flutter_typeahead.dart';
import 'package:intania_staff_buddy/constants/route.dart';
import 'package:intania_staff_buddy/models/person.dart';
import 'package:intania_staff_buddy/services/personnel_service.dart';
import 'package:intania_staff_buddy/widgets/image_thumbnail.dart';
import 'package:intania_staff_buddy/widgets/list_item_person.dart';

class PersonSearchScreen extends StatefulWidget {
  const PersonSearchScreen({super.key});

  @override
  State<PersonSearchScreen> createState() => _PersonSearchScreen();
}

class _PersonSearchScreen extends State<PersonSearchScreen> {
  final SuggestionsController _control = SuggestionsController();
  final List<Person> _suggestionItems = [];
  final bool _isSubmitted = false;

  Future<List<Person>> getSuggestionsSource(String keyword) async {
    return await PersonnelService().getSuggestion(keyword);
  }

  Widget? renderResultView(List<Person> items) {
    if (_isSubmitted) {
      if (items.isNotEmpty) {
        return ListView.separated(
          itemCount: items.length,
          itemBuilder: (BuildContext context, int index) {
            return ListItemPerson(
              imageUrl: items[index].getPhoto(),
              name: '${items[index].firstNameTH} ${items[index].lastNameTH}',
              description: items[index].deptName.toString(),
              onTap: () {
                Navigator.pushNamed(context, personDetailRoute,
                    arguments: {'data': items[index]});
              },
            );
          },
          separatorBuilder: (BuildContext context, int index) {
            return const Divider();
          },
        );
      } else {
        return const Center(
          child: Text('No result'),
        );
      }
    } else {
      return const Center(
        child: Text('Waiting for search'),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: SizedBox(
          height: 50.0,
          child: TypeAheadField(
            suggestionsController: _control,
            //minCharsForSuggestions: _minCharForSuggestion,
            hideOnEmpty: true,
            /*textFieldConfiguration: TextFieldConfiguration(
              autofocus: true,
              style: DefaultTextStyle.of(context).style.copyWith(
                    fontStyle: FontStyle.normal,
                    fontSize: 18,
                    fontWeight: FontWeight.normal,
                    decoration: TextDecoration.none,
                    color: Colors.black,
                  ),
              decoration: const InputDecoration(
                hintText: "Keyword..",
                hintStyle: TextStyle(color: Colors.black26),
                fillColor: Colors.white,
                filled: true,
                enabledBorder: OutlineInputBorder(
                  borderSide: BorderSide(
                    color: Colors.black,
                    width: 2,
                  ),
                ),
              ),
              onSubmitted: (value) async {
                if (_keyword.length >= _minCharForSuggestion) {
                  final result = await getSuggestionsSource(value);

                  setState(() {
                    _suggestionItems = result;
                    _isSubmitted = true;
                  });
                }
              },
              onTap: () async {
                if (_keyword.length >= _minCharForSuggestion) {
                  final result = await getSuggestionsSource(_keyword);

                  setState(() {
                    _suggestionItems = result;
                    _isSubmitted = true;
                  });
                }
              },
              onChanged: (value) {
                setState(() {
                  _keyword = value;
                  _isSubmitted = false;
                });
              },
            ),*/
            suggestionsCallback: (pattern) async {
              return await getSuggestionsSource(pattern);
            },
            itemBuilder: (context, item) {
              Person person = item as Person;
              return ListTile(
                leading: ImageThumbnail(imageUrl: person.getPhoto()),
                title: Text('${person.firstNameTH} ${person.lastNameTH}'),
                subtitle: Text(person.deptName!),
              );
            },
            onSelected: (suggestion) {
              Navigator.pushNamed(context, personDetailRoute,
                  arguments: {'data': suggestion as Person});
            },
          ),
        ),
      ),
      body: Container(
        padding: const EdgeInsets.symmetric(vertical: 30, horizontal: 10),
        child: renderResultView(_suggestionItems),
      ),
    );
  }
}
