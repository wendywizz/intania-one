class Result {
  final bool success;
  final String message;
  final String processType;
  final dynamic data;
  final int totalCount;

  Result({
    this.success = false,
    this.message = '',
    this.processType = '',
    this.data,
    this.totalCount = 0,
  });
}
