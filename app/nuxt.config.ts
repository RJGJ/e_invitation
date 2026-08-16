// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  ssr: false,
  modules: ["@pinia/nuxt", "@nuxtjs/tailwindcss"],
  css: ["~/assets/css/main.css"],
  components: [{ path: "~/components", pathPrefix: false, extensions: ["vue"] }],
  runtimeConfig: {
    public: {
      apiBaseUrl: "",
    },
  },
  devServer: {
    port: Number(process.env.NODE_PORT || "3003"),
  },
});
