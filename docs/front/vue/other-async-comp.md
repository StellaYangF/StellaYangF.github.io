# 异步组件实现原理

[[toc]]

`defineAsyncComponent` 函数是一个高阶组件，他的返回值是一个包装组件。
此包装组件会根据状态，决定渲染的内容，加载成功后的渲染组件，在未渲染成功时渲染一个占位符节点

## 基本使用

```ts
const asyncComponent = defineAsyncComponent(() => {
  return new Promise(resolve => {
    setTimeout(() => resolve({
      render: () => h('div', 'Hi stella')
    }), 1000)
  })
})
```

## 基本实现
```ts
const Placeholder = h(Fragment, 'placeholder')
export function defineAsyncComponent(loader) {
  let Comp = null

  return {
    setup() {
      const loaded = ref(false)
      loader().then(c => {
        Comp = c
        loaded = true
      })

      return () => loaded.value ? h(Comp) : Placeholder
    }
  }
}
```

## 超时处理 timeout

```ts
const asyncComponent = defineAsyncComponent({
  loader: () => {
    return new Promise(resolve => {
      setTimeout(() => resolve({
        render: () => h('div', 'Hi stella')
      }), 1000)
    })
  },
  timeout: 2000,
  errorComponent: {
    render() => h(Text, 'Error: timeout!')
  }
})
```

```ts {25-32}
const Placeholder = h(Fragment, 'placeholder')
export function defineAsyncComponent(options) {
  if (typeof options === 'function') {
    options = { loader: options }
  }

  const { loader, timeout, errorComponent } = options // [!code ++]
  let Comp = null

  return {
    setup() {
      const loaded = ref(false)
      const error = ref(false) // [!code ++]

      loader().then(c => {
        Comp = c
        loaded = true
      }).catch(err => error.value = true)

      if (timeout) { // [!code ++]
        setTimeout(() => error.value = true, timeout) // [!code ++]
      } // [!code ++]

      return () => {
        if (loaded.value) {
          return h(Comp)
        } else if (error.value && errorComponent) { // [!code ++]
          return h(errorComponent) // [!code ++]
        }

        return Placeholder
      }
    }
  }
}
```

组件卸载的时候需要处理

```ts
const unmount = vnode => {
  const { shapeFlag } = vnode
  if (vnode.type === Fragment) {
    return unmountChildren(vnode.children)
  } else if (shapeFlag & ShapeFlags.COMPONENT) {
    return unmount(vnode.component.subTree)
  }

  hostRemove(vnode.el)
}
```


## loading 处理

```ts
// pseudo code
defineAsyncComponent({
  loader: () => {},
  timeout: 2000,
  errorComponent,
  delay: 1000,
  loadingComponent: {
    render: () => h(Text, 'loading...')
  }
})
```

```ts
const Placeholder = h(Fragment, 'placeholder')
export function defineAsyncComponent(options) {
  if (typeof options === 'function') {
    options = { loader: options }
  }

  const { loader, timeout, errorComponent, delay, loadingComponent } = options
  let Comp = null

  return {
    setup() {
      const loaded = ref(false)
      const error = ref(false)
      const loading = ref(false) // [!code ++]
      let loadingTimer = null // [!code ++]

      if (delay) { // [!code ++]
        loadingTimer = setTimeout(() => loading.value = true, delay) // [!code ++]
      } else { // [!code ++]
        loading.value = true // [!code ++]
      }

      loader().then(c => {
        Comp = c
        loaded = true
      }).catch(err => error.value = true)
        .finally(() => { // [!code ++]
          loading.value = false // [!code ++]
          clearTimeout(loadingTimer) // [!code ++]
          loadingTimer = null // [!code ++]
        }) // [!code ++]

      if (timeout) {
        setTimeout(() => error.value = true, timeout)
      }

      return () => {
        if (loaded.value) {
          return h(Comp)
        } else if (error.value && errorComponent) {
          return h(errorComponent)
        } else if (loading.value && loadingComponent) { // [!code ++]
          return h(loadingComponent) // [!code ++]
        }

        return Placeholder
      }
    }
  }
}
```

