# 性能优化

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

## 缓存

### 本地数据存储

直接在业务代码侧进行缓存处理。缓存方式包括 `localStorage`, `sessionStorage`, [indexedDB](https://medium.com/free-code-camp/a-quick-but-complete-guide-to-indexeddb-25f030425501)

例如，我们的页面上有一个日更新的榜单，我们可以做一个当日缓存：


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

### 内存缓存 Memory

webpack 进行懒加载时，使用 JSONP 形式引入，且使用 [preloader](https://calendar.perfplanet.com/2013/big-bad-preloader/)，预抓取出其他子页面可能会用到内容，存储在 memory cache 中

```html
<link rel='preload' href='xxx.js' as='javascript' />
```

- 不关心 HTTP语义
  如：`max-age=0` 或者 `no-cache` `Cache-Control`

补充：

- no-cache：是把资源进行了本地缓存，在浏览器使用缓存之前，会使用 `last-Modified` 和 `Etag` 往返浏览器进行对比，判断时间和唯一标识符和服务器的是否一致，一致的话304使用缓存，不一致的话请求服务器。
- no-store: 禁用本地缓存

### Cache API

提供给了客户端构建请求缓存机制的能力。

PWA (Progressive Web App) 或者 Service Worker

Service Worker 是一个后台运行的独立线程，可以在代码中启用

```js
// index.js
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(function () {
        // 注册成功
    });
}
```


之后需要处理一些 Service Worker 的生命周期事件，而其中与这里提到的缓存功能直接相关的则是请求拦截：

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

以上代码会拦截所有的网络请求，查看是否有缓存的请求内容，如果有则返回缓存，否则会继续发送请求。与内存缓存不同，Cache API 提供的缓存可以认为是“永久性”的，关闭浏览器或离开页面之后，下次再访问仍然可以使用。

[PWA 学习与实践](https://juejin.im/post/5aca14b6f265da237c692e6f)

测试浏览器兼容性：
[caniuse](https://caniuse.com/#search=service%20worker)

### HTTP 缓存

缓存分为强缓存和协商缓存。强缓存不过服务器，协商缓存需要过服务器，协商缓存返回的状态码是304。两类缓存机制可以同时存在，强缓存的优先级高于协商缓存。当执行强缓存时，如若缓存命中，则直接使用缓存数据库中的数据，不再进行缓存协商。

#### 强缓存

**Expires(HTTP1.0)**：Exprires 的值为服务端返回的数据到期时间。当再次请求时的请求时间小于返回的此时间，则直接使用缓存数据。但由于服务端时间和客户端时间可能有误差，这也将导致缓存命中的误差。另一方面，Expires是HTTP1.0的产物，故现在大多数使用Cache-Control替代。

**缺点**：使用的是绝对时间，如果服务端和客户端的时间产生偏差，那么会导致命中缓存产生偏差。

**Pragma(HTTP1.0)**：HTTP1.0时的遗留字段，当值为"no-cache"时强制验证缓存，Pragma禁用缓存，如果又给Expires定义一个还未到期的时间，那么Pragma字段的优先级会更高。服务端响应添加'Pragma': 'no-cache'，浏览器表现行为和刷新(F5)类似。

**Cache-Control(HTTP1.1)**：有很多属性，不同的属性代表的意义也不同：

- private：客户端可以缓存
- public：客户端和代理服务器都可以缓存
- max-age=t：缓存内容将在t秒后失效
- no-cache：需要使用协商缓存来验证缓存数据
- no-store：所有内容都不会缓存

#### 协商缓存

强缓存不是那么灵活。如果我在 300 秒内更新了资源，需要怎么通知客户端呢？常用的方式就是通过协商缓存。

远程请求慢的一大原因就是报文体积较大。协商缓存就是希望能通过先“问一问”服务器资源到底有没有过期，来避免无谓的资源下载。这伴随的往往会是 HTTP 请求中的 304 响应码。

一种协防缓存的方式是：服务器第一次响应时返回 Last-Modified，而浏览器在后续请求时带上其值作为 If-Modified-Since，相当于问服务端：XX 时间点之后，这个资源更新了么？服务器根据实际情况回答即可：更新了（状态码 200）或没更新（状态码 304）。

上面是通过时间来判断是否更新，如果更新时间间隔过短，例如 1s 一下，那么使用更新时间的方式精度就不够了。所以还有一种是通过标识 —— ETag。服务器第一次响应时返回 ETag，而浏览器在后续请求时带上其值作为 If-None-Match。一般会用文件的 MD5 作为 ETag。

### Push Cache

假如很不幸，以上这些缓存你都没有命中，那么你将会碰到最后一个缓存检查 —— Push Cache。

push Cache 其实是 HTTP/2 的 Push 功能所带来的。简言之，过去一个 HTTP 的请求连接只能传输一个资源，而现在你在请求一个资源的同时，服务端可以为你“推送”一些其他资源 —— 你可能在在不久的将来就会用到一些资源。例如，你在请求 www.sample.com 时，服务端不仅发送了页面文档，还一起推送了 关键 CSS 样式表。这也就避免了浏览器收到响应、解析到相应位置时才会请求所带来的延后。

```html
Page: Hey example.com, can I have your homepage please? 10:24
Server: Sure thing! Oh, but while I'm sending you that, here's a stylesheet, some images, some JavaScript, and some JSON. 10:24
Page: Uh, sure.10:24
Page: I'm just reading the HTML here, and it looks like I'm going to need a stylesh… oh it's the one you're already sending me, cool!10:25
```

参考:
[HTTP/2 push is tougher than I thought](https://jakearchibald.com/2017/h2-push-tougher-than-i-thought/)

## 发送请求

- 避免多余重定向
  
  重定向分为 301 的永久重定向和 302 的临时重定向。
  
  建议贴合语义，例如服务迁移的情况下，使用 301 重定向。对 SEO 也会更友好。

- DNS 预解析
  
  `<link rel="dns-prefetch" href="//yourwebsite.com">`

- 预先建立连接
  
  `<link rel="preconnect" href="//sample.com" crossorigin>`

- 使用 CDN 静态资源，我们可以考虑通过 CDN 来降低时延。

## 服务端响应

- 使用流进行响应
- 业务聚合 NodeJS 
- 避免代码问题
  - async await 的不当使用导致并行请求被串行化了；
  - 频繁地 JSON.parse 和 JSON.stringify 大对象；
  - 正则表达式的灾难性回溯；
  - 闭包导致的内存泄漏；
  - CPU 密集型任务导致事件循环 delay 严重；
  - 未捕获的异常导致进程频繁退出，守护进程（pm2/supervisor）又将进程重启，这种频繁的启停也会比较消耗资源；

## 页面解析与处理

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

## 页面静态资源

### JavaScript

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

## 首屏加载

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
