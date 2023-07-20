
# DOM 事件

## 事件捕获 & 事件冒泡

**顺序**：先捕获，后冒泡

- **捕获**：【又外向内】某父级元素及其内部元素，绑定同类型事件如：click 时，会先触发该父级元素捕获事件，在触发当前点击元素的事件绑定
- **冒泡**：【由内向外】，运用于事件委托，常见为列表事件，取代为每个列表 (li) 元素绑定事件为列表父元素 (ul) 绑定

**开启事件捕获**：element.addEventListener(eventName, callback, true)，第三个参数传入 `true`，即可开启捕获。

## DOMContentLoaded VS load

- `当初始的 HTML` 文档被完全加载和解析完成之后，`DOMContentLoaded` 事件被触发，而无需等待**样式表**、**图像**和**子框架**的完全加载。
- `load` 应该仅用于检测一个完全加载的页面。
- 这里有一个常见的错误，就是在本应使用 `DOMContentLoaded` 会更加合适的情况下，却选择使用 `load`，所以要谨慎。

> 注意：`DOMContentLoaded` 事件必须等待其所属 script 之前的样式表加载解析完成才会触发。
顺序加载原因。

```js
<link rel="stylesheet" href="css.css">
<script>
  document.addEventListener('DOMContentLoaded',function(){
      console.log('3 seconds passed');
  });
</script>
```

上面代码，如果将 link 置于 script 之后，就会立即打印。

> Note: **同步** JavaScript 会暂停 DOM 的解析。
GUI 渲染线程与 JS 引擎线程互斥

```js
<script>
  document.addEventListener("DOMContentLoaded", function(event) {
    console.log("DOM fully loaded and parsed");
  });

  for(var i=0; i<1000000000; i++){
    // 这个同步脚本将延迟DOM的解析。
      // 所以DOMContentLoaded事件稍后将启动。
  }
</script>
```

参考: [MDN](https://developer.mozilla.org/zh-CN/docs/Web/Events/DOMContentLoaded)

## 小程序

### 生命周期函数

- onLoad
- onShow
- onReady
- onHide
- onShow
- onUnload

## 去抖 节流

去抖

```js
function debounce(fn, delay) {
  let timer= null;

  return (...args) => {
    timer && clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
    }, delay);
  }
}
```

节流

```js
function throttle(fn, delay) {
  let flag = false;

  return (...args) => {
    if (!flag) return;
    flag = false;
    setInterval(() => {
      fn(...args);
      flag = true;
    }, delay);
  }
}

// 实现二：
function throttle(fn, delay) {
  let timeoutId = null;

  return function(...args) {
    if (!timeoutId) {
      timeoutId = setTimeout(() => {
        fn(...args);
        timeoutId = null;
      }, delay);
    }
  }
}
```

## 执行上下文

函数执行时，会创建一个执行环境，即执行上下文（execution context），执行上下文创建一个 Variable Object 变量对象，存储基础类型数据和引用类型数据的在堆中存储的地址

```js
ExecutionContest = {
  VO: {
    a: 'xxx',

  }
}
```

### 多个执行上下文

JS 代码在执行的时候，会进入一个执行上下文，可理解为当前代码运行环境

### 分类

- 全局执行上下文：浏览器创建，window
- 函数执行上下文环境

### 执行栈

- 多个执行上下文，JS 引擎有栈来管理
- LIFO 后进先出
- 栈底永远是全局上下文
- 新开启一个函数执行时，会省

### 执行上下文生命周期

两个阶段：

- 创建
  - 创建 VO
  - 创建 scopeChain
  - 确定 this 指向
- 执行
  - 变量赋值
  -  函数赋值
  - 执行

### 激活对象

变量对象会保存：

- 变量声明（var）
- 函数参数（arguments）
- 函数定义（function）
  - 表达式 let xx = function(){}
  - 声明 function xx(){} 优先级更高

#### VO

VO：Activation Object

在函数的调用栈中，如果当前执行上下文处于函数调用栈的顶端，则意味着当前上下文处于激活状态，此时变量对象称为活动对象(AO,Activation Object) VO=>AO
活动变量包含变量对象所有的属性，并有包含 this 指针

```js
function one(m) {
    function two() {
        console.log('two');
    }
}
one(1);

//执行阶段 VO=>AO
let VO = AO = {
    m:1,
    two: () => { console.log('two'); },

}
let oneEC={
    VO,
    this: window,
    scopeChain:[VO,globalVO]
}
```

## 作用域

JS 中，作用域是用来规定变量访问范围的规则

### 作用域链

作用域链是由当前执行环境与上层执行环境的一系列变量对象组成的，它保证了当前执行环境对符合访问权限的变量和函数的有序访问。

区分：

- 在函数创建时 确定
- this 是在当前执行上下文在执行栈顶时，确定

## new 原理

new调用时，自动执行的四步操作:

- 创建(或者说构造)一个全新的对象
- 这个对象会被执行[[原型]]链接
- 这个新对象会绑定到函数调用的this
- 如果函数没有返回其他对象，那么new表达式中的函数调用会自动返回这个新对象

```js
function mockNew(className, ..args) {
  let obj = {};
 obj = Object.create(className.prototype);
 let result = className.call(obj, ...args);
 return result ? result : obj;
}
```

## WebSocket

[参考](http://www.ruanyifeng.com/blog/2017/05/websocket.html)

对比 HTTP 有个缺陷：通信只能由客户端发起

用法:

- ws.onopen
- ws.onmessage
- ws.send
- ws.onerror
- ws.bufferedAmount
- wx.onclose
- ws.readyState
  - CONNECTING 0 正在连接
  - ONPEN 1 连接成功，可通信
  - CLOSING 2 正在关闭
  - CLOSED 3 已关闭 or 打开连接失败

加密：wss://域名:80/443

bi-directional messages

## 网络断开连接

检测 DNS 解析
修复

- 打开网络和共享中心
- 更改适配器设置
- 本地连接
  - 右键
  - 诊断
  - 修复
