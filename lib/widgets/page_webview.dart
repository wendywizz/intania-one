import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

class PageWebView extends StatefulWidget {
  final String url;

  const PageWebView({
    super.key,
    required this.url,
  });

  @override
  State<PageWebView> createState() => _PageWevViewState();
}

class _PageWevViewState extends State<PageWebView> {
  final GlobalKey _webViewKey = GlobalKey();
  final InAppWebViewSettings _options = InAppWebViewSettings(    
    mediaPlaybackRequiresUserGesture: false,
    allowsInlineMediaPlayback: true,
    iframeAllow: "camera; microphone",
    iframeAllowFullscreen: true
  );
  final TextEditingController _urlController = TextEditingController();
  late InAppWebViewController? _webViewController;
  late PullToRefreshController _pullToRefreshController;
  double _progress = 0;

  @override
  void initState() {
    super.initState();

    _pullToRefreshController = PullToRefreshController(
      settings: PullToRefreshSettings(
        color: Colors.blue,
      ),
      onRefresh: () async {
        if (Platform.isAndroid) {
          _webViewController?.reload();
        } else if (Platform.isIOS) {
          _webViewController?.loadUrl(
              urlRequest: URLRequest(url: await _webViewController?.getUrl()));
        }
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        children: [
          Expanded(
            child: Stack(
              children: [
                InAppWebView(
                  key: _webViewKey,
                  initialSettings: _options,
                  initialUrlRequest: URLRequest(
                    url: WebUri.uri(Uri.parse(widget.url)),
                    method: 'GET',
                    headers: {
                      'Content-Type': 'application/x-www-form-urlencoded'
                    },
                  ),
                  onWebViewCreated: (controller) {
                    _webViewController = controller;
                  },
                  onProgressChanged: (controller, progress) {
                    if (progress == 100) {
                      _pullToRefreshController.endRefreshing();
                    }
                    setState(() {
                      _progress = progress / 100;
                      _urlController.text = widget.url;
                    });
                  },
                  onReceivedError: (controller, request, error) { 
                    // ignore: avoid_print
                    print(error); 
                  },
                  onConsoleMessage: (controller, consoleMessage) {
                    // ignore: avoid_print
                    print(consoleMessage);
                  },
                  onPermissionRequest: (controller, permissionRequest) async {
                    return PermissionResponse(resources: permissionRequest.resources, action: PermissionResponseAction.GRANT,);
                  },
                ),
                _progress > 0 && _progress < 1.0
                    ? const Center(
                        child: CircularProgressIndicator(),
                      )
                    : Container(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    super.dispose();
  }
}
