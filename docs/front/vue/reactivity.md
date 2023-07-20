# 响应式模块

[[toc]]

## 数据劫持

- Vue2 使用 `defineProperty` 来进行数据的劫持, 需要对属性进行重写添加 `getter` 及 `setter` 性能差
- 当新增属性和删除属性时无法监控变化。需要通过 `$set`、`$delete` 实现
- 数组不采用 `defineProperty` 来进行劫持 （浪费性能，对所有索引进行劫持会造成性能浪费）需要对数组单独进行处理

> Vue3 中使用 `Proxy` 来实现响应式数据变化。从而解决了上述问题。

## CompositionAPI

- 在 Vue2 中采用的是 `OptionsAPI`, 用户提供的 data, props, methods, computed, watch等属性 (用户编写复杂业务逻辑会出现反复横跳问题)
- Vue2中所有的属性都是通过this访问，this存在指向明确问题
- Vue2中很多未使用方法或属性依旧会被打包，并且所有全局API都在Vue对象上公开。Composition API对 tree-shaking 更加友好，代码也更容易压缩。
- 组件逻辑共享问题， Vue2 采用mixins 实现组件之间的逻辑共享； 但是会有数据来源不明确，命名冲突等问题。 Vue3采用CompositionAPI 提取公共逻辑非常方便

> 简单的组件仍然可以采用 OptionsAPI 进行编写，compositionAPI 在复杂的逻辑中有着明显的优势。`reactivity` 模块中就包含了很多我们经常使用到的 API 例如：`computed`、`reactive`、`ref`、`effect`等

## reactive 函数

reactive 方法会将对象变成 proxy 对象，effect 中使用 reactive 对象时会进行依赖收集，稍后属性变化时会重新执行 effect 函数

::: code-group
```ts [reactivity/src/reactive.ts]
import { isObject } from "@vue/shared"

 // 缓存列表
const reactiveMap = new WeakMap()

function createReactiveObject(target: object, isReadonly: boolean) {
  // 1. 只代理对象，简单数据不会代理，可通过 ref 代理
  if (!isObject(target)) {
    return target
  }
   // 2. 如果已经代理过则直接返回代理后的对象
  const exisitingProxy = reactiveMap.get(target) 
  if (exisitingProxy) {
    return exisitingProxy
  }
  // 3. 如果传入的是被代理后的对象
  if(target[ReactiveFlags.IS_REACTIVE]){
    return target
  }

  const proxy = new Proxy(target, mutableHandlers) 
  reactiveMap.set(target,proxy)

  return proxy
}

// core function
export function reactive(target: object) {
  return createReactiveObject(target, false)
}

export function shallowReactive(target: object) {
  return createReactiveObject(target, false)
}
export function readonly(target: object) {
  return createReactiveObject(target, true)
}
export function shallowReadonly(target: object) {
  return createReactiveObject(target, true)
}
```

```ts [reactivity/src/baseHandlers.ts]
const mutableHandlers: ProxyHandler<object> = {
  get(target, key, receiver) {
    // 在 get 中增加标识，当获取 IS_REACTIVE 时返回 true
    // 避免重复代理 proxy 对象
    if(key === ReactiveFlags.IS_REACTIVE){ 
      return true
    }
    // 取值就做依赖收集
    const res = Reflect.get(target, key, receiver)
    return res
  },
  set(target, key, value, receiver) {
    // 赋值的时候重新触发 effect 执行
    const result = Reflect.set(target, key, value, receiver)
    return result
  }
}
```

```ts [shared/src/index.ts]
export function isObject(value: unknown) : value is Record<any,any> {
  return typeof value === 'object' && value !== null
}
```

:::

> 这里必须要使用 Reflect 进行操作，保证 this 指向永远指向代理对象
```js
const user = {
  name: 'Stella',
  get num(){
    return this.name
  }
}
let p = new Proxy(user,{
  get(target, key, receiver){
      console.log(key)
      return Reflect.get(target, key, receiver) // [!code --]
      return target[key] // [!code ++]
  }
})
p.name

// 打印结果
// name
// 不会打印 num
// 第11行代码，target指向的还是 user 对象，而不是代理对象
// 尽管 num 是依赖 name 值，也不会触发 proxy中的get拦截器。

// 第10行，使用 Reflect 进行反射，就会将 user.num 内部中的 this 指向代理后的对象

```


## effect 函数

实际开发中，可以知道 template 模板编译之后，每一个组件就是一个 effect。

::: code-group
```ts [reactivity/src/effect.ts]
// 当前正在执行的effect
export let activeEffect = undefined

class ReactiveEffect {
  active = true
  // 收集 effect 中使用到的属性
  deps = []
  parent = undefined
  constructor(public fn) { }
  run() {
    if (!this.active) {
      // 不是激活状态
      return this.fn()
    }
    try {
      // 当前的effect就是他的父亲
      this.parent = activeEffect
      // 设置成正在激活的是当前 effect
      activeEffect = this
      // reactive 代理后对象取值，只有 activeEffect 才会收集依赖
      return this.fn()
    } finally {
      // 执行完毕后还原 activeEffect
      activeEffect = this.parent
      this.parent = undefined
    }
  }
}
export function effect(fn, options?) {
  // 创建响应式 effect
  const _effect = new ReactiveEffect(fn) 
  // 让响应式 effect 默认执行，收集依赖
  _effect.run() 
}
```

