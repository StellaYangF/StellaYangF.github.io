# Ref的概念

- proxy 代理的目标必须是非原始值，所以 reactive 不支持原始值类型。需要将原始值类型进行包装。
- 将原始类型包装成对象, 同时也可以包装对象 进行深层代理

## Ref & ShallowRef

::: code-group
```ts [ref]
function createRef(rawValue, shallow) {
  return new RefImpl(rawValue, shallow);
}

export function ref(value) {
  return createRef(value, false);
}

export function shallowRef(value) {
  return createRef(value, true);
}
```

```ts [RefImpl]
function toReactive(value) {
  return isObject(value) ? reactive(value) : value
}

class RefImpl {
  public _value;
  public dep;
  public __v_isRef = true;
  constructor(public rawValue, public _shallow) {
    // 浅 ref 不需要再次代理
    this._value = _shallow ? rawValue : toReactive(rawValue);
  }

  get value(){
    if(activeEffect){
      trackEffects(this.dep || (this.dep = new Set));
    }
    return this._value;
  }

  set value(newVal){
    if(newVal !== this.rawValue){
      this.rawValue = newVal;
      this._value = this._shallow ? newVal : toReactive(newVal);

      triggerEffects(this.dep);
    }
  }
}
```
:::

## toRef & toRefs

- 将响应式数据中，某个属性转为 ref
- 响应式丢失问题
- 如果将响应式对象展开则会丢失响应式的特性

::: code-group
```ts [ObjectREfImpl]
class ObjectRefImpl {
  public __v_isRef = true
  constructor(public _object, public _key) { }

  get value() {
    return this._object[this._key];
  }

  set value(newVal) {
    this._object[this._key] = newVal;
  }
}

// 将响应式对象中的某个属性转化成ref
export function toRef(object, key) {
    return new ObjectRefImpl(object, key);
}

// 将所有的属性转换成ref
export function toRefs(object) {
  const ret = Array.isArray(object) ? new Array(object.length) : {};
  for (const key in object) {
    ret[key] = toRef(object, key);
  }
  return ret;
}
```

```ts [example]
const state = reactive({name: 'stella', age: 18 })
let person = {...state}

// 解构的时候将所有的属性都转换成ref即可
let person = {...toRefs(state)};
```

:::

## 自动脱 ref

代理对象，帮忙获取.value值

::: code-group
```ts [proxyRefs]
export function proxyRefs(objectWithRefs){
  return new Proxy(objectWithRefs, {

    get(target,key,receiver){
      let v = Reflect.get(target, key, receiver);
      return v.__v_isRef? v.value : v; 
    },

    set(target, key, value, receiver){
      const oldValue = target[key];
      if(oldValue.__v_isRef){
        // 设置的时候如果是ref,则给ref.value赋值
        oldValue.value = value;
        return true
      }else{
        return Reflect.set(target, key, value, receiver)
      }
    }
  })
}
```

```ts [example]
let person = proxyRefs({...toRefs(state)})
```
:::