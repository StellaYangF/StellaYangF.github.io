import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: "zh-CN",
  title: 'Stella Blog',
  outDir: "../stella",
  base: "/stella/",
  description: "Frontend technology learning notes.",
  themeConfig: {
    search: {
      provider: 'local'
    },
    nav: [
      { text: '概览', link: '/guide' },
      { text: '前端', link: '/front/', activeMatch: '/front/' },
      { text: '后端', link: '/back/', activeMatch: '/back/' },
      { text: '数据结构与算法', link: '/algorithm/' }
    ],

    sidebar: {
      '/front': [
        {
          text: '框架', collapsed: false, items: [
            { text: 'vue3', link: '/front/vue3/design' },
            { text: 'axios', link: '/front/axios' },
          ]
        },
        {
          text: '工程化', collapsed: false, items: [
            { text: 'webpack', link: '/front/webpack/' },
            { text: 'rollup', link: '/front/rollup/' },
            { text: 'vite', link: '/front/vite/' }
          ]
        },
        {
          text: '性能', collapsed: false, items: [
            { text: '性能优化', link: '/front/performance/' }
          ]
        },
        {
          text: '测试', collapsed: false, items: [
            { text: '测试工具', link: '/front/test/' }
          ]
        },
        {
          text: '技术汇总', collapsed: false, items: [
            { text: 'DOM 事件', link: '/front/overview/' },
            { text: 'JavaScript', link: '/front/overview/js' },
            { text: 'CSS', link: '/front/overview/css' }
          ]
        }
      ],
      '/back': [
        { text: 'express', link: '/back/express' },
        { text: 'koa', link: '/back/koa' },
        { text: 'websocket', link: '/back/websocket' },
      ]
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/StellaYangF/stella.github.io' }
    ]
  }
})
