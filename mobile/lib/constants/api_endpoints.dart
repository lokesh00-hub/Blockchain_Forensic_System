class ApiEndpoints {
  // Replace with your development machine's local IP (e.g. http://10.0.2.2:5000 for Android emulator)
  static const String baseUrl = "http://10.0.2.2:5000/api";

  static const String login = "$baseUrl/auth/login";
  static const String dashboardSummary = "$baseUrl/dashboard/summary";
  static const String dashboardAlerts = "$baseUrl/dashboard/alerts";
  static const String evidenceList = "$baseUrl/evidence";
  static const String evidenceVerify = "$baseUrl/evidence/verify";
  static const String monitoringFiles = "$baseUrl/monitoring/files";
  static const String investigations = "$baseUrl/investigations";
  static const String reports = "$baseUrl/reports";
}
