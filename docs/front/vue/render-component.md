
# 组件的挂载流程

[[toc]]

主要方法
  - mountComponent
    - createComponentInstance
    - setupComponent
    - setupRenderEffect
  - updateComponent

组件需要提供一个 render 函数，渲染函数需要返回虚拟DOM。也可以是 setup 函数，返回生成虚拟节点函数（下一节会详细探讨）
```ts
const VueComponent = {
  data(){
      return {
        age: 13
      } 
  },
  render(){
      return h('p',[h(Text, "Hello"), h('span', this.age)])
  }
}
render(h(VueComponent), document.getElementById('app'))
```

## 添加组件类型

h 方法中传入一个对象说明要渲染的是一个组件。（后续还有其他可能）

```ts [createVNode]
export const createVNode = (type,props,children = null) => {
  const shapeFlag = isString(type)
    ? ShapeFlags.ELEMENT : isObject(type)
    ? ShapeFlags.STATEFUL_COMPONENT : 0;
}
```

## 组件的渲染

组件本质就是 effect
```ts [processComponent]
// patch n2.shapeFlag & ShapeFlags.COMPONENT
const mountComponent = (n2,container,anchor)=>{
  const {render, data = () => ({})} = n2.type;
  const state = reactive(data())
  const instance = {
    state,
    isMounted: false,
    subTree: null,
    update: null,
    vnode: n2
  }

  const componentUpdateFn = () => {
    if(!instance.isMounted){
      const subTree = render.call(state, state);
      patch(null,subTree,container,anchor);
      instance.subTree = subTree
      instance.isMounted = true;
    }else{
      const subTree = render.call(state, state);
      patch(instance.subTree, subTree, container, anchor)
      instance.subTree = subTree
    }
  }

  const effect = new ReactiveEffect(componentUpdateFn)
  const update = instance.update = effect.run.bind(effect);
  update();
}

const processComponent = (n1, n2, container, anchor) => {
  if(n1 == null){
    mountComponent(n2, container, anchor);
  }else{
    // 组件更新逻辑
  }
}
```

## 组件异步渲染

修改调度方法，将更新方法压入到队列中，批量执行

```ts
const componentUpdateFn = () => {
  // ...
  const effect = new ReactiveEffect( // [!code ++]
    componentUpdateFn, // [!code ++]
    () => queueJob(instance.update)  // [!code ++]
  ); // [!code ++]
  // ...
}
```

## 批处理操作

::: code-group
```ts [scheduler.ts]
const queue = []
let isFlushing = false
const resolvedPromise = Promise.resolve()

export function queueJob(job) {
  if (!queue.includes(job)) {
    queue.push(job)
  }

  if (!isFlushing) {
    isFlushing = true
    resolvedPromise.then(() => {
      isFlushing = false
      const copy = queue.slice()
      queue.length = 0
      copy.forEach(job => job())
      copy.length = 0
    })
  }

}

//类似浏览器的事件环：(同步任务, 微任务清空, 宏任务拿取一个执行)
// 一轮一轮，执行过程中还会新增新的任务，先缓存入队列中

const queue = []
const promiseResolve = Promise.resolve()
function queueJob(job) {
  if (!queue.includes(job)) {
    queue.push(job)
  }

  if(!isFlushing) {
    isFlushing = true

    promiseResolve.then(() => {
      isFlushing = false
      const copy = queue.slice(0)
      queue.length = 0
      copy.forEach(job => job())
      copy.length = 0
    })
  }
}
```
:::

## 组件Props、Attrs实现

- 都是父级传给子组件的属性
- 没有定义在 `component.props` 中的属性将存储到 `attrs` 对象中

```ts [example]
let { createRenderer, h, render, Text, Fragment } = VueRuntimeDOM

const VueComponent  = { 
  data(){
    return { name:'Stella', age: 30 }
  },
  props:{
    address: String,
  },
  render(){ 
    // render.call(proxy, state) in mountComponent
    return h('p',[`${this.name} is ${this.age} years old this year, `,`${this.address}`,`${this.$attrs.a}、${this.$attrs.b}`]);
  }
}
render(h(VueComponent, { address:'Wuhan', a: 'Jiangxia', b: 'Canglong District' }),app);
```

initProps

- 创建组件时，type 为包含 render, data, setup 可选属性的对象。
- pinia 源码就是 reactive({})  作为组件的状态

::: code-group
```ts{10-12} [mountComponent]
const mountComponent = (vnode, container) => {
  const { data = () => ({}), render, props: propsOptions = {} } = vnode.type
  const state = reactive(data())
  const instance = {
    state,
    vnode, // virtual node
    subTree: null, // component content
    isMounted: false,
    update: null,
    propsOptions, // later divided into attrs and props
    attrs: {},
    props: {}
  }

  vnode.component = instance
  initProps(instance, vnode.props)
}
```

