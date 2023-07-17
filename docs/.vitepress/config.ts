import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: "en-US",
  title: "Stella Blog",
  description: "Frontend technology learning notes.",
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Examples', link: '/markdown-examples' }
    ],

    sidebar: [
      {
        text: 'Examples',
        items: [
          { text: 'Markdown Examples', link: '/markdown-examples' },
          { text: 'Runtime API Examples', link: '/api-examples' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ]
  },
  locales: {
    root: {
      label: 'Chinese',
      lang: 'ch'
    },
    en: {
      label: 'English',
      lang: 'en',
      link: '/en/guide'
    }
  }
})
