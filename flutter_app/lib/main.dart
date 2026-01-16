import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Sentinel AI',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
      ),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  String? walletAddress = '0x742d35Cc6634C0532925a3b88650D7241cdf3E81';
  Map<String, dynamic>? balanceData;
  List<Map<String, dynamic>> chatMessages = [];
  TextEditingController messageController = TextEditingController();
  bool isLoading = false;

  @override
  void initState() {
    super.initState();
    fetchBalances();
  }

  Future<void> fetchBalances() async {
    try {
      // Replace with your Railway backend URL
      final response = await http.get(
        Uri.parse('https://your-railway-backend-url.up.railway.app/api/wallet/balance/$walletAddress'),
      );

      if (response.statusCode == 200) {
        setState(() {
          balanceData = json.decode(response.body);
        });
      }
    } catch (e) {
      print('Error fetching balances: $e');
    }
  }

  Future<void> sendMessage() async {
    if (messageController.text.trim().isEmpty) return;

    final message = messageController.text.trim();
    setState(() {
      chatMessages.add({'type': 'user', 'text': message});
      messageController.clear();
      isLoading = true;
    });

    try {
      final response = await http.post(
        Uri.parse('https://your-railway-backend-url.up.railway.app/api/agent/chat'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'message': message, 'userId': 'test-user'}),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        setState(() {
          chatMessages.add({'type': 'agent', 'text': data['message']});
        });
      }
    } catch (e) {
      print('Chat error: $e');
      setState(() {
        chatMessages.add({'type': 'agent', 'text': 'Sorry, I couldn\'t process your request.'});
      });
    } finally {
      setState(() {
        isLoading = false;
      });
    }
  }

  Future<void> claimFaucet(String token) async {
    try {
      final response = await http.post(
        Uri.parse('https://your-railway-backend-url.up.railway.app/api/wallet/claim-faucet'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'address': walletAddress, 'token': token}),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(data['message'])),
        );
        fetchBalances();
      }
    } catch (e) {
      print('Faucet error: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to claim faucet')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sentinel AI'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: Column(
        children: [
          // Dashboard Section
          if (balanceData != null) ...[
            Card(
              margin: const EdgeInsets.all(16),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Wallet Balance',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('sGOLD: ${double.parse(balanceData!['sGold']).toStringAsFixed(2)}'),
                        Text('sBOND: ${double.parse(balanceData!['sBOND']).toStringAsFixed(2)}'),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text('Native: ${double.parse(balanceData!['native']).toStringAsFixed(4)}'),
                    const SizedBox(height: 8),
                    Text('USD Value: \$${balanceData!['usdValue'].toStringAsFixed(2)}'),
                  ],
                ),
              ),
            ),
          ],

          // Faucet Section
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                ElevatedButton(
                  onPressed: () => claimFaucet('sGOLD'),
                  child: const Text('Get sGOLD'),
                ),
                ElevatedButton(
                  onPressed: () => claimFaucet('sBOND'),
                  child: const Text('Get sBOND'),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Chat Section
          Expanded(
            child: Card(
              margin: const EdgeInsets.all(16),
              child: Column(
                children: [
                  const Padding(
                    padding: EdgeInsets.all(16),
                    child: Text(
                      'Chat with Sentinel AI',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ),
                  Expanded(
                    child: ListView.builder(
                      itemCount: chatMessages.length,
                      itemBuilder: (context, index) {
                        final chat = chatMessages[index];
                        return ListTile(
                          title: Align(
                            alignment: chat['type'] == 'user'
                                ? Alignment.centerRight
                                : Alignment.centerLeft,
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: chat['type'] == 'user'
                                    ? Colors.blue
                                    : Colors.grey[300],
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                chat['text'],
                                style: TextStyle(
                                  color: chat['type'] == 'user' ? Colors.white : Colors.black,
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(8),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: messageController,
                            decoration: const InputDecoration(
                              hintText: 'Type your message...',
                              border: OutlineInputBorder(),
                            ),
                            onSubmitted: (_) => sendMessage(),
                          ),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          onPressed: isLoading ? null : sendMessage,
                          child: isLoading
                              ? const CircularProgressIndicator()
                              : const Icon(Icons.send),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