```ts{9-13} [initProps]
export function initProps(instance, rawProps){
  const props = {};
  const attrs = {};
  // 获取组件用户的配置
  const options = instance.propsOptions || {};
  if(rawProps){
    for(let key in rawProps){
      const value = rawProps[key];
      if( key in options){
        props[key] = value;
      }else{
        attrs[key] = value
      }
    }
  }
  instance.props = reactive(props); // 这里应该用shallowReactive，遵循单向数据流原则
  instance.attrs = attrs;
}
```
:::

> `vnode.props` 为虚虚拟节点提供的 props

## 属性代理

- 组件传入的 `render` 函数，在调用时`.call(instance)`
- render 内部访问 instance 上的data, props, $attrs做了代理
  - `this.a` ->` this.data.a`
  - `this.b` -> `this.props.b`
  - `this.$attrs.c`-> `this.attrs.c`

```ts{28-34}
const publicPropertiesMap = {
  $attrs: i => i.attrs,
}
const mountComponent = (vnode, container) => {
  const instance = {
    // ...
    proxy: null
  }

  vnode.component = instance
  initProps(instance, vnode.props)
  instance.proxy = new Proxy(instance, {
    get(target, key) {
      const { state, props } = target
      if (hasOwn(state, key)]) {
        return state[key]
      } else if (hasOwn(props, state)) {
        return props[key]
      }

      const publicGetter = publicPropertiesMap[key]
      if (publicGetter) {
        return publicGetter(instance)
      }
    },
    set(target, key, value) {
      const { state, props } = props
      if(hasOwn(state, key)){
        state[key] = value;
        return true;
      }else if(hasOwn(props, key)){
        console.warn(`Attempting to mutate prop "${key}". Props are readonly.`)
        return false;
      } 
      return true;
    }
  })
}
```

## 组件流程整合

::: code-group
```ts [mountComponent]
const mountComponent = (vnode,container,anchor) =>{
  // 1) 创建实例
  const instance = vnode.component = createComponentInstance(vnode);
  // 2) 给实例赋值
  setupComponent(instance)
  // 3) 创建渲染effect及更新
  setupRenderEffect(instance, container);
}
```

```ts [createComponentInstance]
export function createComponentInstance(vnode){
  const instance = { // 组件的实例
    data: null,
    vnode,  // vue2的源码中组件的虚拟节点叫$vnode  渲染的内容叫_vnode
    subTree: null, // vue3中vnode组件的虚拟节点   subTree渲染的组件内容
    isMounted: false,
    update: null,
    propsOptions: vnode.type.props,
    attrs: {},
    props: {},
    proxy: null,
  }
  return instance
}
```

```ts [setupComponent]
/**
 * 1. 初始化 props
 * 2. data 转为 reactive 响应式数据，必须是函数
 * 3. ...
 */
export function setupComponent(instance){
  const {props, type, data} = instance.vnode;
  initProps(instance,props);
  instance.proxy = new Proxy(instance, PublicInstanceProxyHandlers);

  if(data){
    if(!isFunction(data)) return console.warn('The data option must be a function.')
    instance.data = reactive(data.call(instance.proxy))
  }
  instance.render = type.render
}
```

```ts [setupRenderEffect]
const setupRenderEffect = (instance,container) =>{
  const {render} = instance
  const componentUpdateFn = () =>{
    if(!instance.isMounted){
      // 组件初始化
      const subTree = render.call(instance.proxy, instance.proxy);
       // 创造了 subTree 的真实节点并且插入了
      patch(null, subTree, container);
      instance.subTree = subTree;
      instance.isMounted = true
    }else{
      // 组件内部更新
      const subTree = render.call(instance.proxy, instance.proxy);
      patch(instance.subTree, subTree, container);
      instance.subTree = subTree;
    }
  }
  const effect = new ReactiveEffect(componentUpdateFn, ()=> queueJob(instance.update))
  let update = instance.update = effect.run.bind(effect);
  update();
}
```

```ts [PublicInstanceProxyHandlers]
// 个人认为这里，是想兼容 vue2 中的 $attrs, $slots...
const publicPropertiesMap = {
  $attrs: i=> i.attrs
}

const PublicInstanceProxyHandlers = {
  get(target,key){
    const {data,props} = target;
    if(data && hasOwn(data,key)){
      return data[key];
    }else if(hasOwn(props,key)){
      return props[key];
    }
    const publicGetter = publicPropertiesMap[key];
    if(publicGetter){
      return publicGetter(target)
    }
  },
  set(target, key, value){
      const {data,props} = target;
      if(data && hasOwn(data,key)){
        data[key] = value;
        return true;
      }else if(hasOwn(props,key)){
        console.warn(`Attempting to mutate prop "${key}". Props are readonly.`)
      return false;
    } 
    return true;
  }
}
```
:::

## 属性更新

两次渲染是同一个组件，属性改变，触发组件更新。

::: code-group
```ts [updateComponent]
```

```ts [example]
```
:::