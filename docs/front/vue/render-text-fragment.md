# Text & Fragment 渲染

[[toc]]

除了元素虚拟节点之外，Vue3 中还有很多其他类型的虚拟节点，本节先看 Text 和 Fragment 的实现

::: code-group
```ts [patch]
const patch = (n1,n2,container,anchor?) => {
  // ...
  const {type, shapeFlag} = n2;
  switch(type){
    case Text:
      processText(n1,n2,container);
      break;
    case Fragment:
      processFragment(n1,n2,container);
      break;
    default:
      if(shapeFlag & ShapeFlags.ELEMENT){ 
          processElement(n1,n2,container,anchor);
      }
      // ...
  }
}
```

```ts [type]
export const Text = Symbol('Text')
export const Fragment = Symbol('Fragment')
```
:::

## 文本类型

::: code-group

```ts [processText]
const processText = (n1, n2, container)=>{
  if(n1 == null){
    hostInsert((n2.el = hostCreateText(n2.children)),container)
  }else{
    const el = n2.el = n1.el;
    if(n2.children !== n1.children){
      hostSetText(el, n2.children)
    }
  }
}
```

```ts [example]
renderer.render(h(Text,'hello'), document.getElementById('app'))
```
:::

## Fragment类型

::: code-group

```ts [processText]
const processFragment = (n1, n2, container) => {
  if(n1 == null){ 
    mountChildren(n2.children, container);
  }else{
    patchChildren(n1, n2, container);
  }
}
```

```ts [example]
renderer.render(h(Fragment, [h(Text, 'hello'), h(Text,'hello')]),document.getElementById('app'))

```
:::

同时这里要处理下卸载的逻辑，如果是fragment则删除子元素

```ts
const unmount = (vnode) =>{
  if(vnode.type === Fragment){ // [!code ++]
    return unmountChildren(vnode.children) // [!code ++]
  } // [!code ++]
  hostRemove(vnode.el)
}
```