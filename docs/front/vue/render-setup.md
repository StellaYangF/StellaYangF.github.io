# 组件 setup 函数

[[toc]]

组件的 render 函数每次更新时都会重新执行，但是 setup 函数只会在组件挂载时执行一次。

- `setup` 函数是 `compositionAPI` 的入口
- 可以在函数内部编写逻辑，解决 vue2 中反复横跳问题
- `setup` 返回函数时为组件的 `render` 函数，返回对象时对象中的数据将暴露给模板使用
- `setup` 中函数的参数为`props、context`
- `setupContext`: `slots`, `emit`, `attrs`, `expose`

::: code-group
```ts [example]
const My = {
  props:{ address: String },
  render(){
    return h('div',this.address)
  }
}
const VueComponent  = { 
    props:{
      address: String
  },
  setup(props){
    const name = ref('stella');
    return {
      name,
      address:props.address
    }
  },
  render (){
    return h(Text, `${this.address}, ${this.name}`)
  }
}
render(h(VueComponent, { address: 'Wuhan' }), app);
```
:::

## setup 函数解析

::: code-group
```ts{12-21} [setupComponent]
/**
 * 1. 初始化 props
 * 2. setup 函数解析
 *  2.1 返回函数：赋值给 instance.render
 *  2.2 返回对象：赋值给 instance.setupState 已经是响应式的，proxyRefs
 * 3. data 响应式数据
 */
export function setupComponent(instance){
  const {props, type} = instance.vnode;
  initProps(instance,props);

  let { setup } = type
  if(setup){
    const setupContext = {};
    const setupResult = setup(instance.props, setupContext);
    if(isFunction(setupResult)){
      instance.render = setupResult;
    }else if(isObject(setupResult)){ // [!code ++]
      instance.setupState = proxyRefs(setupResult); // [!code ++]
    } // [!code ++]
  }

  instance.proxy = new Proxy(instance,PublicInstanceProxyHandlers);
  const data = type.data;
  if(data){
    if(!isFunction(data)) return console.warn('The data option must be a function.')
    instance.data = reactive(data.call(instance.proxy))
  }
  if(!instance.render){ // [!code ++]
    instance.render = type.render // [!code ++]
  } // [!code ++]
}
```
:::

## setupState 新增取值

::: code-group
```ts{8-11} [PublicInstanceProxyHandlers]
const PublicInstanceProxyHandlers = {
  get(target,key){
    const {data,props,setupState} = target;
    if(data && hasOwn(data,key)){
        return data[key];
    }else if(hasOwn(props,key)){
        return props[key];
    }else if(setupState && hasOwn(setupState,key)){
        // setup返回值做代理
        return setupState[key];
    }
    const publicGetter = publicPropertiesMap[key];
    if(publicGetter){
        return publicGetter(target)
    }
  },
  set(target,key,value){
    const {data, props, setupState} = target;
    if(data && hasOwn(data,key)){
        data[key] = value;
        return true;
    }else if(hasOwn(props,key)){
        console.warn(`Attempting to mutate prop "${key}". Props are readonly.`)
        return false;
    } else if(setupState && hasOwn(setupState, key)){ // [!code ++]
      // setup返回值做代理
        setupState[key] = value // [!code ++]
    } // [!code ++]
    return true;
  }
}
```
:::

## emit 实现

::: code-group
```ts [setupComponent]
const setupContext = {
  attrs: instance.attrs,
  emit: (event, ...args) => {
    const eventName = `on${event[0].toUpperCase()}${event.slice(1)}`
    const handler = instance.vnode.props[eventName]
    handler && handler(...args)
  }
}
```

```ts [example]
const VueComponent = {
  setup(props, ctx){
    const handleClick = ()=> {
      ctx.emit('myEvent');
    }
    return () => h('button', { onClick: handleClick }, 'Click me')
  }
}
render(h(VueComponent, { onMyEvent: () => { alert(1000) } }),'app')
```
:::

## slot 实现

