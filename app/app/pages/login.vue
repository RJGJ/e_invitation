<script setup lang="ts">
import type { AuthFailure } from '../types/auth'

const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const emailError = ref('')
const passwordError = ref('')
const isLoading = ref(false)
const failure = ref<AuthFailure | null>(null)

const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

function validate(): boolean {
  emailError.value = ''
  passwordError.value = ''

  if (!email.value) {
    emailError.value = 'Email is required'
  } else if (!emailRegex.test(email.value)) {
    emailError.value = 'Enter a valid email address'
  }

  if (!password.value) {
    passwordError.value = 'Password is required'
  }

  return !emailError.value && !passwordError.value
}

function mapFailure(f: AuthFailure): string {
  switch (f.kind) {
    case 'invalid-credentials':
      return 'Invalid email or password'
    case 'validation':
      return 'Please check your email and password and try again.'
    case 'network':
    case 'server':
      return 'Something went wrong. Please try again.'
  }
}

async function submit() {
  failure.value = null
  if (!validate()) return

  isLoading.value = true
  try {
    await authStore.login(email.value.trim(), password.value)
    await navigateTo('/')
  } catch (error) {
    failure.value = error as AuthFailure
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-luxe-surface px-margin-mobile">
    <AppCard class="w-full max-w-sm">
      <form class="flex flex-col gap-unit" @submit.prevent="submit">
        <h1 class="mb-unit text-center font-serif text-headline-sm text-luxe-on-surface">Log in</h1>

        <AppInput
          v-model="email"
          label="Email"
          type="email"
          :disabled="isLoading"
          :error="emailError"
        />
        <AppInput
          v-model="password"
          label="Password"
          type="password"
          :disabled="isLoading"
          :error="passwordError"
        />

        <p v-if="failure" class="font-sans text-body-sm text-luxe-error">
          {{ mapFailure(failure) }}
        </p>

        <AppButton type="submit" :disabled="isLoading" class="mt-unit">
          {{ isLoading ? 'Logging in…' : 'Log in' }}
        </AppButton>
      </form>
    </AppCard>
  </div>
</template>
