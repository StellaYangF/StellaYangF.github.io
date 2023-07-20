# runtime-core

[[toc]]
runtime-core 不关心运行平台。

## 创建 runtime-core 包

::: code-group
```ts [runtime-core/package.json]
{
  "name": "@vue/runtime-core",
  "version": "1.0.0",
  "description": "runtime-core",
  "main": "index.js",
  "module": "dist/runtime-core.esm-bundler.js",
  "unpkg": "dist/runtime-core.global.js",
  "buildOptions": {
    "name": "VueRuntimeCore",
    "formats": [
      "esm-bundler",
      "cjs"
    ]
  },
  "dependencies": { // [!code ++]
    "@vue/reactivity": "workspace:^1.0.0", // [!code ++]
    "@vue/shared": "workspace:^1.0.0" // [!code ++]
  } // [!code ++]
}
```

```cmd [add dependencies]
pnpm install @vue/shared@workspace @vue/reactivity@workspace --filter @vue/runtime-core
```
:::

## 虚拟节点的实现

### ShapeFlags

通过组合可以描述虚拟节点的类型


```ts
export const enum ShapeFlags {
  ELEMENT = 1, // 元素
  FUNCTION_COMPONENT = 1 << 1, // 函数式组件
  STATEFUL_COMPONENT = 1 << 2, // 普通状态组件
  TEXT_CHILDREN = 1 << 3, // 子元素为文本
  ARRAY_CHILDREN = 1 << 4, // 子元素为数组
  SLOTS_CHILDREN = 1 << 5, // 组件插槽
  TELEPORT = 1 << 6, // 传送门组件
  SUSPENSE = 1 << 7, // 异步加载组件
  COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8, // keep-alive
  COMPONENT_KEPT_ALIVE = 1 << 9, // 激活的 keep-alive
  COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTION_COMPONENT
}

/**
 * ~  取反-> 01互换
 * |  或  -> 00才是0
 * &  与  -> 11才是1
 * ^  异或-> 两位两同0，相异1
 */
```

### createVNode
```ts
export function isVNode(value: any){
  return value ? value.__v_isVNode === true : false
}
export const createVNode = (type, props, children = null)=>{
  const shapeFlag = isString(type) ? ShapeFlags.ELEMENT : 0;
  const vnode = {
    __v_isVNode: true,
    type,
    props,
    key: props && props['key'],
    el: null,
    children,
    shapeFlag
  }
  if(children){
    let type = 0;
    if(Array.isArray(children)){
      type = ShapeFlags.ARRAY_CHILDREN;
    }else{
      children = String(children);
      type = ShapeFlags.TEXT_CHILDREN
    }
    vnode.shapeFlag |= type
    // 如果shapeFlag为9 说明元素中包含一个文本
    // 如果shapeFlag为17 说明元素中有多个子节点
  }
  return vnode;
}
```
> createVNode的写法比较死板，`h` 让他变的更灵活些


### h

```ts
export function h(type, propsOrChildren?, children?) {
  const l = arguments.length;

  if (l === 2) {
    // 只有属性，或者一个元素儿子的时候
    if (isObject(propsOrChildren) && !Array.isArray(propsOrChildren)) {
      if (isVNode(propsOrChildren)) {
        // h('div', h('span'))
        return createVNode(type, null, [propsOrChildren])
      }
      // h('div',{ style: { color: 'red' } });
      return createVNode(type, propsOrChildren);  
    } else {
      // 传递儿子列表的情况
      // h('div',null,[h('span'),h('span')])
      return createVNode(type, null, propsOrChildren); 
    }
  }else{
    if(l > 3){
      // 超过3个除了前两个都是儿子
      children = Array.prototype.slice.call(arguments,2);
    } else if( l === 3 && isVNode(children)){
      // 儿子是元素将其包装成 h('div',null,[h('span')])
      children = [children]; 
    }
    // h('div', null, 'hello')
    return createVNode(type, propsOrChildren, children)
  }
}
// 注意子节点是：数组、文本、null
```

### createRenderer

render方法就是采用 runtime-dom 中提供的方法将虚拟节点转化成对应平台的真实节点渲染到指定容器中。

```ts
export function createRenderer(options){
  const {
    insert: hostInsert,
    remove: hostRemove,
    patchProp: hostPatchProp,
    createElement: hostCreateElement,
    createText: hostCreateText,
    setText: hostSetText,
    setElementText: hostSetElementText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
  } = options

  const patch = (n1, n2, container) => {
    // 初始化和 diff 算法都在这里
  }
  
  const render = (vnode, container) =>{
    if(vnode == null){
      if(container._vnode){
        // 卸载
      }
    }else{
      // 初始化和更新 diff
      patch(container._vnode || null, vnode, container);
    }
    // 虚拟节点放在 container._vnode
    container._vnode = vnode;
  }

  return {
      render
  }
}
```

### 创建真实节点

```ts
const mountChildren = (children, container) =>{
  for(let i = 0; i < children.length; i++){
    patch(null, children[i], container);
  }
}

const mountElement = (vnode, container) =>{
  const { type, props, shapeFlag } = vnode
  // 创建真实元素，挂载到虚拟节点上
  let el = vnode.el = hostCreateElement(type);
  if(props){
    for(const key in props){
      // 更新元素属性
      hostPatchProp(el, key, null, props[key]); 
    }
  }
  if(shapeFlag & ShapeFlags.TEXT_CHILDREN){
    // 文本
    hostSetElementText(el, vnode.children);
  }else if(shapeFlag & ShapeFlags.ARRAY_CHILDREN){
    // 多个儿子
    mountChildren(vnode.children, el);
  }
  // 插入到容器中
  hostInsert(el, container);
}

const patch = (n1, n2, container) => {
  if(n1 == n2){ // [!code ++]
    return  // [!code ++]
  } // [!code ++]
  if(n1 == null){ // 初始化的情况 // [!code ++]
    mountElement(n2, container);  // [!code ++]
  }else{ // [!code ++]
    // diff算法
  } // [!code ++]
}
```

### 卸载DOM

::: code-group
```ts [unmount]
const unmount = (vnode) => { // [!code ++]
  hostRemove(vnode.el) // [!code ++]
} // [!code ++]

const render = (vnode, container) => {
  if(vnode == null){
    if(container._vnode){ // [!code ++]
      unmount(container._vnode); // [!code ++]
    } // [!code ++]
  }else{
    patch(container._vnode || null, vnode, container);
  }
  container._vnode = vnode;
}
```

```ts [example]
createRenderer(renderOptions)
  .render(null, document.getElementById('app'));
```
:::

