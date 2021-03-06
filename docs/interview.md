---
sidebar: auto
---

# Interview Index

## DOM 事件

### 事件捕获 & 事件冒泡

**顺序**：先捕获，后冒泡

- **捕获**：【又外向内】某父级元素及其内部元素，绑定同类型事件如：click 时，会先触发该父级元素捕获事件，在触发当前点击元素的事件绑定
- **冒泡**：【由内向外】，运用于事件委托，常见为列表事件，取代为每个列表 (li) 元素绑定事件为列表父元素 (ul) 绑定

**开启事件捕获**：element.addEventListener(eventName, callback, true)，第三个参数传入 `true`，即可开启捕获。

### DOMContentLoaded VS load

- `当初始的 HTML` 文档被完全加载和解析完成之后，`DOMContentLoaded` 事件被触发，而无需等待**样式表**、**图像**和**子框架**的完全加载。
- `load` 应该仅用于检测一个完全加载的页面。
- 这里有一个常见的错误，就是在本应使用 `DOMContentLoaded` 会更加合适的情况下，却选择使用 `load`，所以要谨慎。

> 注意：`DOMContentLoaded` 事件必须等待其所属 script 之前的样式表加载解析完成才会触发。
顺序加载原因。

<highlight>

::: slot default
```js
<link rel="stylesheet" href="css.css">
<script>
  document.addEventListener('DOMContentLoaded',function(){
      console.log('3 seconds passed');
  });
</script>
```

:::
</highlight>

上面代码，如果将 link 置于 script 之后，就会立即打印。

> Note: **同步** JavaScript 会暂停 DOM 的解析。
GUI 渲染线程与 JS 引擎线程互斥

<highlight>

::: slot default

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

:::
</highlight>

