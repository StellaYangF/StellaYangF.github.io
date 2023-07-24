# 函数式组件实现原理

[[toc]]

Vue3 新增组件，将制定内容渲染到制定容器中。
默认内容都是渲染到元素 app 内，我们可以将其渲染到任意节点 
传送门

## 基本用法
```ts
render(h(Teleport, { to: '#root' }, [123,456]), app)
```

## shapeFlag 类型

```ts
const shapeFlag = isString(type)  
  ? ShapeFlags.ELEMENT: isTeleport(type)
  ? ShapeFlags.TELEPORT: isObject(type)
  ? ShapeFlags.STATEFUL_COMPONENT : isFunction(type) 
  ? ShapeFlags.FUNCTIONAL_COMPONENT: 0
```

## 组件挂载

```ts
if(shapeFlag & ShapeFlags.TELEPORT){
  type.process(n1, n2, container, anchor, {
    mountChildren,
    patchChildren,
    move(vnode, container, anchor){
      hostInsert(vnode.component ? vnode.component.subTree.el : vnode.el, container, anchor)
    }
  })
}
```

```ts
export const TeleportImpl = {
  __isTeleport: true,
  process(n1,n2,container,anchor,internals){
    let { mountChildren, patchChildren, move} = internals
    if(!n1){
      const target = (n2.target = document.querySelector(n2.props.to))
      if(target){
        mountChildren(n2.children, target, anchor)
      }
  }else{
      patchChildren(n1, n2, container)
      if(n2.props.to !== n1.props.to){
        const nextTarget = document.querySelector(n2.props.to)
        n2.children.forEach(child => move(child, nextTarget, anchor))
      }
    }
  }
}
export const isTeleport = (type) => type.__isTeleport
```