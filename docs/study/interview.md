---
sidebar: auto
---

# Review

## ES6
### Set

ES6 提供了新的数据结构 Set。它类似于数组，但是成员的值都是唯一的，没有重复的值。

Set本身是一个构造函数，用来生成 Set 数据结构。

#### Set 实例的属性和方法

Set 结构的实例有以下属性。

- Set.prototype.constructor：构造函数，默认就是Set函数。
- Set.prototype.size：返回Set实例的成员总数。

Set 实例的方法分为两大类：操作方法（用于操作数据）和遍历方法（用于遍历成员）。下面先介绍四个操作方法。

- Set.prototype.add(value)：添加某个值，返回 Set 结构本身。
- Set.prototype.delete(value)：删除某个值，返回一个布尔值，表示删除是否成功。
- Set.prototype.has(value)：返回一个布尔值，表示该值是否为Set的成员。
- Set.prototype.clear()：清除所有成员，没有返回值。

### WeakSet

- WeakSet 的成员只能是对象，而不能是其他类型的值。
- WeakSet 中的对象都是弱引用，即垃圾回收机制不考虑 WeakSet 对该对象的引用，也就是说，如果其他对象都不再引用该对象，那么垃圾回收机制会自动回收该对象所占用的内存，不考虑该对象还存在于 WeakSet 之中。
- WeakSet 的一个用处，是储存 DOM 节点，而不用担心这些节点从文档移除时，会引发内存泄漏。

```js
const foos = new WeakSet()
class Foo {
  constructor() {
    foos.add(this)
  }
  method () {
    if (!foos.has(this)) {
      throw new TypeError('Foo.prototype.method 只能在Foo的实例上调用！');
    }
  }
}
```

上面代码保证了 Foo 的实例方法，只能在 Foo 的实例上调用。这里使用 WeakSet 的好处是，foos对实例的引用，不会被计入内存回收机制，所以删除实例的时候，不用考虑foos，也不会出现内存泄漏。

三个方法：

- WeakSet.prototype.add(value)：向 WeakSet 实例添加一个新成员。
- WeakSet.prototype.delete(value)：清除 WeakSet 实例的指定成员。
- WeakSet.prototype.has(value)：返回一个布尔值，表示某个值是否在 WeakSet

### Map

Object 结构提供了“字符串—值”的对应，Map 结构提供了“值—值”的对应，是一种更完善的 Hash 结构实现。如果你需要“键值对”的数据结构，Map 比 Object 更合适。

#### 实例方法和属性

- size 属性
- Map.prototype.set(key, value)
- Map.prototype.get(key)
- Map.prototype.has(key)
- Map.prototype.delete(key)
- Map.prototype.clear()

作为构造函数，Map 也可以接受一个数组作为参数。该数组的成员是一个个表示键值对的数组。

```js
const map = new Map([
  ['name', '张三'],
  ['title', 'Author']
]);

map.size // 2
map.has('name') // true
map.get('name') // "张三"
map.has('title') // true
map.get('title') // "Author"
```

### 函数扩展

#### 函数的 length 属性

指定了默认值以后，函数的length属性，将返回没有指定默认值的参数个数。也就是说，指定了默认值后，length属性将失真。

```js
(function (a) {}).length // 1
(function (a = 5) {}).length // 0
(function (a, b, c = 5) {}).length // 2
(function (a, b = 1, c) {}).length // 1
```

#### 参数作用域

- 一旦设置了参数的默认值，函数进行声明初始化时，参数会形成一个单独的作用域（context）。
- 等到初始化结束，这个作用域就会消失。
- 这种语法行为，在不设置参数默认值时，是不会出现的。

```js
var x = 1;

function f(x, y = x) {
  console.log(y);
}

f(2) // 2
```

```js
let x = 1;

function f(y = x) {
  let x = 2;
  console.log(y);
}

f() // 1
```

```js
function f(y = x) {
  let x = 2;
  console.log(y);
}

f() // ReferenceError: x is not defined
```

```js
var x = 1;

function foo(x = x) {
  // ...
}

foo() // ReferenceError: x is not defined
```

上面代码中，参数x = x形成一个单独作用域。实际执行的是let x = x，由于暂时性死区的原因，这行代码会报错”x 未定义“。

#### 尾调用

尾调用（Tail Call）是函数式编程的一个重要概念，本身非常简单，一句话就能说清楚，就是指某个函数的最后一步是调用另一个函数。

尾调用：

```js
function f(x){
  return g(x);
}
```

非尾调用：

```js
// 情况一
function f(x){
  let y = g(x);
  return y;
}

// 情况二
function f(x){
  return g(x) + 1;
}

// 情况三
function f(x){
  g(x); // 最后一步是 return undefined
}
```

##### 尾调优化

“尾调用优化”（Tail call optimization），即只保留内层函数的调用帧。

存调用位置和内部变量等信息。如果在函数A的内部调用函数B，那么在A的调用帧上方，还会形成一个B的调用帧。等到B运行结束，将结果返回到A，B的调用帧才会消失。如果函数B内部还调用函数C，那就还有一个C的调用帧，以此类推。所有的调用帧，就形成一个“调用栈”（call stack）。

```js
function f() {
  let m = 1;
  let n = 2;
  return g(m + n);
}
f();

// 等同于
function f() {
  return g(3);
}
f();

// 等同于
g(3);
```

##### 尾递归

递归非常耗费内存，因为需要同时保存成千上百个调用帧，很容易发生“栈溢出”错误（stack overflow）。但对于尾递归来说，由于只存在一个调用帧，所以永远不会发生“栈溢出”错误。
**阶乘**

