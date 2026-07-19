import 'package:e_invitation/widgets/views/account_view.dart';
import 'package:e_invitation/widgets/views/home_view.dart';
import 'package:e_invitation/widgets/views/templates_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/auth_provider.dart';
import '../providers/auth_state.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  late PageController _viewController;

  int _selectedIndex = 0;
  static const List<BottomNavigationBarItem> _bottomNavItems = [
    BottomNavigationBarItem(label: 'Home', icon: Icon(Icons.home)),
    BottomNavigationBarItem(label: 'Templates', icon: Icon(Icons.star_border)),
    BottomNavigationBarItem(
      label: 'Account',
      icon: Icon(Icons.account_box_outlined),
    ),
  ];
  static const List<Widget> _views = [
    HomeView(),
    TemplatesView(),
    AccountView(),
  ];

  @override
  void initState() {
    super.initState();
    _viewController = PageController(initialPage: _selectedIndex);
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });

    _viewController.animateToPage(
      _selectedIndex,
      duration: const Duration(milliseconds: 200),
      curve: Curves.easeInOut,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Home'),
        centerTitle: true,
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            child: PopupMenuButton(
              itemBuilder: (context) => [
                PopupMenuItem(child: const Text('Account')),
                PopupMenuItem(
                  child: const Text('Logout'),
                  onTap: () => ref.read(authProvider.notifier).logout(),
                ),
              ],
              child: ClipOval(
                child: Image.network(
                  "https://i.pravatar.cc/150?img=8",
                  height: 30,
                  width: 30,
                ),
              ),
            ),
          ),
        ],
      ),
      body: PageView(
        controller: _viewController,
        physics: const NeverScrollableScrollPhysics(),
        children: _views,
      ),
      bottomNavigationBar: BottomNavigationBar(
        items: _bottomNavItems,
        currentIndex: _selectedIndex,
        onTap: _onItemTapped,
      ),
    );
  }
}
