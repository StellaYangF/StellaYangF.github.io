import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Stella Blog',
  outDir: "../blog",
  base: "/blog/",
  description: "Frontend technology learning notes.",
  markdown: {
    lineNumbers: true
  },
  themeConfig: {
    nav: [
      { text: '概览', link: '/guide' },
      {
        text: '前端', activeMatch: '/front/', items: [
          { text: 'vue3', link: '/front/vue/', activeMatch: '/front/vue/' },
          { text: 'performance', link: '/front/performance/' },
          { text: '相关技术', link: '/front/overview/' }
        ]
      },
      {
        text: '后端', activeMatch: '/back/', items: [
          { text: 'express', link: '/back/express' },
          { text: 'koa', link: '/back/koa' },
          { text: 'websocket', link: '/back/websocket' },
          { text: 'axios', link: '/back/axios' },
          { text: 'cookie vs session', link: '/back/cookie-session' },
          { text: 'http', link: '/back/http' },
        ]
      },
      // { text: '数据结构与算法', link: '/algorithm/overview/' }
    ],

    sidebar: {
      '/front': [
        {
          text: 'vue3', collapsed: false, items: [
            { text: 'vue3设计思想', link: '/front/vue/' },
            { text: '整体架构', link: '/front/vue/architect' },
            { text: '环境搭建', link: '/front/vue/env' },
            { text: '响应式模块', link: '/front/vue/reactivity' },
            { text: 'computed & watch', link: '/front/vue/computed-watch' },
            { text: 'ref', link: '/front/vue/ref' },
            { text: '实现自定义渲染器', link: '/front/vue/runtime-render' },
            { text: 'runtime-dom', link: '/front/vue/runtime-dom' },
            { text: 'runtime-core', link: '/front/vue/runtime-core' },
            { text: '渲染元素-diff 算法', link: '/front/vue/render-diff' },
            { text: '渲染Text、Fragment', link: '/front/vue/render-text-fragment' },
            { text: '渲染组件', link: '/front/vue/render-component' },
            { text: '渲染组件-setup函数', link: '/front/vue/render-setup' },
            { text: '渲染-优化', link: '/front/vue/render-optimize' },
            { text: '编译-parse', link: '/front/vue/compiler-parse' },
            { text: '编译-transform', link: '/front/vue/compiler-transform' },
            { text: '编译-generate', link: '/front/vue/compiler-generate' },
          ]
        },
        // {
        //   text: '工程化', collapsed: false, items: [
        //     { text: 'webpack', link: '/front/webpack/' },
        //     { text: 'rollup', link: '/front/rollup/' },
        //     { text: 'vite', link: '/front/vite/' }
        //   ]
        // },
        {
          text: '性能', collapsed: false, items: [
            { text: 'performance', link: '/front/performance/' }
          ]
        },
        // {
        //   text: '测试', collapsed: false, items: [
        //     { text: '测试工具', link: '/front/test/' }
        //   ]
        // },
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
        { text: 'axios', link: '/back/axios' },
        { text: 'cookie vs session', link: '/back/cookie-session' },
        { text: 'http', link: '/back/http' },
      ]
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/StellaYangF/stella.github.io' }
    ]
  }
})
