import 'package:flutter/material.dart';

void main() {
  runApp(const ForensicApp());
}

class ForensicApp extends StatelessWidget {
  const ForensicApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Blockchain Forensic System',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF070B14),
        cardColor: const Color(0xFF101C2E),
        primaryColor: const Color(0xFF08A9F5),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF08A9F5),
          secondary: Color(0xFF17C98B),
          error: Color(0xFFF04452),
          surface: Color(0xFF101C2E),
        ),
        fontFamily: 'Inter',
      ),
      home: const MobileDashboardScreen(),
    );
  }
}

class MobileDashboardScreen extends StatelessWidget {
  const MobileDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF0A1220),
        title: const Text(
          "Forensic Command Mobile",
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications, color: Color(0xFF08A9F5)),
            onPressed: () {},
          )
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF101C2E),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF203650)),
              ),
              child: const Row(
                children: [
                  CircleAvatar(
                    backgroundColor: Color(0xFF17C98B),
                    radius: 6,
                  ),
                  SizedBox(width: 10),
                  Text(
                    "Blockchain Ledger Online • Hardhat 31337",
                    style: TextStyle(color: Colors.white70, fontSize: 13),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            const Text(
              "Evidence Integrity Overview",
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            const SizedBox(height: 12),

            // Metrics Grid
            Row(
              children: [
                Expanded(child: _buildMetricTile("Total Evidence", "128", const Color(0xFF08A9F5))),
                const SizedBox(width: 12),
                Expanded(child: _buildMetricTile("Verified", "112", const Color(0xFF17C98B))),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildMetricTile("Tampered", "9", const Color(0xFFF04452))),
                const SizedBox(width: 12),
                Expanded(child: _buildMetricTile("Missing", "5", const Color(0xFFF5A623))),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricTile(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF101C2E),
        borderRadius: BorderRadius.circular(12),
        border: Border(top: BorderSide(color: color, width: 3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color)),
          const SizedBox(height: 4),
          Text(label, style: const TextStyle(fontSize: 12, color: Colors.white60)),
        ],
      ),
    );
  }
}
