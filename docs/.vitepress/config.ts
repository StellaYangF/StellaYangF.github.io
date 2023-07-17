import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Stella Blog",
  outDir: "../stella",
  base: "/stella/",
  description: "Frontend technology learning notes.",
  themeConfig: {
    nav: [
      { text: '概览', link: '/guideline' },
      {
        text: '前端', items: [
          { text: 'Vue', link: '/frontend/vue/index' }
        ]
      },
      { text: '后端', link: '/markdown-examples' },
      { text: '数据结构与算法', link: '/markdown-examples' },
      { text: '生活', link: '/markdown-examples' }
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
      { icon: 'github', link: 'https://github.com/StellaYangF/stella.github.io' }
    ]
  }
})
