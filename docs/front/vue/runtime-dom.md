# runtime-dom

[[toc]]

runtime-dom 针对浏览器运行时，包括 DOM API 、属性、事件处理等

## 新增 runtime-dom package

```ts [runtime-dom/package.json]
{
  "name": "@vue/runtime-dom",
  "main": "index.js",
  "module": "dist/runtime-dom.esm-bundler.js",
  "unpkg": "dist/runtime-dom.global.js",
  "buildOptions": {
    "name": "VueRuntimeDOM",
    "formats": [
      "esm-bundler",
      "cjs",
      "global"
    ]
  }
}
```

## 节点操作

`runtime-dom/src/nodeOps` 这里存放常见 DOM 操作 API，不同运行时提供的具体实现不一样，最终将操作方法传递到 runtime-core 中，所以 runtime-core 不关心平台相关代码。

```ts [nodeOps]
const doc = typeof document !== 'undefined' ? document : null

export const nodeOps = {
  insert: (child, parent: Element, anchor) => {
    parent.insertBefore(child, anchor || null)
  },
  remove: child => {
    const parent = child.parentNode
    if (parent) {
      parent.removeChild(child)
    }
  },
  createElement: tag => doc.createElement(tag),
  createText: text => doc.createTextNode(text),
  createComment: text => doc.createComment(text),
  setText: (node, text) => {
    node.nodeValue = text
  },
  setElementText: (el, text) => {
    el.textContent = text
  },
  parentNode: node => node.parentNode,
  nextSibling: node => node.nextSibling,
  querySelector: selector => doc.querySelector(selector)
}
```

## 比对属性

```ts [patchProp]
export function patchProp(el, key, prevValue, nextValue) {
  if (key === 'class') {
    patchClass(el, nextValue)
  } else if (key === 'style') {
    patchStyle(el, prevValue, nextValue)
  } else if (isOn(key)) {
    patchEvent(el, key, nextValue)
  } else {
    patchAttr(el, key, nextValue)
  }
}
```

### 操作类名
```ts [patchClass]
export function patchClass(el: Element, value: string | null) {
  if (value == null) {
    el.removeAttribute('class')
  } else {
    // isSVG el.setAttribute('class', value)

    // directly setting className should be faster than setAttribute in theory
    // if this is an element during a transition, take the temporary transition
    // classes into account.  
    el.className = value
  }
}
```

### 操作样式

```ts [patchStyle]
export function patchStyle(el: Element, prev, next) {
  const style = (el as HTMLElement).style

  // add next style
  for (const key in next) {
    style[key] = next[key]
  }

  // remove previous style which not in next style
  for (const key in prev) {
    if (next == null || next[key] == null) {
      style[key] = null
    }
  }
}
```

### 操作事件

```ts [patchEvent]
/* patch event */
function createInvoker(initialValue) {
  // 动态换绑事件回调
  // el.addEventListener(name, nextValue) 
  // nextValue 直接传入，后续更改了回调，需要解绑再绑
  // el.addEventListener(name, invoker.value)
  const invoker = e => invoker.value(e)
  invoker.value = initialValue

  return invoker
}

interface Invoker extends EventListener {
  value: EventValue
}

type EventValue = Function | Function[]

export function patchEvent(
  el: Element & { _vei?: Record<string, Invoker | undefined> },
  rawName: string,
  nextValue: EventValue | null
) {
  const invokers = el._vei || (el._vei = {})

  // cache
  const exsistingInvoker = invokers[rawName]

  if (nextValue && exsistingInvoker) {
    exsistingInvoker.value = nextValue
  } else {
    const name = rawName.slice(2).toLocaleLowerCase()

    if (nextValue) {
      // bind new event and cache
      const invoker = (invokers[rawName] = createInvoker(nextValue))
      el.addEventListener(name, invoker)
    } else if (exsistingInvoker) {
      // remove
      el.removeEventListener(name, exsistingInvoker)
      invokers[rawName] = undefined
    }
  }
}
```

> 在绑定事件的时候，绑定一个伪造的事件处理函数 invoker，把真正的事件处理函数设置为invoker.value 属性的值

### 操作属性
```ts [patchAttr]
export function patchAttr(el: Element, key: string, value: any) {
  if (value == null) {
    el.removeAttribute(key)
  } else {
    el.setAttribute(key, value)
  }
}
```

## 创建渲染器

至此，渲染选项就准备好了。稍后将虚拟 DOM 转化成真实 DOM 会调用这些方法

```ts
import { nodeOps } from "./nodeOps"
import { patchProp } from "./patchProp"

const renderOptions = Object.assign({ patchProp }, nodeOps);

createRenderer(renderOptions).render(
    h('h1','hello world'),
    document.getElementById('app')
);
```