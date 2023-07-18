# vue3 源码学习
## 设计思想

对比Vue2代码组织，Vue3在代码的分包上做了优化，后续整体架构章节会具体分析说明，总体如下：

- 模块拆分

  > Vue3.0更注重模块上的拆分，在2.0中无法单独使用部分模块。需要引入完整的 `Vuejs` (例如只想使用使用 `reactivity` 响应式部分，但是需要引入完整的 `Vuejs` )， Vue3中的模块之间耦合度低，模块可以独立使用。

- 重写API

  > Vue2中很多方法挂载到了实例中，导致没有使用也会被打包（还有很多组件也是一样）。通过构建工具 `Tree-shaking` 机制实现按需引入，减少用户打包后体积。

- 扩展更方便

  > Vue3允许自定义渲染器，扩展能力强。不会发生以前的事情，改写Vue源码改造渲染方式。暴露出 `createRenderer` 与平台无关的渲染器，可以根据平台灵活编写渲染方式。

## 保留 Vue2 特色

### 声明式框架

- 命令式：早在 jQuery 的时代编写的代码都是命令式的，命令式框架重要特点就是关注过程
- 声明式：框架更加关注结果。命令式的代码封装到了Vuejs中，过程靠vuejs来实现
- 声明式代码更加简单，不需要关注实现，按照要求填代码就可以

> *Declarative programming is a non-imperative style of programming in which programs describe their desired results without explicitly listing commands or steps that must be performed. Functional and logical programming languages are characterized by a declarative programming style.*

*[see https://www.educative.io/blog/declarative-vs-imperative-programming](https://www.educative.io/blog/declarative-vs-imperative-programming)*

```js
// 命令式编程
const list = ['a', 'b', 'c']
let html = `<ul>`

for(let i = 0; i < list.length; i++) {
  // 关注过程
  html += `<li>${list[i]}</li>`
}
html+= '</ul>'

// 声明式编程
list.reduce((memo, current) => memo += `<li>${current}</li>`, '<ul>')html += '</ul'
```

### 采用VDOM

jQuery 时代，回想刚开始做前端时，公司的旧业务代码就是通过传统方式更新页面，拼接一个完整的字符串 `innerHTML` 全部重新渲染，这样频繁修改，导致大量浏览器重排重绘，性能差。

而 Vue 框架包括 React 都是添加虚拟文档 virtual DOM，可以比较新旧虚拟节点，找到变化再进行更新。虚拟DOM就是一个对象，用来描述真实DOM的

```js
const vnode = {
  __v_isVNode: true,
  __v_skip: true,
  type,
  props,
  key: props && normalizeKey(props),
  ref: props && normalizeRef(props),
  children,
  component: null,
  el: null,
  patchFlag,
  dynamicProps,
  dynamicChildren: null,
  appContext: null
} 
```

> 创建VDOM对象，大致包含以上属性值，描述节点的相关信息。

### 区分编译时和运行时

- 虚拟DOM，调用渲染方法将虚拟DOM渲染成真实DOM （缺点就是虚拟DOM编写麻烦）
- 专门写个编译时可以将模板 template 编译成虚拟DOM （在构建的时候进行编译性能更高，不需要再运行的时候进行编译，而且vue3在编译中做了很多优化）