```ts [reactivity/src/baseHandlers.ts]
{
  get(target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true
    }
    const res = Reflect.get(target, key, receiver)
    // 依赖收集 
    track(target, 'get', key)  // [!code ++]
    return res
  }
}
```

```ts [reactivity/src/effect.ts]
// 记录依赖关系
const targetMap = new WeakMap()

export function track(target, type, key) {
  if (activeEffect) {
    // { p: prop }
    let depsMap = targetMap.get(target)
    if (!depsMap) {
      targetMap.set(target, (depsMap = new Map()))
    }
    let dep = depsMap.get(key)
    if (!dep) {
      // {p: { prop :[ dep, dep ]}}
      depsMap.set(key, (dep = new Set()))
    }
    let shouldTrack = !dep.has(activeEffect)
    if (shouldTrack) {
      dep.add(activeEffect)
      // 让 effect 记住 dep，这样后续可以用于清理
      activeEffect.deps.push(dep)
    }
  }
}
```
:::

## 触发更新

::: code-group
```ts [reactivity/src/baseHandlers.ts]
{
  set(target, key, value, receiver) {
    let oldValue = target[key]
    const result = Reflect.set(target, key, value, receiver)
    if (oldValue !== value) { // [!code ++]
        trigger(target, 'set', key, value, oldValue) // [!code ++]
    } // [!code ++]
    return result
}
}
```

```js{9-10} [reactivity/src/effect.ts]
export function trigger(target, type, key?, newValue?, oldValue?) {
  // 获取对应的映射表
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    return
  }
  const effects = depsMap.get(key)
  effects && effects.forEach(effect => {
    // 防止循环
    if (effect !== activeEffect) effect.run()
  })
}
```
:::

## 清除依赖

在渲染时要避免副作用函数产生的遗留

::: code-group
```js [example.js]
const state = reactive({ flag: true, name: 'Stella', age: 30 })
// 副作用函数 (effect 执行渲染了页面)
effect(() => {
  console.log('render')
  document.body.innerHTML = state.flag ? state.name : state.age
})
setTimeout(() => {
  state.flag = false
  setTimeout(() => {
      console.log('修改name，原则上不更新')
      state.name = 'Yang'
  }, 1000)
}, 1000)

// 实际上过了2s，flag 变更后，effect.run 还是执行了
// 需要对已收集过依赖的 name 属性进行清除。

```

```ts [reactivity/src/effect.ts]
function cleanupEffect(effect) { // [!code ++]
  // 清理effect // [!code ++]
  const { deps } = effect // [!code ++]
  for (let i = 0 i < deps.length i++) { // [!code ++]
    deps[i].delete(effect) // [!code ++]
  } // [!code ++]
  effect.deps.length = 0 // [!code ++]
} // [!code ++]

class ReactiveEffect {
    active = true
  deps = []
  parent = undefined
  constructor(public fn) { }
  run() {
    try {
      this.parent = activeEffect
      activeEffect = this
      cleanupEffect(this) // [!code ++]
      // 先清理在运行
      return this.fn()
    }
  }
}
```
:::

> 这里要注意的是：触发时会进行清理操作（清理effect），在重新进行收集（收集effect）。在循环过程中会导致死循环。


## effect 失活
```ts
export class ReactiveEffect {
  stop(){ // [!code ++]
    if(this.active){  // [!code ++]
      cleanupEffect(this) // [!code ++]
      this.active = false // [!code ++]
    } // [!code ++]
  } // [!code ++]
}
export function effect(fn, options?) {
  const _effect = new ReactiveEffect(fn) 
  _effect.run()

  const runner = _effect.run.bind(_effect) // [!code ++]
  runner.effect = _effect // [!code ++]
  // 返回runner，用户调用 runner.stop 可以将 effect 置为失活态
  return runner  // [!code ++]
}
```

## 调度执行

trigger 触发时，可以自己决定副作用函数执行的时机、次数、及执行方式

```ts
export function effect(fn, options:any = {}) {
    const _effect = new ReactiveEffect(fn);  // [!code --] 
    const _effect = new ReactiveEffect(fn, options.scheduler);  // [!code ++]  
    _effect.run();
    const runner = _effect.run.bind(_effect);
    runner.effect = _effect;
    return runner;
}

export function trigger(target, type, key?, newValue?, oldValue?) {
  const depsMap = targetMap.get(target);
  if (!depsMap) {
    return
  }
  let effects = depsMap.get(key);
  if (effects) {
    effects = new Set(effects);
    for (const effect of effects) {
      if (effect !== activeEffect) { 
          effect.run(); // [!code --]
        // 如果有调度函数则执行调度函数
        if(effect.scheduler){ // [!code ++]
          effect.scheduler() // [!code ++]
        }else{ // [!code ++]
          effect.run();  // [!code ++]
        } // [!code ++]
      }
    }
  }
}
```

## 深度代理

```ts
 get(target, key, receiver) {
  if (key === ReactiveFlags.IS_REACTIVE) {
    return true;
  }
  const res = Reflect.get(target, key, receiver);
  track(target, 'get', key);

  if(isObject(res)){ // [!code ++]
    return reactive(res); // [!code ++]
  } // [!code ++]
  return res;
}
```

> 当取值时返回的值是对象，则返回这个对象的代理对象，从而实现深度代理