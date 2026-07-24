// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  ssr: false,
  modules: ["@pinia/nuxt", "@nuxtjs/tailwindcss"],
  css: ["~/assets/css/main.css"],
  components: [{ path: "~/components/ui", pathPrefix: false }],
  runtimeConfig: {
    public: {
      apiBaseUrl: "",
    },
  },
  devServer: {
    port: Number(process.env.NODE_PORT || "3003"),
  },
});