::: code-group
```ts [createVNode]
export const createVNode = (type, props, children = null)=>{
  if(children){
    let type = 0;
    if(Array.isArray(children)){
      type = ShapeFlags.ARRAY_CHILDREN
    }else if(isObject(children)){ // [!code ++]
      type = ShapeFlags.SLOTS_CHILDREN // [!code ++]
    }else{
        children = String(children)
      type = ShapeFlags.TEXT_CHILDREN
    }
    vnode.shapeFlag |= type
  }
  return vnode;
}
```

```ts [initSlots]
const publicPropertiesMap = {
  $attrs: i => i.attrs,
  $slots: i => i.slots // [!code ++]
}
function initSlots(instance, children){
  if(instance.vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN){
    instance.slots = children;
  }else{
    instance.slots = {};
  }
}
```

```ts [setupComponent]
export function createComponentInstance(vnode){
  const instance = {
    slots: null // [!code ++]
  }
  return instance
}
export function setupComponent(instance){
  const {props, type, children} = instance.vnode
  initProps(instance, props)
  initSlots(instance, children) [!code ++]
}
```

```ts [example]
const MyComponent = {
  render(){
    return h(Fragment, [
      // 获取插槽渲染
      h('div', [this.$slots.header()]),
      h('div', [this.$slots.body()]),
      h('div', [this.$slots.footer()]),
    ])
  }
}
const VueComponent = {
  setup(){
    return () => h(MyComponent, null, {
      // 渲染组件时传递对应的插槽属性
      header: () => h('p', 'Header'),
      body: () => h('p', 'Body'),
      footer: () => h('p', 'Footer')
    })
}
}
render(h(VueComponent),app)
```
:::

## lifecycle 实现

生命周期需要让当前实例关联对应的生命周期，这样在组件构建过程中就可以调用对应的钩子

组件实例创建前后，`currentInstance` 赋值和清除

::: code-group

```ts [component.ts]
export const setCurrentInstance = (instance) => currentInstance = instance
export const getCurrentInstance= () => currentInstance 
export const unsetCurrentInstance= () => currentInstance = null
```
```ts [componentComponent]
setCurrentInstance(instance);
const setupResult = setup(instance.props, setupContext);
unsetCurrentInstance(null);
```
:::

### 创建生命周期钩子
::: code-group


```ts{11-18} [apiLifecycle]
export const enum LifecycleHooks {
  BEFORE_MOUNT = 'bm',
  MOUNTED = 'm',
  BEFORE_UPDATE = 'bu',
  UPDATED = 'u'
}

function createHook(type){
  return (hook, target = currentInstance) => {
    if(target){
      const hooks = target[type] || (target[type] = []);
      const wrappedHook = () => {
        // 当生命周期调用时 保证currentInstance是正确的
        setCurrentInstance(target);
        hook.call(target); 
        setCurrentInstance(null);
      }
      hooks.push(wrappedHook);
    }
  }
}
export const onBeforeMount = createHook(LifecycleHooks.BEFORE_MOUNT);
export const onMounted = createHook(LifecycleHooks.MOUNTED);
export const onBeforeUpdate = createHook(LifecycleHooks.BEFORE_UPDATE);
export const onUpdated = createHook(LifecycleHooks.UPDATED);
```
:::

### 钩子调用
::: code-group
```ts{3} [componentUpdateFn]
const componentUpdateFn = ()=>{
  if(!instance.isMounted){
    const {bm, m} = instance
    if(bm){ // beforeMount
      invokeArrayFns(bm)
    }
    const subTree = render.call(renderContext,renderContext);
    patch(null,subTree,container,anchor);
    if(m){ // mounted
      invokeArrayFns(m)
    }
    instance.subTree = subTree
    instance.isMounted = true;
  }else{
    let {next,bu,u} = instance;
    if(next){
      updateComponentPreRender(instance,next)
    }
    if(bu){ // beforeUpdate
      invokeArrayFns(bu)
    }
    const subTree = render.call(renderContext,renderContext);
    patch(instance.subTree,subTree,container,anchor)
    if(u){ // updated
      invokeArrayFns(u)
    }
    instance.subTree = subTree
  }
}
```

```ts [invokeArrayFns]
export const invokeArrayFns = (fns) => {
  for (let i = 0; i < fns.length; i++) {
    fns[i]();
  }
}
```
:::