# 自定义渲染器

渲染器的作用是把虚拟DOM渲染为特定平台上的真实元素。在浏览器中，渲染器会把虚拟DOM渲染成真实DOM元素。

- createRenderer 接受目标平台操作DOM API
- 返回目标平台渲染器，参数为虚拟 DOM，container
- h 函数返回 VDOM
- container 为 VDOM 要挂载的元素容器
```ts [example]
const { createRenderer, h } = Vue

const renderer = createRenderer({
  createElement(element){
      return document.createElement(element);
  },
  setElementText(el,text){
      el.innerHTML = text
  },
  insert(el,container){
      container.appendChild(el)
    }
});

renderer.render(h('h1','hello world'), document.getElementById('app'))
```

## 运行时 runtime

- runtime-dom：提供操作目标平台（浏览器、小程序等）DOM API
- runtime-core：关注元素整个声明周期（挂载、更新、卸载等），调用 runtime-dom 提供 DOM API
- 可实现跨平台渲染器