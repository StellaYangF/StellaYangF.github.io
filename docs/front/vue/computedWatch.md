# computed & watch

## computed 实现原理

- 接受一个 getter 函数，并根据 getter 的返回值返回一个不可变的响应式 ref 对象。
- 创建ReactiveEffect时，传入scheduler函数，稍后依赖的属性变化时调用此方法。

::: code-group
```ts [computed]
import { isFunction } from "@vue/shared";
import { activeEffect, ReactiveEffect, trackEffects, triggerEffects } from "./effect";

class ComputedRefImpl {
    public effect;
    public _value;
    public dep;
    public _dirty = true;
    constructor(getter,public setter) {
      this.effect = new ReactiveEffect(getter,() => { 
        if(!this._dirty){
          // 依赖的值变化更新dirty并触发更新
          this._dirty = true;
          triggerEffects(this.dep)
        }
      });
    }
    get value(){
      // 取值的时候进行依赖收集
      if(activeEffect){
        // effect 中，才会收集
        trackEffects(this.dep || (this.dep = new Set));
      }
      if(this._dirty){
        // 如果是脏值, 执行函数，dirty更新为false
        this._dirty = false;
        this._value = this.effect.run(); 
      }
      return this._value; 
    }
    set value(newValue){
      this.setter(newValue)
    }
}
export function computed(getterOrOptions) {
    const onlyGetter = isFunction(getterOrOptions);
    let getter;
    let setter;
    if (onlyGetter) {
      getter = getterOrOptions;
      setter = () => { }
    } else {
      getter = getterOrOptions.get;
      setter = getterOrOptions.set;
    }
    // 创建计算属性实例
    return new ComputedRefImpl(getter, setter)
}
```

```ts [effect.ts]
// 提取收集依赖、触发更新方法
export function triggerEffects(effects) { 
  effects = new Set(effects);·
  for (const effect of effects) {
    if (effect !== activeEffect) {
      if (effect.scheduler) {
        effect.scheduler()
      } else {
        effect.run();
      }
    }
  }
}
export function trackEffects(dep) {
  let shouldTrack = !dep.has(activeEffect)
  if (shouldTrack) {
    dep.add(activeEffect);
    activeEffect.deps.push(dep); 
  }
}
```
:::

> computed 计算属性本质就是对象，初始化时，内部维护一个 effect，依赖的值和该 effect 建立映射关系。

## watch 实现原理
watch的核心就是观测一个响应式数据，当数据变化时通知并执行回调 （那也就是说它本身就是一个effect）


### 检测响应式对象
::: code-group
```ts [watch]
export function isReactive(value){
  return !!(value && value[ReactiveFlags.IS_REACTIVE])
}

export function watch(source, cb){
  let getter;

  if(isReactive(source)){
    // 如果是响应式对象
    // 包装成 effect 对应的fn, 函数内部进行遍历达到依赖收集的目的
    getter = () => traverse(source)
  }
  let oldValue;

  const job = () =>{
    // 值变化时再次运行 effect 函数，获取新值
    const newValue = effect.run(); 
    cb(newValue, oldValue);
    oldValue = newValue
  }

  const effect = new ReactiveEffect(getter, job)
  // 运行保存老值
  oldValue = effect.run();
}
```

```ts [traverse]
// 监控响应式对象，性能差
function traverse(value, seen = new Set()){
  if(!isObject(value)){
    return value
  }

  if(seen.has(value)){
    return value;
  }

  seen.add(value);

  // 递归访问属性用于依赖收集
  for(const k in value){
    traverse(value[k], seen)
  }

  return value
}
```

```ts [example]
// 监测一个响应式值的变化
watch(state,(oldValue,newValue) => {
  console.log(oldValue,newValue)
})
```
:::

### 监测 getter 函数

```ts [watch]
export function watch(source,cb){
  let getter;
  if(isReactive(source)){
    getter = () => traverse(source)
  }else if(isFunction(source)){ // [!code ++]
    getter = source // [!code ++]
  } // [!code ++]
}
```

### 调度执行时机

```ts
export function watch(source, cb, {immediate} = {} as any){
	const effect = new ReactiveEffect(getter,job)
  // 需要立即执行，则立刻执行任务
  if(immediate){ // [!code ++]
    job(); // [!code ++]
  } // [!code ++]
  oldValue = effect.run(); 
}
```

### watch中cleanup实现

- 场景：用户输入框中，输入信息查询，后端数据返回时间问题，会导致返回数据渲染问题。
- 方案：
  1. 取消请求
  2. 清理定时器
  3. 屏蔽数据（类似防抖操作，最新请求发出时，丢弃上次请求返回值）
  4. `vue2` 中需要自行解决
  5. `vue3` 提供 `onCleanup` 回调函数

::: code-group
```ts [watch]
export function watch(source, cb){
  let getter;

  if(isReactive(source)){
    getter = () => traverse(source)
  }
  let oldValue;

  let cleanup; // [!code ++]
  const onCleanup = fn => { // [!code ++]
    cleanup = fn // [!code ++]
  } // [!code ++]
  
  const job = () => {
    if (cleanup) cleanup() // [!code ++]

    if (cb) {
      const newValue = effect.run()
      cb(newValue, oldValue, onCleanup) // [!code ++]
      oldValue = newValue
    } else {
      effect.run()
    }
  }

  const effect = new ReactiveEffect(getter, job)
  oldValue = effect.run();
```

```ts [example]
// mock backend response
let time = 3000
function getData(input) {
  return new Promise(resolve => {
    setTimeout(() => resolve(input), time -= 1000)
  })
}

const state = reactive({ name: 'Stella', age: 18 })

let arr = []
watch(() => state.age, async function callback (newVal, oldVal, onCleanup) {
  // 屏蔽返回的数据，不进行更新

  // vue2 处理方式
  // 闭包：函数的创建和执行不在一个作用域。
  // debugger 
  // 通过代码调试：
  // 每次更新age值，都会触发 callback 执行，getData 返回的数据需要等待时间
  // 类似防抖操作，下一次请求操作发出时，丢弃上次的返回值

  while(arr.length > 0) {
    let fn = arr.shift()
    fn()
  }

  let flag = true
  arr.push(() => flag = false )
  // vue3 提供 onCleanup
  // let flag = true
  // onCleanup(() => flag = false)

  const res = await getData(newVal)
  flag && (app.innerHTML = res)
})

// 不用 setTimeout 默认批量更新
const timer1 = setTimeout(() => state.age = 19) // 3s后返回
const timer2 = setTimeout(() => state.age = 20) // 2s后返回
const timer3 = setTimeout(() => state.age = 21) // 1s后返回 newVal
```
:::
