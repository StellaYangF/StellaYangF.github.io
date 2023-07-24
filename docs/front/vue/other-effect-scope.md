# effectScope 实现原理

[[toc]]

## 基本使用

- `effectScope` 函数返回一个对象，包含 `run` 和 `stop`；
- 在 run 中定义的所有 `effect` 函数，调用 `scope` 对象的 `stop()` 方法之后，所有的依赖都被清除。
- `pinia` 库中也用到 effectScope

```ts
const { effectScope, reactive, effect } = VueReactivity 
const scope = effectScope(true)

scope.run(() => {
  const state = reactive({ age: 13 })
  effect(() => {
    console.log(state.age)
  })
  setTimeout(() => {
    state.age++
  }, 1000)
})

scope.stop()
```

## 收集 effect

```ts [recordEffectScope]
export function effectScope() {
  return new EffectScope()
}

export let activeEffectScope

class EffectScope{
  active = true
  effects = []
  parent
}

export function recordEffectScope(effect){
  if(activeEffectScope && activeEffectScope.active){ 
      activeEffectScope.effects.push(effect)
  }
}

export class ReactiveEffect {
  public parent = null
  public deps = []
  public active = true
  constructor(public fn, public scheduler?){
    recordEffectScope(this)
  } 
}
```

## 实现 stop, run 方法

```ts
class EffectScope{
  active = true
  effects = []
  parent = null
  run(fn){
    if(this.active){
      try{
        activeEffectScope = this
        return fn()
      }finally{
        activeEffectScope = this.parent
      }
    }
  }
  stop(){
    if(this.active){
      // 调用stop时依次调用effect中的stop方法
      for (let i = 0, l = this.effects.length i < l i++) {
        this.effects[i].stop()
      }
      this.active = false
    }
  }
}

```

## 独立 effectScope

```ts
const scope = effectScope()
scope.run(() => {
  const state = reactive({age:13})
  effect(() => {
    console.log(state.age)
  })
  setTimeout(() => {
    state.age++
  },1000)
  const innerScope = effectScope(true)
  innerScope.run(() => {
    const state = reactive({age:13})
    effect(() => {
        console.log(state.age)
    })
    setTimeout(() => {
        state.age++
    },1000)
  })
})
scope.stop()
```

```ts
class EffectScope{ 
  scopes = null
  constructor(detached = false){
    if(!detached && activeEffectScope){
      // 不是独立的，父级会收集
      this.parent = activeEffectScope
      (activeEffectScope.scopes || (activeEffectScope.scopes = [])).push(this)
    }
  }
  if (this.scopes) {
    // stop时也要清理存储的 effectScope
    for (let i = 0, l = this.scopes.length i < l i++) {
      this.scopes[i].stop()
    }
  }
}
```