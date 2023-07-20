# diff 算法

[[toc]]

## 前后元素不一致

两个不同虚拟节点不需要进行比较，直接移除老节点，将新的虚拟节点渲染成真实DOM进行挂载即可

::: code-group
```ts [patch]
const patch = (n1, n2, container) => {
  if(n1 == n2){
    return
  }
  if(n1 && !isSameVNodeType(n1, n2)){ // [!code ++]
    unmount(n1) // [!code ++]
    n1 = null // [!code ++]
  } // [!code ++]
  if(n1 == null){
    mountElement(n2,container); 
  }else{
    // diff算法
  }
}
```

```ts [isSameVNodeType]
export const isSameVNodeType = (n1, n2) => {
  return n1.type === n2.type && n1.key === n2.key;
}
```
:::

## 前后元素一致

- 前后元素一致则比较两个元素的属性和孩子节点
- text 渲染
- Fragment 渲染
- element 渲染
- 组件渲染

::: code-group
```ts [patch]
const patch = (n1, n2, container) => {
  if (n1 === n2) return

  if (n1 && !isSameVNodeType(n1, n2)) {
    unmount(n1)
    n1 = null
  }

  if(n1 == null){ // [!code --]
    mountElement(n2,container);  // [!code --]
  }else{ // [!code --]
    // diff算法 // [!code --]
  } // [!code --]

  const { type, shapeFlag } = n2 // [!code ++]
  switch (type) { // [!code ++]
    case Text: // [!code ++]
      processText(n1, n2) // [!code ++]
      break // [!code ++]
    case Fragment: // [!code ++]
      processFragment(n1, n2) // [!code ++]
      break // [!code ++]
    default: // [!code ++]
      if (shapeFlag & ShapeFlags.ELEMENT) { // [!code ++]
        processElement(n1, n2, container) // [!code ++]
      } else if (shapeFlag & ShapeFlags.COMPONENT) { // [!code ++]
        processComponent(n1, n2) // [!code ++]
      } // [!code ++]
  } // [!code ++]
}
```
:::

```ts
const patchElement = (n1, n2) => {
  let el = (n2.el = n1.el);
  const oldProps = n1.props || {};
  const newProps = n2.props || {};

  patchProps(oldProps, newProps, el);
  patchChildren(n1, n2, el);
}

const processElement = (n1, n2, container) => {
  if (n1 == null) {
    mountElement(n2, container)
  } else {
    patchElement(n1, n2);
  }
}
```

## 子元素比较情况

`patchChildren`子元素类别：文本、数组、空

| 新 |	旧|	操作方式|
| --- | --- | --- |
| 文本 |	数组|	（删除老儿子，设置文本内容）|
| 文本 |	文本|	（更新文本即可）|
| 文本 |	空|	（更新文本即可|) 与上面的类似
| 数组 |	数组|	（diff算法）|
| 数组 |	文本|	（清空文本，进行挂载）|
| 数组 |	空|	（进行挂载）| 与上面的类似
| 空 |	数组|	（删除所有儿子）|
| 空 |	文本|	（清空文本）|
| 空 |	空|	（无需处理）|

::: code-group
```ts [patchChildren]
const patchChildren = (n1, n2, el, anchor) => {
    const c1 = n1.children
    const c2 = n2.children

    const prevShapeFlag = n1 ? n1.shapeFlag : 0
    const shapeFlag = n2.shapeFlag

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        unmountChildren(c1)
      }
      if (c1 !== c2) {
        hostSetElementText(el, c2)
      }
    } else {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // two arrays, do full diff
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          patchKeyedChildren(c1, c2, el)
        } else {
          unmountChildren(c1)
        }
      } else {
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          hostSetElementText(el, '')
        }
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(c2, el, anchor)
        }
      }
    }
  }
```

```ts [unmountChildren]
const unmountChildren = (children) =>{
  for(let i = 0 ; i < children.length; i++){
    unmount(children[i]);
  }
}
```
:::

## diff核心

- sync from start
- sync from end
- common sequence + mount
- common sequence + unmount
- common sequence + unmount

