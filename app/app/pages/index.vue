<script setup lang="ts">
const authStore = useAuthStore()

const user = computed(() => (authStore.authState.status === 'authenticated' ? authStore.authState.user : null))

async function logout() {
  await authStore.logout()
  await navigateTo('/login')
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-unit bg-luxe-surface px-margin-mobile">
    <h1 v-if="user" class="font-serif text-headline-md text-luxe-on-surface">Welcome, {{ user.name }}</h1>
    <AppButton @click="logout">Log out</AppButton>
  </div>
</template>