```js
function factorial(n) {
  if (n === 1) return 1;
  return n * factorial(n-1);
}
```

计算n的阶乘，最多需要保存 n 个调用记录，复杂度 O(n) 。
**阶乘优化**

```js
function factorial(n, total=1) {
  if (n ===1 ) return total;
  return factorial(n-1, n * total);
}
```

复杂度 O(1) 
**斐波拉切**

```js
function Fibonacci(n) {
  if (n <= 1) return 1;
  return Fibonacci(n-1) + Fibonacci(n-2);
}
```

**斐波拉切 优化**

```js
function Fibonacci(n, ac1 = 1, ac2 = 1) {
  if (n<=1) return ac2;
  return Fibonacci(n-1, ac2, ac1+ac2);
}
```

## 小程序

### 生命周期函数

- onLoad
- onShow
- onReady
- onHide
- onShow
- onUnload

### 去抖 节流

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

## 缓存

作用：
- 减少冗余数据传输，节省带宽
- 减少服务器负担，大大提高网站性能
- 加快客户端加载网页速度

## cookie & session

### cookie

[参考链接](http://www.zhufengpeixun.cn/2020/html/22.cookie.html)

res.cookie(name, value, [, options])

参数：
- domain
- path
- httpOnly
- maxAge: Number
- expires: Date
- secure：只通过 https 协议访问

注意：
- 可能被客户端篡改，使用前验证合法性
- 不要存储敏感数据，比如用户密码，账户余额
- 使用 httpOnly 保证安全
- 尽量减少 cookie 的体积
- 设置正确的 domain 和 path，减少数据传输

document.cookie 可以获取 cookie

### session

[参考链接](http://www.zhufengpeixun.cn/2020/html/23.session.html)

what:
- session是另一种记录客户状态的机制，不同的是Cookie保存在客户端浏览器中，而session保存在服务器上
- 客户端浏览器访问服务器的时候，服务器把客户端信息以某种形式记录在服务器上，这就是session。客户端浏览器再次访问时只需要从该Session中查找该客户的状态就可以了

区别：
- cookie数据存放在客户的浏览器上，session数据放在服务器上。
- cookie不是很安全，别人可以分析存放在本地的COOKIE并进行COOKIE欺骗 考虑到安全应当使用session
- session会在一定时间内保存在服务器上。当访问增多，会比较占用你服务器的性能 考虑到减轻服务器性能方面,应当使用COOKIE
- 单个 cookie 保存的数据不能超过 4K，很多浏览器都限制一个站点最多保存20个 cookie

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

## HTTP 协议

基于 TCP/IP 协议的应用协议

分类：

- HTTP/0.9
- HTTP/1.0
- HTTP/1.1
- HTTP/2

### HTTP/0.9

1991年，只能请求网页文档

```js
GET /index.html
```

### HTTP/1.0

1996年

特新：
- 任何格式的内容都可以发送，图片，视频等
- `GET` 命令，还引入了 `POST` 命令和 `HEAD` 命令，丰富了浏览器与服务器的互动手段。
- HTTP 请求和回应的格式也变了。除了数据部分，每次通信都必须包括头信息（HTTP header），用来描述一些元数据。
- 状态码（status code）、多字符集支持、多部分发送（multi-part type）、权限（authorization）、缓存（cache）、内容编码（content encoding）等。

字段：
- Content-Type: 
  - multipart/form-data 表单
  - text/plain
  - text/css
  - text/html
  - 
- Content-Encoding:
  - gzip
  - compress
  - deflate
  - identify

缺点：
- 每个 TCP 链接只能发一个请求，请求其他数据，需重连
- TCP 链接成本高，三次握手，slow start
- 非标准字段：
  - Connection: keep-alive

### HTTP/1.1

特性：
- 持久连接（persistent connection），无需声明 Connection: keep-alive
  - 客户端最后一个请求，发送Connection: close，明确要求服务器关闭 TCP 链接
- 管线化 (pipeline)，同时发多个请求，顺序返回
  - 对头堵塞 (Head-of-line blocking)
- Content-Length 区分是哪个回应
- Transfer-Encoding: chunked 分块传输编码 buffer => 流
- 新增了许多动词方法：`PUT`、`PATCH`、`HEAD`、 `OPTIONS`、`DELETE`。
- Host 指定服务器域名

### HTTP/2

特性：

- HTTP/1.1 头信息肯定是文本（ASCII编码），数据体可以是文本，也可以是二进制
- HTTP/2 则是一个彻底的二进制协议，头信息和数据体都是二进制，并且统称为"帧"（frame）：头信息帧和数据帧
- 多工（multiplexing），不按顺序返回，避免 对头堵塞
- 数据流
- 头信息压缩
  - 头信息使用gzip或compress压缩后再发送
  - 客户端和服务器同时维护一张头信息表，所有字段都会存入这个表，生成一个索引号，以后就不发送同样字段了，只发送索引号，这样就提高速度了。
- 服务器推送 server push
  - 服务器可以预期到客户端请求网页后，很可能会再请求静态资源，所以就主动把这些静态资源随着网页一起发给客户端了。

## TCP 协议

职责：
- 客户端发送请求，将 HTTP 请求报文分割成报文段，传给 IP 协议
- 服务端接收请求，将收到的报文段，重组请求报文

建立、断开工作流：

- C 发送 SYN
- S 相应 SYN/ACK
- C 发送 ACK
- 请求 <=> 相应
- S FIN
- C ACK
- C FIN
- S ACK

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
