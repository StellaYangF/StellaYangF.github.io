import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: "zh-CN",
  title: 'Stella Blog',
  outDir: "../stella",
  base: "/stella/",
  description: "Frontend technology learning notes.",
  themeConfig: {
    nav: [
      { text: '概览', link: '/guide' },
      { text: '前端', link: '/front/', activeMatch: '/front/axios' },
      { text: '后端', link: '/back/', activeMatch: '/back/express' },
      { text: '数据结构与算法', link: '/algorithm/' },
      { text: '技术汇总', link: '/overview/' }
    ],

    sidebar: {
      '/front': [
        {
          text: '前端', collapsed: false, items: [
            { text: 'axios', link: '/front/axios' },
            { text: 'vue', link: '/front/vue' }
          ]
        }
      ],
      '/back': [
        { text: 'express', link: '/back/express' },
        { text: 'koa', link: '/back/koa' },
        { text: 'websocket', link: '/back/websocket' },
      ],
      '/overview': [
        { text: 'DOM 事件', link: '/overview/' },
        { text: '性能优化', link: '/overview/performance' },
        { text: 'JavaScript', link: '/overview/js' },
        { text: 'CSS', link: '/overview/css' }
      ]
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/StellaYangF/stella.github.io' }
    ]
  }
})
