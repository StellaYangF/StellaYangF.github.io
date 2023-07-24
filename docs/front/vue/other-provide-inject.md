# provide & inject 实现原理

[[toc]]

## 基本使用

```ts
const { h, render, reactive, provide, inject } = VueRuntimeDOM
const My  = {
  setup(){
    const name = inject('name')
    return { name }
  },
  render(){
    return h('div', this.name)
  }
}
const VueComponent = {
  setup(){
      const state = reactive({ name: 'stella' })
      provide('name', state.name)
      setTimeout(() => {
        state.name = 'vivian'
      }, 1000)
  },
  render(){
      return h(My)
  }
}
render(h(VueComponent), app)
```

> 创建实例时会采用父组件的 provides 属性

## 父子关系

```ts
export function createComponentInstance(vnode, parent){
  const instance = {
    data:null,
    parent,
    provides: parent? parent.provides: Object.create(null),
  }
  return instance
}
```

## provide 实现

```ts
export function provide(key, value){
  if(!currentInstance) return
  const parentProvides = currentInstance.parent && currentInstance.parent.provides
  let provides = currentInstance.provides
  if(parentProvides === provides){
    provides = currentInstance.provides = Object.create(provides)
  }
  provides[key] = value
}
```

## inject 
```ts
export function inject(key, defaultValue){
  if(!currentInstance) return
  const provides = currentInstance.parent.provides
  if(provides && (key in provides)){
    return provides[key]
  }else if(arguments.length > 1){
    return defaultValue
  }
}
```