## 重试处理

- 失败重试
- 重试次数


```ts
// pseudo code
defineAsyncComponent({
  loader: () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        reject({
          render() {
            return h('div', 'Hi Stella ~')
          }
        })
      }, 3000)
    })
  },
  timeout: 2000,
  errorComponent,
  delay: 1000,
  loadingComponent: {
    render: () => h(Text, 'loading...')
  },
  onError(retry) {
    console.log('Something wrong!')
    retry()
  }
})
```

```ts
const Placeholder = h(Fragment, 'placeholder')
export function defineAsyncComponent(options) {
  if (typeof options === 'function') {
    options = { loader: options }
  }
  const { 
    loader,
    timeout,
    errorComponent,
    delay,
    loadingComponent,
    onError: userOnError // [!code ++]
  } = options
  let Comp = null

  const load = () => { // [!code ++]
    return loader() // [!code ++]
      .catch(err => { // [!code ++]
        if (userOnError) { // [!code ++]
          return new Promise((resolve, reject) => { // [!code ++]
            const retry = () => resolve(load()) // [!code ++]
            const fail = () => reject(err) // [!code ++]
            userOnError(retry, fail) // [!code ++]
          }) // [!code ++]
        } else { // [!code ++]
          throw err // [!code ++]
        } // [!code ++]
      }) // [!code ++]
      .then(c => c) // [!code ++]
  } // [!code ++]

  return {
    setup() {
      const loaded = ref(false)
      const error = ref(false)
      const loading = ref(false)
      let loadingTimer = null

      if (delay) {
        loadingTimer = setTimeout(() => loading.value = true, delay)
      } else {
        loading.value = true
      }

      loader().then(c => { // [!code --]
      load().then(c => { // [!code ++]
        Comp = c
        loaded = true
      }).catch(err => error.value = true)
        .finally(() => {
          loading.value = false
          clearTimeout(loadingTimer)
          loadingTimer = null
        })

      if (timeout) {
        setTimeout(() => error.value = true, timeout)
      }

      return () => {
        if (loaded.value) {
          return h(Comp)
        } else if (error.value && errorComponent) {
          return h(errorComponent)
        } else if (loading.value && loadingComponent) {
          return h(loadingComponent)
        }

        return Placeholder
      }
    }
  }
}
```

## 源码

