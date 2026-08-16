<script setup lang="ts">
import type { AuthFailure } from "../types/auth";

const authStore = useAuthStore();

const email = ref("");
const password = ref("");
const emailError = ref("");
const passwordError = ref("");
const isLoading = ref(false);
const failure = ref<AuthFailure | null>(null);

const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function validate(): boolean {
  emailError.value = "";
  passwordError.value = "";

  if (!email.value) {
    emailError.value = "Email is required";
  } else if (!emailRegex.test(email.value)) {
    emailError.value = "Enter a valid email address";
  }

  if (!password.value) {
    passwordError.value = "Password is required";
  }

  return !emailError.value && !passwordError.value;
}

function mapFailure(failure: AuthFailure): string {
  switch (failure.kind) {
    case "invalid-credentials":
      return "Invalid email or password";
    case "validation":
      return "Please check your email and password and try again.";
    case "network":
    case "server":
      return "Something went wrong. Please try again.";
  }
}

async function submit() {
  failure.value = null;
  if (!validate()) return;

  isLoading.value = true;
  try {
    await authStore.login(email.value.trim(), password.value);
    await navigateTo("/");
  } catch (error) {
    failure.value = error as AuthFailure;
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <Container>
    <div>
      <div
        class="flex justify-center pt-11 px-7 pb-5 bg-[radial-gradient(120%_90%_at_50%_0%,_rgb(20,106,81),_rgb(14,82,64))]"
      >
        <img
          src="~/assets/images/icons/logo-light.svg"
          alt="Logo"
          class="h-16 w-auto"
        />
        <h1></h1>
      </div>
      <AppCard class="w-full max-w-sm">
        <form class="flex flex-col gap-unit" @submit.prevent="submit">
          <h1
            class="mb-unit text-center font-serif text-headline-sm text-luxe-on-surface"
          >
            Log in
          </h1>
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
            {{ isLoading ? "Logging in…" : "Log in" }}
          </AppButton>
        </form>
      </AppCard>
    </div>
  </Container>
</template>
