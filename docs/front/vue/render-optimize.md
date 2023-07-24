# patch优化

本节是对组件 diff 补充，引入 `template` 模板编译，实现 SFC(Single File Component)。
前几节实现组件的全量 diff 算法，简单版本，缺陷是对静态节点也做了大量比对，树级嵌套，数据量大时，性能差。
根据[*template-explorer*](https://template-explorer.vuejs.org)，模板编译后的代码，就是一个 `render` 函数，返回虚拟DOM
[[toc]]

## 编译优化

至此，runtime-core 实现的 diff 算法是简版。
但无法避免新旧虚拟 DOM 中无用的比较操作，通过 `patchFlags` 来标记动态内容，可以实现快速 diff 算法

::: code-group
```ts{8} [compiled]
// example中html编译成的代码
const { createElementVNode: _createElementVNode, toDisplayString: _toDisplayString, createTextVNode: _createTextVNode, openBlock: _openBlock, createElementBlock: _createElementBlock } = Vue

return function render(_ctx, _cache, $props, $setup, $data, $options) {
  return (_openBlock(), _createElementBlock("div", null, [
    _createElementVNode("h1", null, "Hello"),
    _createTextVNode(),
    _createElementVNode("span", null, _toDisplayString(_ctx.name), 1 /* TEXT */)
  ]))
}
```

```ts [code]
const VueComponent = {
  setup(){
    let state = reactive({ name: 'world'});
    setTimeout(() => {
      state.name = 'hi'
    }, 1000);
    return {
      ...toRefs(state)
    }
  },
  render(_ctx){
    return (openBlock(),createElementBlock('div',null,[
      createElementVNode("h1", null, "Hello"),
      _createTextVNode(),
      createElementVNode("span", null, toDisplayString(_ctx.name), 1 /* TEXT */)
    ]))
  }
}
render(h(VueComponent),app)
```

```html [example]
<div>
  <h1>Hello</h1>
  <span>{{name}}</span>
</div>
```
:::

## template 生成的 vnode
```ts{9}
{
	type: "div",
  __v_isVNode: true,
  children:[
    {type: 'h1', props: null, key: null, …}
    {type: Symbol(), props: null, key: null, …}
    {type: 'span', props: null, key: null, …}
  ],
  dynamicChildren:[{type: 'span', children: _ctx.name, patchFlag: 1}]
}
```

> 只有 template 编写的文件，会进行 `patchFlag` 标记，虚拟节点增加 `dynamicChildren`。`block` 可以收集所有后代动态节点。后续更新可跳过静态节点，实现靶向更新。


## PatchFlags 动态标识

```ts
export const enum PatchFlags {
  TEXT = 1,                   // 动态文本节点
  CLASS = 1 << 1,             // 动态 class
  STYLE = 1 << 2,             // 动态 style
  PROPS = 1 << 3,             // 除了class\style 动态属性
  FULL_PROPS = 1 << 4,        // 有key，需要完整 diff
  HYDRATE_EVENTS = 1 << 5,    // 挂载过事件
  STABLE_FRAGMENT = 1 << 6,   // 稳定序列，子节点顺序不会发生变化
  KEYED_FRAGMENT = 1 << 7,    // 子节点有 key 的 fragment
  UNKEYED_FRAGMENT = 1 << 8,  // 子节点没有 key 的fragment
  NEED_PATCH = 1 << 9,        // 进行非 props 比较, ref比较
  DYNAMIC_SLOTS = 1 << 10,    // 动态插槽
  DEV_ROOT_FRAGMENT = 1 << 11, 
  HOISTED = -1,               // 表示静态节点，内容变化，不比较儿子
  BAIL = -2                   // 表示 diff 算法应该结束
}
```

## 靶向更新实现

创捷虚拟节点时，标记 PatchFlag，动态收集节点。

::: code-group
```ts [openBlock]
export { createVnode as createElementVNode }
let currentBlock = null
export function openBlock(){
  currentBlock = []
}
export function closeBlock(){
  currentBlock = null
}
export function createElementBlock(type, props?, children?, patchFlag?){
  return setupBlock(createVNode(type, props, children, patchFlag))
}
export function setupBlock(vnode){ 
  vnode.dynamicChildren = currentBlock
  closeBlock()
  return vnode
}
export function createTextVNode(text: ' ', patchFlag = 0) {
  return createVNode(Text, null, text, patchFlag)
}
export function toDisplayString(val){
  // 就是JSON.stringify
  return isString(val)? val : val == null ?
    '' :
    isObject(val) ? 
      JSON.stringify(val) :
      String(val)
}
```

```ts [createVNode]
export const createVNode = (type, props, children = null, patchFlag = 0)=>{
  // ...
  if(currentBlock && vnode.patchFlag > 0){
    currentBlock.push(vnode);
  }
  return vnode;
}
```

```ts [patchElement]
const patchElement = (n1, n2) =>{
  // 复用真实节点
  const el = (n2.el = n1.el)
  const oldProps = n1.props || {}
  const newProps = n2.props || {}
  const { patchFlag } = n2

  if(patchFlag){
    if(patchFlag & PatchFlags.CLASS){
      if(oldProps.class !== newProps.class){
        hostPatchProp(el, 'class', null, newProps.class);
      }
    }
    if (patchFlag & PatchFlags.TEXT) {
      if (n1.children !== n2.children) {
        hostSetElementText(el, n2.children)
      }
    }
  }else{
    patchProps(oldProps,newProps,el);
  }

  if(n2.dynamicChildren){
    patchBlockChildren(n1,n2);
  }else{
    patchChildren(n1,n2,el); 
  }
}
```

```ts [patchBlockChildren]
function patchBlockChildren(n1,n2){
  for(let i = 0 ; i < n2.dynamicChildren.length; i++){
    patchElement(n1.dynamicChildren[i], n2.dynamicChildren[i]);
  }
}
```
:::

## BlockTree

`block` 收集动态节点时忽略虚拟DOM树层级的，需要 `BlockTree` 实现层级关系。
不稳定的结构也要作为 block 来进行处理

::: code-group
```html [example]

<div>
  <p v-if="flag">
    <span>{{a}}</span>
  </p>
  <div v-else>
    <span>{{a}}</span>
  </div>
</div>
```
:::

- 默认根节点 block，切换 `flag` 的状态，无法从 `p` 标签切换到 `div` 标签。
- 理解为，`flag`绑定在p上，忽略内层的span
- 解决方案：就是将不稳定的结构也作为block来进行处理

> 不稳结构就是 DOM 树的结构可能会发生变化，包括 v-if/v-for/Fragment

### v-if

::: code-group
```ts [code]
// 编译后的结果
return function render(_ctx, _cache, $props, $setup, $data, $options) {
  return (_openBlock(), _createElementBlock("div", null, [
    (_ctx.flag)
      ? (_openBlock(), _createElementBlock("div", { key: 0 }, [
          _createElementVNode("span", null, _toDisplayString(_ctx.a), 1 /* TEXT */)
        ]))
      : (_openBlock(), _createElementBlock("div", { key: 1 }, [
          _createElementVNode("p", null, [
            _createElementVNode("span", null, _toDisplayString(_ctx.a), 1 /* TEXT */)
          ])
        ]))
  ]))
}

Block(div)
	Block(div,{key:0})
	Block(div,{key:1})
```

```html [example]
<div>
  <div v-if="flag">
    <span>{{a}}</span>
  </div>
  <div v-else>
    <p><span>{{a}}</span></p>
  </div>
</div>
```
:::

### v-for
随着 v-for 变量的变化也会导致虚拟 DOM 树变得不稳定
编译后的渲染方法，调用 `_renderList`

::: code-group
```ts [code]
export function render(_ctx, _cache, $props, $setup, $data, $options) {
  return (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.fruits, (item) => {
    return (_openBlock(), _createElementBlock("div", null, _toDisplayString(item), 1 /* TEXT */))
  }), 256 /* UNKEYED_FRAGMENT */))
}
```

```html [example]
<div>
  <div v-for="item in fruits">{{ item }}</div>
</div>
```
:::

> 可以试想一下，如果不增加这个 block，前后元素不一致是无法做到靶向更新的。因为 dynamicChildren 中还有可能有其他层级的元素。同时这里还生成了一个 Fragment，因为前后元素个数不一致，所以称之为不稳定序列。

### Fragment

分类：
- STABLE_FRAGMENT
- KEYED_FRAGMENT
- UNKEYED_FRAGMENT
- DEV_ROOT_FRAGMENT

::: code-group
```ts [code]
export function render(_ctx, _cache, $props, $setup, $data, $options) {
  return (_openBlock(), _createElementBlock("div", null, [
    (_openBlock(), _createElementBlock(_Fragment, null, _renderList(3, (item) => {
      return _createElementVNode("div", null, _toDisplayString(item), 1 /* TEXT */)
    }), 64 /* STABLE_FRAGMENT */))
  ]))
}
```

```html [example]
<div>
    <div v-for="item in 3">{{item}}</div>  
</div>
```
:::

## 静态提升

### 提升原理
- 模板直接转化成 render 函数，问题就是每次调用 render 函数都要重新创建虚拟节点。
- 静态提升将静态的节点或者属性提升出去。
- 静态提升是以树为单位，树中节点有动态的不会进行提升。

::: code-group

```ts [code]
export function render(_ctx, _cache, $props, $setup, $data, $options) {
  return (_openBlock(), _createElementBlock("div", null, [
    _createElementVNode("span", null, "hello"),
    _createElementVNode("span", {
      a: "1",
      b: "2"
    }, _toDisplayString(_ctx.name), 1 /* TEXT */),
    _createElementVNode("a", null, [
      _createElementVNode("span", null, _toDisplayString(_ctx.age), 1 /* TEXT */)
    ])
  ]))
}
```
```html [example]
<div>
  <span>hello</span> 
  <span a=1 b=2>{{ name }}</span>
  <a>
    <span>{{ age }}</span>
  </a>
</div>
```

```ts [hoisted]
const _hoisted_1 = /*#__PURE__*/_createElementVNode("span", null, "hello", -1 /* HOISTED */)
const _hoisted_2 = {
  a: "1",
  b: "2"
}

export function render(_ctx, _cache, $props, $setup, $data, $options) {
  return (_openBlock(), _createElementBlock("div", null, [
    _hoisted_1,
    _createElementVNode("span", _hoisted_2, _toDisplayString(_ctx.name), 1 /* TEXT */),
    _createElementVNode("a", null, [
      _createElementVNode("span", null, _toDisplayString(_ctx.age), 1 /* TEXT */)
    ])
  ]))
}
```
:::

### 预字符串化

静态提升的节点都是静态的，将提升出来的节点字符串化。
当连续静态节点超过20个时，会将静态节点序列化为字符串。

::: code-group
```ts [code]
const _hoisted_1 = /*#__PURE__*/_createStaticVNode("<span>....</span>", 20)
```

```html [example]
<div>
  <span></span>
      ...
      ...
  <span></span>
</div>
```

:::

### 缓存函数

::: code-group
```ts [code]
// 每次调用render的时都要创建新函数
export function render(_ctx, _cache, $props, $setup, $data, $options) {
  return (_openBlock(), _createElementBlock("div", {
    onClick: e=>_ctx.v = e.target.value
  }, null, 8 /* PROPS */, ["onClick"]))
}
```

```ts [cache]
// 开启函数缓存后,函数会被缓存起来，后续可以直接使用
export function render(_ctx, _cache, $props, $setup, $data, $options) {
  return (_openBlock(), _createElementBlock("div", {
    onClick: _cache[0] || (_cache[0] = e => _ctx.v = e.target.value)
  }))
}
```

```html [example]
<div @click="e=>v=e.target.value"></div>
```
:::