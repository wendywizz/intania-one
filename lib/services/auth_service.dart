import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_appauth/flutter_appauth.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intania_staff_buddy/constants/auth.dart';
import 'package:intania_staff_buddy/models/auth_user.dart';

class AuthService extends ChangeNotifier {
  final FlutterAppAuth _appAuth = const FlutterAppAuth();
  final Future<SharedPreferences> _prefs = SharedPreferences.getInstance();

  Future<AuthUser?> get currentUser async {
    final SharedPreferences prefs = await _prefs;
    final String? strAuthUser = prefs.getString(AUTH_USER);

    if (strAuthUser != null) {
      final AuthUser authUser = AuthUser.fromJson(jsonDecode(strAuthUser));

      return authUser;
    } else {
      return null;
    }
    /*const String strAuthUser =
        '{"username":"kraisuwan.y","first_name":"KRAISUWAN","last_name":"YANGTAKUL","staff_id":"0000237","email":"kraisuwan.y@psu.ac.th","campus_id":"01","fac_id":"06","dept_id":"831","pos_id":"278"}';
    final AuthUser authUser = AuthUser.fromJson(jsonDecode(strAuthUser));
    return authUser;*/
  }

  Future<bool> get isLoggedIn async {
    final SharedPreferences prefs = await _prefs;
    final bool? loggedIn = prefs.getBool(LOGGED_IN);

    if (loggedIn == true) {
      return true;
    } else {
      return false;
    }
  }

  Future<bool> init() async {
    final SharedPreferences prefs = await _prefs;
    String? refreshToken = prefs.getString(REFRESH_TOKEN);

    if (refreshToken == null) {
      return false;
    }

    try {
      TokenRequest tokenRequest = TokenRequest(
        AUTH_CLIENT_ID,
        AUTH_REDIRECT_URI,
        refreshToken: refreshToken,
        clientSecret: AUTH_CLIENT_SECRET,
        grantType: 'refresh_token',
        serviceConfiguration: const AuthorizationServiceConfiguration(
          tokenEndpoint: '${AUTH_ISSUER}refreshtoken',
          authorizationEndpoint: '${AUTH_ISSUER}authorize',
        ),
      );
      final TokenResponse? tokenResponse = await _appAuth.token(tokenRequest);

      return await _setAuthenticateInfo(tokenResponse!);
    } catch (e) {
      // ignore: avoid_print
      print(e);
    }
    return false;
  }

  Future<bool> login() async {
    try {
      const serviceConfig = AuthorizationServiceConfiguration(
        authorizationEndpoint: '${AUTH_ISSUER}authorize',
        tokenEndpoint: '${AUTH_ISSUER}authorize/token',
      );

      //Get Authorization Code
      final authorizationRequest = AuthorizationRequest(
        AUTH_CLIENT_ID,
        AUTH_REDIRECT_URI,
        scopes: ['userinfo'],
        promptValues: ['login'],
        serviceConfiguration: serviceConfig,
      );
      final AuthorizationResponse? result =
          await _appAuth.authorize(authorizationRequest);

      // Get Authorization Token
      final authorizationCode = result!.authorizationCode.toString();

      if (authorizationCode != '') {
        final TokenResponse? tokenResponse = await _appAuth.token(TokenRequest(
          AUTH_CLIENT_ID,
          AUTH_REDIRECT_URI,
          clientSecret: AUTH_CLIENT_SECRET,
          authorizationCode: authorizationCode,
          serviceConfiguration: serviceConfig,
        ));

        return await _setAuthenticateInfo(tokenResponse!);
      }
    } on PlatformException catch (e) {
      // ignore: avoid_print
      print(e);
    } catch (e) {
      // ignore: avoid_print
      print(e);
    }
    return false;
  }

  Future<bool> logout() async {
    final SharedPreferences prefs = await _prefs;
    notifyListeners();
    return await prefs.clear();
  }

  Future<bool> _setAuthenticateInfo(TokenResponse tokenResponse) async {
    final SharedPreferences prefs = await _prefs;
    final accessToken = tokenResponse.accessToken;
    final url = Uri.https(AUTH_DOMAIN, '/resource/userinfo');
    final response = await http.get(url, headers: {
      'Authorization': 'Bearer $accessToken',
    });

    if (response.statusCode == 200) {
      await prefs.setString(AUTH_USER, response.body);
      await prefs.setString(
          REFRESH_TOKEN, tokenResponse.refreshToken.toString());
      await prefs.setBool(LOGGED_IN, true);
      notifyListeners();

      return true;
    } else {
      return false;
    }
  }
}