```ts
export type AsyncComponentResolveResult<T = Component> = T | { default: T } // es modules

export type AsyncComponentLoader<T = any> = () => Promise<
  AsyncComponentResolveResult<T>
>

export interface AsyncComponentOptions<T = any> {
  loader: AsyncComponentLoader<T>
  loadingComponent?: Component
  errorComponent?: Component
  delay?: number
  timeout?: number
  suspensible?: boolean
  onError?: (
    error: Error,
    retry: () => void,
    fail: () => void,
    attempts: number
  ) => any
}

export const isAsyncWrapper = (i: ComponentInternalInstance | VNode): boolean =>
  !!(i.type as ComponentOptions).__asyncLoader

/*! #__NO_SIDE_EFFECTS__ */
export function defineAsyncComponent<
  T extends Component = { new (): ComponentPublicInstance }
>(source: AsyncComponentLoader<T> | AsyncComponentOptions<T>): T {
  if (isFunction(source)) {
    source = { loader: source }
  }

  const {
    loader,
    loadingComponent,
    errorComponent,
    delay = 200,
    timeout, // undefined = never times out
    suspensible = true,
    onError: userOnError
  } = source

  let pendingRequest: Promise<ConcreteComponent> | null = null
  let resolvedComp: ConcreteComponent | undefined

  let retries = 0
  const retry = () => {
    retries++
    pendingRequest = null
    return load()
  }

  const load = (): Promise<ConcreteComponent> => {
    let thisRequest: Promise<ConcreteComponent>
    return (
      pendingRequest ||
      (thisRequest = pendingRequest =
        loader()
          .catch(err => {
            err = err instanceof Error ? err : new Error(String(err))
            if (userOnError) {
              return new Promise((resolve, reject) => {
                const userRetry = () => resolve(retry())
                const userFail = () => reject(err)
                userOnError(err, userRetry, userFail, retries + 1)
              })
            } else {
              throw err
            }
          })
          .then((comp: any) => {
            if (thisRequest !== pendingRequest && pendingRequest) {
              return pendingRequest
            }
            if (__DEV__ && !comp) {
              warn(
                `Async component loader resolved to undefined. ` +
                  `If you are using retry(), make sure to return its return value.`
              )
            }
            // interop module default
            if (
              comp &&
              (comp.__esModule || comp[Symbol.toStringTag] === 'Module')
            ) {
              comp = comp.default
            }
            if (__DEV__ && comp && !isObject(comp) && !isFunction(comp)) {
              throw new Error(`Invalid async component load result: ${comp}`)
            }
            resolvedComp = comp
            return comp
          }))
    )
  }

  return defineComponent({
    name: 'AsyncComponentWrapper',

    __asyncLoader: load,

    get __asyncResolved() {
      return resolvedComp
    },

    setup() {
      const instance = currentInstance!

      // already resolved
      if (resolvedComp) {
        return () => createInnerComp(resolvedComp!, instance)
      }

      const onError = (err: Error) => {
        pendingRequest = null
        handleError(
          err,
          instance,
          ErrorCodes.ASYNC_COMPONENT_LOADER,
          !errorComponent /* do not throw in dev if user provided error component */
        )
      }

      // suspense-controlled or SSR.
      if (
        (__FEATURE_SUSPENSE__ && suspensible && instance.suspense) ||
        (__SSR__ && isInSSRComponentSetup)
      ) {
        return load()
          .then(comp => {
            return () => createInnerComp(comp, instance)
          })
          .catch(err => {
            onError(err)
            return () =>
              errorComponent
                ? createVNode(errorComponent as ConcreteComponent, {
                    error: err
                  })
                : null
          })
      }

      const loaded = ref(false)
      const error = ref()
      const delayed = ref(!!delay)

      if (delay) {
        setTimeout(() => {
          delayed.value = false
        }, delay)
      }

      if (timeout != null) {
        setTimeout(() => {
          if (!loaded.value && !error.value) {
            const err = new Error(
              `Async component timed out after ${timeout}ms.`
            )
            onError(err)
            error.value = err
          }
        }, timeout)
      }

      load()
        .then(() => {
          loaded.value = true
          if (instance.parent && isKeepAlive(instance.parent.vnode)) {
            // parent is keep-alive, force update so the loaded component's
            // name is taken into account
            queueJob(instance.parent.update)
          }
        })
        .catch(err => {
          onError(err)
          error.value = err
        })

      return () => {
        if (loaded.value && resolvedComp) {
          return createInnerComp(resolvedComp, instance)
        } else if (error.value && errorComponent) {
          return createVNode(errorComponent, {
            error: error.value
          })
        } else if (loadingComponent && !delayed.value) {
          return createVNode(loadingComponent)
        }
      }
    }
  }) as T
}

function createInnerComp(
  comp: ConcreteComponent,
  parent: ComponentInternalInstance
) {
  const { ref, props, children, ce } = parent.vnode
  const vnode = createVNode(comp, props, children)
  // ensure inner component inherits the async wrapper's ref owner
  vnode.ref = ref
  // pass the custom element callback on to the inner comp
  // and remove it from the async wrapper
  vnode.ce = ce
  delete parent.vnode.ce

  return vnode
}
```