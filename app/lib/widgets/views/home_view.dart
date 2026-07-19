import 'package:e_invitation/providers/auth_provider.dart';
import 'package:e_invitation/providers/auth_state.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class HomeView extends ConsumerWidget {
  const HomeView({super.key});

  @override
  Widget build(BuildContext context, ref) {
    final username = ref
        .watch(authProvider)
        .maybeWhen(authenticated: (user) => user.name, orElse: () => '');

    return Column(
      children: [
        Text(
          'Good Afternoon! $username',
          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
        ),
      ],
    );
  }
}
