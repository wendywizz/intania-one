import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as https;
import 'package:intania_staff_buddy/constants/uri.dart';
import 'package:intania_staff_buddy/models/person.dart';
import 'package:intania_staff_buddy/models/result.dart';
import 'package:intania_staff_buddy/utils/rest_request.dart';

class PersonnelService extends RestRequest<Person> {
  Future<List<Person>> getSuggestion(String keyword) async {
    final url = Uri.https(PHOENIX_URL, '/personnel/api/person_search');

    final body = jsonEncode({'searchword': keyword, 'lean': 1});
    final response = await https
        .post(
          url,
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'abcdefgh12345678'
          },
          body: body,
        )
        .timeout(const Duration(seconds: 10));

    if (response.statusCode == 200) {
      if (response.body.isNotEmpty) {
        final List users = json.decode(response.body);
        return users.map((json) => Person.fromJson(json)).toList();
      } else {
        return [];
      }
    } else {
      throw Exception();
    }
  }

  Future<Result> getRepairComputerWorkers() async {
    final uri = Uri.https(INFOR_URL, '${RP_PATH_API}manage/tech_list');

    Map<String, dynamic> result = await list(uri);
    return toResultList(result, Person.fromJson);
  }
}