参考: [MDN](https://developer.mozilla.org/zh-CN/docs/Web/Events/DOMContentLoaded)

## 性能优化

“从地址栏输入XXX到访问之间经历了什么？”
这一过程经历的阶段，均有优化的机会：

- 查询缓存
- 发送请求
- 等待响应
- 页面解析
- 下载并处理各类静态资源
- 运行时
- 预加载

参考：

- [前端性能优化](https://alienzhou.github.io/fe-performance-journey/)
- [A Tale of Four Caches](https://calendar.perfplanet.com/2016/a-tale-of-four-caches/)

### 缓存

#### 本地数据存储

直接在业务代码侧进行缓存处理。缓存方式包括 `localStorage`, `sessionStorage`, [indexedDB](https://medium.com/free-code-camp/a-quick-but-complete-guide-to-indexeddb-25f030425501)

例如，我们的页面上有一个日更新的榜单，我们可以做一个当日缓存：

<highlight>

::: slot default

```js
// 当用户加载站点中的榜单组件时，可以通过该方法获取榜单数据
async function readListData() {
    const info = JSON.parse(localStorage.getItem('listInfo'));
    if (isExpired(info.time, +(new Date))) {
        const list = await fetchList();
        localStorage.setItem('listInfo', JSON.stringify({
            time: +(new Date),
            list: list
        }));
        return list;
    }
    return info.list;
}
```

:::
</highlight>

对于一些特殊的、轻量级的业务数据，可以考虑使用本地存储作为缓存。

`Local/session` 存储体积小(且不一致)

- 浏览器实现可为每个站点提供 2MB - 10MB 控件

`indexDB` 是一种异步缓存 API，不会阻塞 UI 线程。

- key/value 存储
- 数据存储不受限
- 支持所有现代浏览器
- 支持事务、版本控制，提供良好性能
- 跨域无法访问

`Web SQL` 已废弃

#### 内存缓存 Memory

webpack 进行懒加载时，使用 JSONP 形式引入，且使用 [preloader](https://calendar.perfplanet.com/2013/big-bad-preloader/)，预抓取出其他子页面可能会用到内容，存储在 memory cache 中

```html
<link rel='preload' href='xxx.js' as='javascript' />
```

- 不关心 HTTP语义
  如：`max-age=0` 或者 `no-cache` `Cache-Control`

补充：

- no-cache：是把资源进行了本地缓存，在浏览器使用缓存之前，会使用 `last-Modified` 和 `Etag` 往返浏览器进行对比，判断时间和唯一标识符和服务器的是否一致，一致的话304使用缓存，不一致的话请求服务器。
- no-store: 禁用本地缓存

#### Cache API

提供给了客户端构建请求缓存机制的能力。

PWA (Progressive Web App) 或者 Service Worker

Service Worker 是一个后台运行的独立线程，可以在代码中启用

<highlight>

::: slot default

```js
// index.js
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(function () {
        // 注册成功
    });
}
```

:::

</highlight>

之后需要处理一些 Service Worker 的生命周期事件，而其中与这里提到的缓存功能直接相关的则是请求拦截：

<highlight>

::: slot default

```js
// sw.js
self.addEventListener('fetch', function (e) {
    // 如果有cache则直接返回，否则通过fetch请求
    e.respondWith(
        caches.match(e.request).then(function (cache) {
            return cache || fetch(e.request);
        }).catch(function (err) {
            console.log(err);
            return fetch(e.request);
        })
    );
});
```

:::

</highlight>

以上代码会拦截所有的网络请求，查看是否有缓存的请求内容，如果有则返回缓存，否则会继续发送请求。与内存缓存不同，Cache API 提供的缓存可以认为是“永久性”的，关闭浏览器或离开页面之后，下次再访问仍然可以使用。

[PWA 学习与实践](https://juejin.im/post/5aca14b6f265da237c692e6f)

测试浏览器兼容性：
[caniuse](https://caniuse.com/#search=service%20worker)

#### HTTP 缓存

缓存分为强缓存和协商缓存。强缓存不过服务器，协商缓存需要过服务器，协商缓存返回的状态码是304。两类缓存机制可以同时存在，强缓存的优先级高于协商缓存。当执行强缓存时，如若缓存命中，则直接使用缓存数据库中的数据，不再进行缓存协商。

##### 强缓存

**Expires(HTTP1.0)**：Exprires 的值为服务端返回的数据到期时间。当再次请求时的请求时间小于返回的此时间，则直接使用缓存数据。但由于服务端时间和客户端时间可能有误差，这也将导致缓存命中的误差。另一方面，Expires是HTTP1.0的产物，故现在大多数使用Cache-Control替代。

**缺点**：使用的是绝对时间，如果服务端和客户端的时间产生偏差，那么会导致命中缓存产生偏差。

**Pragma(HTTP1.0)**：HTTP1.0时的遗留字段，当值为"no-cache"时强制验证缓存，Pragma禁用缓存，如果又给Expires定义一个还未到期的时间，那么Pragma字段的优先级会更高。服务端响应添加'Pragma': 'no-cache'，浏览器表现行为和刷新(F5)类似。

**Cache-Control(HTTP1.1)**：有很多属性，不同的属性代表的意义也不同：

- private：客户端可以缓存
- public：客户端和代理服务器都可以缓存
- max-age=t：缓存内容将在t秒后失效
- no-cache：需要使用协商缓存来验证缓存数据
- no-store：所有内容都不会缓存

##### 协商缓存

强缓存不是那么灵活。如果我在 300 秒内更新了资源，需要怎么通知客户端呢？常用的方式就是通过协商缓存。

远程请求慢的一大原因就是报文体积较大。协商缓存就是希望能通过先“问一问”服务器资源到底有没有过期，来避免无谓的资源下载。这伴随的往往会是 HTTP 请求中的 304 响应码。

一种协防缓存的方式是：服务器第一次响应时返回 Last-Modified，而浏览器在后续请求时带上其值作为 If-Modified-Since，相当于问服务端：XX 时间点之后，这个资源更新了么？服务器根据实际情况回答即可：更新了（状态码 200）或没更新（状态码 304）。

上面是通过时间来判断是否更新，如果更新时间间隔过短，例如 1s 一下，那么使用更新时间的方式精度就不够了。所以还有一种是通过标识 —— ETag。服务器第一次响应时返回 ETag，而浏览器在后续请求时带上其值作为 If-None-Match。一般会用文件的 MD5 作为 ETag。

#### Push Cache

假如很不幸，以上这些缓存你都没有命中，那么你将会碰到最后一个缓存检查 —— Push Cache。

ush Cache 其实是 HTTP/2 的 Push 功能所带来的。简言之，过去一个 HTTP 的请求连接只能传输一个资源，而现在你在请求一个资源的同时，服务端可以为你“推送”一些其他资源 —— 你可能在在不久的将来就会用到一些资源。例如，你在请求 www.sample.com 时，服务端不仅发送了页面文档，还一起推送了 关键 CSS 样式表。这也就避免了浏览器收到响应、解析到相应位置时才会请求所带来的延后。

<highlight>

::: slot default
```html
Page: Hey example.com, can I have your homepage please? 10:24
Server: Sure thing! Oh, but while I'm sending you that, here's a stylesheet, some images, some JavaScript, and some JSON. 10:24
Page: Uh, sure.10:24
Page: I'm just reading the HTML here, and it looks like I'm going to need a stylesh… oh it's the one you're already sending me, cool!10:25
```

:::
</highlight>

参考:
[HTTP/2 push is tougher than I thought](https://jakearchibald.com/2017/h2-push-tougher-than-i-thought/)

### 发送请求

- 避免多余重定向
  
  重定向分为 301 的永久重定向和 302 的临时重定向。
  
  建议贴合语义，例如服务迁移的情况下，使用 301 重定向。对 SEO 也会更友好。

- DNS 预解析
  
  `<link rel="dns-prefetch" href="//yourwebsite.com">`

- 预先建立连接
  
  `<link rel="preconnect" href="//sample.com" crossorigin>`

- 使用 CDN 静态资源，我们可以考虑通过 CDN 来降低时延。

### 服务端响应

- 使用流进行响应
- 业务聚合 NodeJS 
- 避免代码问题
  - async await 的不当使用导致并行请求被串行化了；
  - 频繁地 JSON.parse 和 JSON.stringify 大对象；
  - 正则表达式的灾难性回溯；
  - 闭包导致的内存泄漏；
  - CPU 密集型任务导致事件循环 delay 严重；
  - 未捕获的异常导致进程频繁退出，守护进程（pm2/supervisor）又将进程重启，这种频繁的启停也会比较消耗资源；

### 页面解析与处理

要注意的点：

- 注意资源在页面文档中的位置
  - HTML 解析为 DOM Tree，CSS 解析为 CSSOM，两者再合成 Render Tree，并行执行，非常完美。然而，当 JavaScript 入场之后，局面就变了：
  - 根据标准规范，在 JavaScript 中可以访问 DOM。因此当遇到 JavaScript 后会阻塞 DOM 的解析。于此同时，为避免 CSS 与 JavaScript 之间的竞态，CSSOM 的构建会阻塞 JavaScript 的脚本执行。总结起来就是 ——

  - JavaScript 会阻塞 DOM 构建，而 CSSOM 的构建又回阻塞 JavaScript 的执行。

- 使用 defer 和 async
  - 两者都会防止 JavaScript 脚本的下载阻塞 DOM 构建
  - defer 会在 HTML 解析完成后，按照脚本出现的次序再顺序执行；
  - async 则是下载完成就立即开始执行，同时阻塞页面解析，不保证脚本间的执行顺序。
  - 推荐在一些与主业务无关的 JavaScript 脚本上使用 async。例如统计脚本、监控脚本、广告脚本等。这些脚本一般都是一份独立的文件，没有外部依赖，不需要访问 DOM，也不需要有严格的执行时机限制。在这些脚本上使用 async 可以有效避免这些非核心功能的加载影响页面解析速度。

- 页面文档压缩

### 页面静态资源

#### JavaScript

- 减少不必要的请求
  - 代码拆分（code split）与按需加载
    - webpack or [RequireJS](https://requirejs.org/)
  - 代码合并
- 减少包体大小
  - 代码压缩
    - uglify, production 模式下默认开始，将变量替换为短命名、去掉多余的换行符等方式
    - 文本压缩算法 gzip，Content-Encoding: gzip
  - Tree Shaking
    - optimization.usedExports: [] | boolean
    - package.json.sideEffects
    - 通过检测源码中不会被使用到的部分，将其删除，从而减小代码的体积

    <highlight>

    :::slot default
    ```js
    // 模块 A
    export function add(a, b) {
        return a + b;
    }

    export function minus(a, b) {
        return a - b;
    }

    // 模块 B
    import {add} from 'module.A.js';
    console.log(add(1, 2));
    ```
    :::
    </highlight>

    > 上面的代码中使用了 ESM 规范的模块语法，而没有使用 CommonJS
    Tree Shaking 算是一种静态分析，而 ESM 本身是一种的静态的模块化规范，所有依赖可以在编译期确定
  - 优化 polyfill 的使用
    - 用于在非兼容浏览器上也能使用新特性的 API。后续升级不用改动业务代码，只需要删除相应的 polyfill 即可。
    - [browserslist](https://github.com/browserslist/browserslist)
  - webpack
    -  webpack-bundle-analyzer 这个工具来查看打包代码里面各个模块的占用大小。
    - [一些建议可以帮助你减小 bundle 的体积](https://github.com/GoogleChromeLabs/webpack-libs-optimizations)
- 解析与执行
除了 JavaScript 下载需要耗时外，脚本的解析与执行也是会消耗时间的
  -  JavaScript 的解析耗时
  - 避免 Long Task
  - 针对代码的优化
- 缓存
  -  发布与部署
    - [大公司里怎样开发和部署前端代码？](https://www.zhihu.com/question/20790576/answer/32602154)
  - 将基础库代码打包合并
  - 减少 webpack 编译不当带来的缓存失效
    - 使用 Hash 来替代自增 ID
    - 将 runtime chunk 单独拆分出来
    - 使用 records

### 首屏加载

- Vue-Router路由懒加载（利用Webpack的代码切割）
- 使用CDN加速，将通用的库从vendor进行抽离
- Nginx的gzip压缩
- Vue异步组件
服务端渲染SSR
- 如果使用了一些UI库，采用按需加载
- Webpack开启gzip压缩
- 如果首屏为登录页，可以做成多入口
- Service Worker缓存文件处理
- 使用link标签的rel属性设置 prefetch（这段资源将会在未来某个导航或者功能要用到，但是本资源的下载顺序权重比较低，prefetch通常用于加速下一次导航）、preload（preload将会把资源得下载顺序权重提高，使得关键数据提前下载好，优化页面打开速度）

## CSS

### :root 伪类选择器

`:root` 这个 `CSS` 伪类匹配文档树的根元素。对于 `HTML` 来说，`:root` 表示 `<html>` 元素，除了优先级更高之外，与 `html` 选择器相同。

### 示例

在声明全局 CSS 变量时 :root 会很有用：

<highlight>

:::slot default
```css
:root {
  --main-color: hotpink;
  --pane-padding: 5px 42px;
  --card-skeleton: linear-gradient(lightgrey var(--card-height), transparent 0);
}
```
:::
</highlight>

### 运用骨架屏

<div class='el-main'>
  <skeleton></skeleton>
</div>

<highlight>

:::slot default
```html
<template>
  <div class='card'> </div>
</template>

<style lang="scss">
  /*
 * Variables
 */

:root {  
  --card-padding: 24px;
  --card-height: 340px;
  --card-skeleton: linear-gradient(lightgrey var(--card-height), transparent 0);
  
  --avatar-size: 32px;
  --avatar-position: var(--card-padding) var(--card-padding);
  --avatar-skeleton: radial-gradient(circle 16px at center, white 99%, transparent 0
  );
  
  --title-height: 32px;
  --title-width: 200px;
  --title-position: var(--card-padding) 180px;
  --title-skeleton: linear-gradient(white var(--title-height), transparent 0);
  
  --desc-line-height: 16px;
  --desc-line-skeleton: linear-gradient(white var(--desc-line-height), transparent 0);
  --desc-line-1-width:230px;
  --desc-line-1-position: var(--card-padding) 242px;
  --desc-line-2-width:180px;
  --desc-line-2-position: var(--card-padding) 265px;
  
  --footer-height: 40px;
  --footer-position: 0 calc(var(--card-height) - var(--footer-height));
  --footer-skeleton: linear-gradient(white var(--footer-height), transparent 0);
  
  --blur-width: 200px;
  --blur-size: var(--blur-width) calc(var(--card-height) - var(--footer-height));
}

/*
 * Card Skeleton for Loading
 */

.card {
  width: 280px; //demo
  height: var(--card-height);
  
  &:empty::after {
    content:"";
    display:block;
    width: 100%;
    height: 100%;
    border-radius:6px;
    box-shadow: 0 10px 45px rgba(0,0,0, .1);

    background-image:
      linear-gradient(
        90deg, 
        rgba(lightgrey, 0) 0, 
        rgba(lightgrey, .8) 50%, 
        rgba(lightgrey, 0) 100%
      ),                          //animation blur
      var(--title-skeleton),      //title
      var(--desc-line-skeleton),  //desc1
      var(--desc-line-skeleton),  //desc2
      var(--avatar-skeleton),     //avatar
      var(--footer-skeleton),     //footer bar
      var(--card-skeleton)        //card
    ;

    background-size:
      var(--blur-size),
      var(--title-width) var(--title-height),
      var(--desc-line-1-width) var(--desc-line-height),
      var(--desc-line-2-width) var(--desc-line-height),
      var(--avatar-size) var(--avatar-size),
      100% var(--footer-height),
      100% 100%
    ;
    
    background-position:
      -150% 0,                      //animation
      var(--title-position),        //title
      var(--desc-line-1-position),  //desc1
      var(--desc-line-2-position),  //desc2
      var(--avatar-position),       //avatar
      var(--footer-position),       //footer bar
      0 0                           //card
    ;

    background-repeat: no-repeat;
    animation: loading 1.5s infinite;
  }
}

@keyframes loading {
  to {
    background-position:
      350% 0,        
      var(--title-position),  
      var(--desc-line-1-position),
      var(--desc-line-2-position),
      var(--avatar-position),
      var(--footer-position),
      0 0
    ;
  }
}


/* 
 * Demo Stuff
 */

.el-main {
  min-height:100vh;
  background-color:#FFF;
  display:flex;
  justify-content:center;
  align-items:center;
}
</style>
```
:::
</highlight>


## Sass

一款成熟、稳定、强大的专业级 **CSS 扩展语言**，能兼容 CSS 语法

### 安装使用

**下载**
`sass` 基于 `Ruby` 语言开发而成，因此安装 `sass` 前需要 [安装 Ruby](http://rubyinstaller.org/downloads)。（注:mac下自带Ruby无需在安装Ruby!）

> npm i sass

**编译**
> sass input.scss output.css

**监听**
> sass --watch input.scss:output.css
监听整个目录
sass --watch app/sass:public/stylesheets


### 特性 

#### 使用变量
> $ 符号标识变量，比如：$highlight-color

  - 声明变量
  - 变量引用
  - 下划线或中划线均可

<highlight>

:::slot default
```sass
$link-color: blue;
a {
  color: $link_color;
}

//编译后

a {
  color: blue;
}
```
:::
</highlight>

#### 嵌套 CSS 规则

<highlight>

:::slot default
:::
```sass
#content {
  article {
    h1 { color: #333 }
    p { margin-bottom: 1.4em }
  }
  aside { background-color: #EEE }
}

 /* 编译后 */
#content article h1 { color: #333 }
#content article p { margin-bottom: 1.4em }
#content aside { background-color: #EEE }
```
</highlight>

**父元素选择器标识符&**

<highlight>

:::slot default
```sass
article a {
  color: blue;
  &:hover { color: red }
}

// 编译后
article a { color: blue }
article a:hover { color: red }
```
:::
</highlight>

**群组选择器的嵌套**

<highlight>

:::slot default
```sass
nav, aside {
  a {color: blue}
}

// 编译后
nav a, aside a {color: blue}
```
:::
</highlight>

**子组合选择器和同层组合选择器：>、+和~**

<highlight>

:::slot default
```sass
article {
  ~ article { border-top: 1px dashed #ccc }
  > section { background: #eee }
  dl > {
    dt { color: #333 }
    dd { color: #555 }
  }
  nav + & { margin-top: 0 }
}

// 编译后
article ~ article { border-top: 1px dashed #ccc }
article > footer { background: #eee }
article dl > dt { color: #333 }
article dl > dd { color: #555 }
nav + article { margin-top: 0 }
```
:::
</highlight>

**嵌套属性**

<highlight>

:::slot default
```sass
nav {
  border: 1px solid #ccc {
  left: 0px;
  right: 0px;
  }
}

// 编译后
nav {
  border: 1px solid #ccc;
  border-left: 0px;
  border-right: 0px;
}
```
:::
</highlight>

#### 导入SASS文件

使用sass的@import规则并不需要指明被导入文件的全名。你可以省略.sass或.scss文件后缀

**使用SASS部分文件**

sass局部文件的文件名以下划线开头。这样，sass就不会在编译时单独编译这个文件输出css，而只把这个文件用作导入

举例来说，你想导入themes/_night-sky.scss这个局部文件里的变量，你只需在样式表中写@import "themes/night-sky";。

**默认变量值**

反复声明一个变量，只有最后一处声明有效且它会覆盖前边的值


**嵌套导入**

<highlight>

:::slot default
```sass
.blue-theme {@import "blue-theme"}

//生成的结果跟你直接在.blue-theme选择器内写_blue-theme.scss文件的内容完全一样。

.blue-theme {
  aside {
    background: blue;
    color: #fff;
  }
}
```
:::
</highlight>

#### 混合器

通过sass的混合器实现大段样式的重用。

关键字 `@mixin` className, `@include` className

<highlight>

:::slot default
```sass
@mixin rounded-corners {
  -moz-border-radius: 5px;
  -webkit-border-radius: 5px;
  border-radius: 5px;
}

notice {
  background-color: green;
  border: 2px solid #00aa00;
  @include rounded-corners;
}


// 编译后
.notice {
  background-color: green;
  border: 2px solid #00aa00;
  -moz-border-radius: 5px;
  -webkit-border-radius: 5px;
  border-radius: 5px;
}
```
:::
</highlight>

**混合器传参**

用法：
`@mixin className(arg1, arg2, ...)`

`@include className(param1, parma2, ...)`

<highlight>

:::slot default
```sass
@mixin link-colors($normal, $hover, $visited) {
  color: $normal;
  &:hover { color: $hover; }
  &:visited { color: $visited; }
}

a {
  @include link-colors(blue, red, green);
}


// 编译后
a { color: blue; }
a:hover { color: red; }
a:visited { color: green; }
```
:::
</highlight>

> sass 允许通过语法` $name: value` 的形式指定每个参数的值。这种形式的传参，参数顺序就不必再在乎了，只需要保证没有漏掉参数即可：

<highlight>

:::slot default
```sass
a {
    @include link-colors(
      $normal: blue,
      $visited: green,
      $hover: red
  );
}
```
:::
</highlight>

#### 使用选择器继承来精简CSS

关键字 `@extend`

<highlight>

:::slot default
```sass
//通过选择器继承继承样式
.error {
  border: 1px solid red;
  background-color: #fdd;
}
.seriousError {
  @extend .error;
  border-width: 3px;
}
```
:::
</highlight>

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
