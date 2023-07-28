# 函数式组件实现原理

[[toc]]

函数的返回值就是虚拟DOM。在 `Vue3` 中，所有的函数式组件都是用普通函数创建的。换句话说，不需要定义 `{ functional: true }` 组件选项。

## 基本使用
```ts
const functionalComponent = (props) => {
	return h('div', 'hello' + props.name)
}

render(h(functionalComponent, {name: 'stella' }), app)
```

## shapeFlag 新增类型

::: code-group
```ts{19-20} [createVNode]
function _createVNode(
  type: VNodeTypes | ClassComponent | typeof NULL_DYNAMIC_COMPONENT,
  props: (Data & VNodeProps) | null = null,
  children: unknown = null,
  patchFlag: number = 0,
  dynamicProps: string[] | null = null,
  isBlockNode = false
): VNode {

  // encode the vnode type information into a bitmap
  const shapeFlag = isString(type)
    ? ShapeFlags.ELEMENT
    : __FEATURE_SUSPENSE__ && isSuspense(type)
    ? ShapeFlags.SUSPENSE
    : isTeleport(type)
    ? ShapeFlags.TELEPORT
    : isObject(type)
    ? ShapeFlags.STATEFUL_COMPONENT
    : isFunction(type)
    ? ShapeFlags.FUNCTIONAL_COMPONENT
    : 0

  return createBaseVNode(
    type,
    props,
    children,
    patchFlag,
    dynamicProps,
    shapeFlag,
    isBlockNode,
    true
  )
}
```

```ts{3} [ShapeFlags]
export const enum ShapeFlags {
  ELEMENT = 1,
  FUNCTIONAL_COMPONENT = 1 << 1,
  STATEFUL_COMPONENT = 1 << 2,
  TEXT_CHILDREN = 1 << 3,
  ARRAY_CHILDREN = 1 << 4,
  SLOTS_CHILDREN = 1 << 5,
  TELEPORT = 1 << 6,
  SUSPENSE = 1 << 7,
  COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8,
  COMPONENT_KEPT_ALIVE = 1 << 9,
  COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT
}
```
:::

## initProps

属性初始化，如果是函数式组件则 `attrs` 就是函数式组件的 `props`

```ts
export function initProps(instance) {
  // ...
  if(instance.vnode.shapeFlag & ShapeFlags.FUNCTIONAL_COMPONENT) {
    instance.attrs = attrs
  }
}
```

## renderComponentRoot

产生 `subTree` 时, 要根据类型做不同的处理

```ts{7}
export function renderComponentRoot(instance) {
  const { render, proxy, vnode, props } = instance
  if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    return render.call(proxy, proxy)
  } else {
    // here is the functional component
    return vnode.type(props)
  }
}

const subTree = renderComponentRoot(instance)
```