```ts [patchKeyedChildren]
const patchKeyedChildren = (c1, c2, el) => {
  let i = 0
  const l2 = c2.length
  let e1 = c1.length - 1 // prev ending index
  let e2 = l2 - 1 // next ending index

  // 1. sync from start
  // (a b) c
  // (a b) d e
  // i = 2
  while (i <= e1 && i <= e2) {
    const n1 = c1[i]
    const n2 = c2[i]
    if (isSameVNodeType(n1, n2)) {
      patch(n1, n2, el)
    } else {
      break
    }
    i++
  }

  // 2. sync from end
  // a (b c)
  // d e (b c)
  // e1 = 0, e2 = 1
  while (i <= e1 && i <= e2) {
    const n1 = c1[e1]
    const n2 = c2[e2]
    if (isSameVNodeType(n1, n2)) {
      patch(n1, n2, el)
    } else {
      break
    }
    e1--
    e2--
  }

  // 3. common sequence + mount
  // (a b)
  // (a b) c
  // i = 2, e1 = 1, e2 = 2
  // (a b)
  // c (a b)
  // i = 0, e1 = -1, e2 = 0
  if (i > e1) {
    if (i <= e2) {
      const nextPos = e2 + 1
      const anchor = nextPos < l2 ? c2[nextPos].el : null
      while (i <= e2) {
        patch(null, c2[i], el, anchor)
        i++
      }
    }
  }

  // 4. common sequence + unmount
  // (a b) c
  // (a b)
  // i = 2, e1 = 2, e2 = 1
  // a (b c)
  // (b c)
  // i = 0, e1 = 0, e2 = -1
  else if (i > e2) {
    while (i <= e1) {
      unmount(c1[i])
      i++
    }
  }

  // 5. unknown sequence
  // [i ... e1 + 1]: a b [c d e] f g
  // [i ... e2 + 1]: a b [e d c h] f g
  // i = 2, e1 = 4, e2 = 5
  else {
    const s1 = i
    const s2 = i

    // 5.1 build key:index map for newChildren
    const keyToNewIndexMap = new Map()
    for (i = s2; i <= e2; i++) {
      const nextChild = c2[i]
      if (nextChild.key != null) {
        keyToNewIndexMap.set(nextChild.key, i) // { e: 2, d: 3, c: 4, h: 5 }
      }
    }

    // 5.2 loop through old children left to be patched and try to patch
    // matching nodes & remove nodes that are no longer present
    let j
    let patched = 0
    const toBePatched = e2 - s2 + 1 // 需要被 patch 的个数，供后续 newIndexToOldIndexMap 初始化用
    // used to track whether any node has moved
    // 即最长递增子序列，0 表示新增的，在标记下标时注意区分（+1）
    const newIndexToOldIndexMap = new Array(toBePatched).fill(0)
    // for (i = 0; i < toBePatched; i++) newIndexToOldIndexMap[i] = 0

    for (i = s1; i <= e1; i++) {
      const prevChild = c1[i]
      if (patched >= toBePatched) {
        // all new children have been patched so this can only be a removal
        unmount(prevChild)
        continue
      }
      let newIndex
      newIndex = keyToNewIndexMap.get(prevChild?.key)

      if (newIndex === undefined) {
        unmount(prevChild) // 新的有，老的无，移除
      } else {
        // 新元素对应老元素的索引值 + 1，（+1是为了区分新增值如h ）
        // [e, d, c, h] -> 初始态[0, 0, 0, 0] -> 在老数组中对应的下标 [4 + 1, 3 + 1, 2 + 1, 0]
        newIndexToOldIndexMap[newIndex - s2] = i + 1
        patch(prevChild, c2[newIndex], el, null)
        patched++
      }
    }
    // 5.3 move and mount

    // 实现一：直接倒序插入，这样性能不太好，如果有增续，可以不变，乱序追加即可
    // for (let i = toBePatched; i > 0; i--) {
    //   const nextIndex = s2 + i
    //   const nextChild = c2[nextIndex]
    //   const anchor = nextIndex + 1 < c2.length ? c2[nextIndex + 1].el : null
    //   if (newIndexToOldIndexMap[i] == 0) {
    //     patch(null, nextChild, el, anchor)
    //   } else {
    //     hostInsert(nextChild.el, el, anchor)
    //   }
    // }

    // 实现二：最长递增子序列 [5, 4, 3, 0]
    const increasingNewIndexSequence = getSequence(newIndexToOldIndexMap);
    j = increasingNewIndexSequence.length - 1;
    for (i = toBePatched - 1; i >= 0; i--) {
      let currentIndex = i + s2; // 找到h的索引
      let child = c2[currentIndex]; // 找到h对应的节点
      let anchor = currentIndex + 1 < c2.length ? c2[currentIndex + 1].el : null; // 第一次插入h 后 h是一个虚拟节点
      if (newIndexToOldIndexMap[i] == 0) {
        // 新增节点
        patch(null, child, el, anchor)
      } else {
        // 当前元素不在递增序列中
        // OR 无递增序列，如：reverse
        if (i != increasingNewIndexSequence[j] || j < 0) {
          hostInsert(child.el, el, anchor);
        } else {
          j--; // 跳过不需要移动的元素， 为了减少移动操作 需要这个最长递增子序列算法  
        }
      }
    }
  }
}
```

## longest_increasing_subsequence

[*wikipedia*](https://en.wikipedia.org/wiki/Longest_increasing_subsequence)
```ts [getSequence]
// 最长递增子序列
// 二分查找 + 贪心算法
function getSequence(arr: number[]): number[] {
  const p = arr.slice()
  // 类似数组副本，存放每一项比其大的那个值对应的下标
  // 如：[1,2,3,] p -> [1, 0, 1] 第一项由于没人和他比对，还是他自己
  const result = [0]
  // 存放追加值前面的索引，贪心算法

  let i, j, u, v, c
  const len = arr.length

  for (i = 0; i < len; i++) {
    const arrI = arr[i]
    // 0 表示新增元素，不处理
    if (arrI !== 0) {
      j = result[result.length - 1]
      // 1. 当前元素>取出的最大元素，追加入result，并记录下标
      if (arrI > arr[j]) {
        p[i] = j
        result.push(i)
        continue
      }

      // 2. 二分查找，第一个比arrI大的值
      u = 0
      v = result.length - 1
      while (u < v) {
        c = (u + v) >> 1 // 取中间值
        if (arrI > arr[result[c]]) {
          u = c + 1
        } else {
          v = c
        }
      }
      // 3. 找到中间值，result 中替换掉，第一个比arrI大的那个值，对应的下标
      // 同时在 p 中记录，result 中被替换值的前一项。
      // 贪心算法：最终 p 数组中记录的都是，原数组中每一项第一个比他大的值的下标
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1] // 记录前一项
        }
        result[u] = i
      }
    }
  }
  // 前驱子节点追溯，倒序查找
  u = result.length
  v = result[u - 1]
  while (u-- > 0) {
    result[u] = v
    v = p[v]
  }
  return result
}
```