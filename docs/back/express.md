# What is `express`?
***Fast, unopinionated, minimalist web framework for node.***
[express](https://www.npmjs.com/package/express) 是一个基于 `node` 的 web 服务器，其特点是：快速、简单、小型。

特点：
- Robust routing 强大的路由系统
- Focus on high performance 高性能
- Super-high test coverage 测试覆盖率超高
- HTTP helpers (redirection, caching, etc) `HTTP` 各种助力如重定向、缓存等
- View system supporting 14+ template engines 支持 14种以上的视图引擎
- Content negotiation 内容协商?
- Executable for generating applications quickly 快速可执行的运用程序

最开始接触 `node` 的时候，用过的后台框架就是 `express`，当时只能根据官网的 `documentation API` 写最简单的几个接口。相比 `koa` （二者参考比较见 [koa | analysis](https://juejin.im/post/5e564b426fb9a07caf445c97)），内部继承了开发中可能用到的包模块，直接引入即可，无需另行下载依赖。现有 [express-generator](https://www.npmjs.com/package/express-generator) 脚手架，全局下载安装就能使用啦~

话不多说，直入正题。


# Init project 初始化项目

```bash
mkdir express_practice
cd express_practice
npm init -y
```

# Installation 安装
This is a Node.js module available through the npm registry.
express 是一个 node 模块，可通过 `npm registry` 仓库下载。
Before installing, download and install Node.js. Node.js 0.10 or higher is required.
首先，你得下载、安装 node > 0.10 版本
Installation is done using the npm install command:
使用 `npm install` 命令行完成下载。 


```bash
npm i express --save
or
npm i express
or
npm i express -S
```

# Usage 使用
## 新建 app.js
创建 web 应用程序的文件。


```bash
touch app.js
```

## 引入依赖模块
- express 核心模块
- app.Router 是一个类
- user 是一个二级路由实例

```js
const express = require('express');
const app = express();
const Router = app.Router;
const user = new Router();
```

## user 路由下的请求
- 三个参数
- next 调用不传参，就是让路由系统在没有匹配的路径和方法时，往下一个中间件走；传入参数就是抛出错误


```js
user.get('/remove', (req, res, next) => {
    res.send(`/user/remove`)
    next();
})
user.get("/add", (req, res, next) => {
    res.end('/user/add');
    next();
})
```

## app 应用的请求


```js
app.get('/', function (req, res) {
  res.send('Hello World')
})

app.get('/', function (req, res) {
  res.send('Hello World')
})
```


## 注册 user 二级路由系统
- 注册中间件
- 接口一： /user/remove
- 接口二： /user/add


```js
app.use('/user', user);
```

## 错误捕获处理
- 错误中间件
- 四个参数，第一个参数就是捕获的错误
- 该错误是由前面请求中，调用 next 


```js
app.use(function(err, req, res, next) {
    if (err) res.send(err);
})
```



## 监听端口


```js
app.listen(3000);
```


## express 核心概念
express 核心用到的就是 commonjs 规范，基本都是基于回调实现的中间件与请求。
### outlet structure 目录结构


```bash
└──express
   ├──index.js
   └──lib
       ├──express.js
       ├──application.js
       └──router
           ├──index.js
           ├──layer.js
           └──route.js
```


# Fulfill 实现
新建包文件及其子文件


```bash
mkdir express && cd express
touch index.js
mkdir lib && cd lib
touch express.js
touch application.js
mkdir router && cd router
touch index.js
touch layer.js
touch route.js
```


## express/index.js
express 本质就是一个函数，调用后就返回一个 `Application` 运用类实例


```js
module.exports = require("./lib/express");
```


> express 采用的是 commonjs 规范。文件的导出和引入分别是: `require()`, `module.exports`。

## express/lib/express.js
### 引入 `Application` 应用系统 和 `Router` 路由系统
- **应用** 和 **路由** 两大系统各司其职。
- `createApplication` 为工厂函数，函数体内实例化一个 [`Application`](#application) 实例对象并返回，为每一个引入 `express` 包模块产生一个独立的 应用实例。
- `createApplication.Router` 挂载的是一个 Router 类，将路由系统独立使用。


```js
const Application = require('./application');
const Router = require('./router');
```


### `createApplication` 实例化应用实例的函数


```js
function createApplication() {
    return new Application();
}
```


### 给函数添加 Router 属性


```js
createApplication.Router = Router;
```


> 注意：函数也是一个对象，可以添加属性。

### 导出函数


```js
module.exports = createApplication;
```


##  <span id='application'>express/lib/application.js</span>

### 下载第三方工具库


```bash
npm i methods --save
```


### 引入依赖包
- `http` `node` 核心模块，不需要下载安装，用来调用 `http.createServer()` 创建一个 web 服务。
- `Router` 路由系统类，详情见 [router.js](#router)
- `methods` 第三方库 `declare const methods: string[];`


```js
const http = require('http');
const Router = require('./router');
const methods = require('methods');
```


### 创建 `Application` 类
- 实例属性 `config`
- 实例属性 `_router`，后续会记性优化*


```js
function Application(){ 
    this.config = {};
    this._router = new Router;
}
```


### set 实例方法
- 参数为2个时，设置操作
- 参数为1个时，取值操作


```js
Application.prototype.set = function (key, value) {
    if (arguments.length === 2) {
        this.config[key] = value;
    } else {
        return this.config[key];
    }
}
```


### layze_route 实例方法
性能优化：
- 修改 constructor 里的实例属性。
- 取代 Application 一旦实例化，就初始 _router 属性，客户端如果不调用 (any method)请求 | param 方法，只是调用了 use 方法，就会造成性能浪费。
- _router 只有一个，也就是只需要实例化一次进行赋值。


```js
function Application(){ 
     this.config = {};
-    this._router = new Router;
}
```



```js
Application.prototype.lazy_route = function() {
    if (!this._router) return this._router = new Router();
}
```


### param 实例方法
具体实现都交给 _router 路由系统来处理


```js
Application.prototype.param = function (key, handler) {
    this.lazy_route();
    this._router.param(key, handler);
}
```


### use 实例方法
具体实现都交给 _router 路由系统来处理


```js
Application.prototype.use = function(path, handler) {
    this.lazy_route();
    this._router.use(path, handler);
}
```


### method 实例方法
具体实现都交给 _router 路由系统来处理
可传入多个回调函数 `handlers`


```js
methods.forEach(method => {
    Application.prototype[method] = function(path, ...handlers) {
        if (method === 'get' && arguments.length === 1) {
            return this.set(path);
        }
        this.lazy_route();
        this._router[method](path, ...handlers);
    }
})
```


### <span id='listen'>listen 实例方法</span>
- 调用`http.createServer(function(req, res))`, 创建一个 server 服务；
- 准备一个 `done` 方法，供路由系统没有匹配的路由(方法和路径)时使用，调也就是 `next` 方法；
- 调用 `_router.handle`，传入`req`, `res`, `done`三个参数，让路由系统来处理请求，并作出响应；
- 指定监听的端口号，选择性传入回调函数。


```js

Application.prototype.listen = function() {
    let server = new http.createServer((req, res) => {
        function done() {
            res.end(`Cannot ${req.method} ${req.url}`);
        }
        this.lazy_route();
        res.send = res.end;
        this._router.handle(req, res, done);
    });
    server.listen(...arguments);
}
```


### 导出 `Application` 类


```js
module.exports = Application;
``` 


## <span id='router'>express/lib/router/index.js</span>
### 引入依赖模块


```js
const url = require('url');
const methods = require('methods');
const Route = require('./route');
const Layer = require('./layer');
```


### 声明一个 `proto` 对象
- 供 `Router` 类的构造函数内部的 `router` 函数继承 


```js
const proto = {};
```


### 创建 `Router` 类
- `constructor` 函数内部返回一个 `router` 函数，且该函数包含多个属性/方法
- 为什么要重写构造函数？
    - 供二级路由使用

    <highlight>

    ::: slot default
    ```js
    // user 就是一个中间件，
    const user = new app.Router();
    // application 实例调用 use 时，会把 req, res, next 传入 
    app.use('user', user);
    // user 函数调用就是 router 调用，进而调用 router.handle 函数
    ```
    :::
    </highlight>


```js
function Router() {
    const router = function (req, res, next) {
        router.handle(req, res, next);
    }
    router.stack = [];
    router.__proto__ = proto;
    router.paramsCallback = {}; // { key: [fn, fn] }
    return router;
}
```


> 注意：
- 可以简单粗暴的理解 `router` 的**机制**，就是经典的 `发布订阅` 模式；
- 订阅阶段：

     调用 `use/ get/ post/ ...` 时，就是往 `stack` 数组中添加一层 [layer](#layer)

- 发布阶段：
    - 调用 `app.listen()` 时，见 [Application.prototype.listen](#listen)

- `Router` 的实例化有两种情况：
    - 调用 `app[method](path, handlers)` 的时候
    - 调用 `app.Router` 进行二级路由的实例 

### param 方法


```js
proto.param = function (key, handler) {
    if (this.paramsCallback[key]) {
        this.paramsCallback[key].push(handler);
    } else {
        this.paramsCallback[key] = [handler];
    }
}
```


### route 方法
- 实例化一条 `route` 路由 
- 实例化一个 `layer` 层
- 完成一条订阅
- 返回这个 `route` 


```js
proto.route = function (path) {
    const route = new Route();
    const layer = new Layer(path, route.dispatch.bind(route));
    layer.route = route;
    this.stack.push(layer);
    return route;
}
```


### use 方法
- 调用 route 方法
- 实例化一个 `layer` 层
- `layer.route` 设置为 `undefined` 值，方便在发布的时候判断为普通中间件，内部没有 `route` 路由


```js
proto.use = function (path, handler) {
    if (typeof path === 'function') {
       handler = path;
       path = "/";
    }
    const layer = new Layer(path, handler);
    layer.route = undefined;
    this.stack.push(layer);
}
```


### get/ post/ delete/ update ... 方法
- 每调用一次，就新加一层 `layer`
- 触发 `route[method]`


```js
methods.forEach(method => {
    proto[method] = function (path, ...handlers) {
        let route = this.route(path);
        route[method](handlers);
    }
})
```


### process_params 参数方法


```js
proto.process_params = function (layer, req, res, done) {
    if (!layer.keys || layer.keys.length === 0) {
        return done();
    }
    // key [id, name]
    let keys = layer.keys.map(item => item.name);
    let params = this.paramsCallback;
    let idx = 0;
    function next () {
        if (keys.length === idx) return done();
        let key = keys[idx++];
        processCallback(key, next);
    }
    next();
    function processCallback(key, out) {
        let fns = params[key];
        if (!fns) {
            return out();
        }
        let idx = 0;
        let value = req.params[key];
        function next() {
            if (fns.length === idx) return out();
            let fn = fns[idx++];
            fn(req, res, next, value, key);
        }
        next();
    }
}
```


### handle 方法
- 发布之前订阅的方法 | 中间件；
- `out` 函数就是 [Application.prototype.listen](#listen) 内部传入的 `done` 方法，表示结束；
- `dispatch` 为核心方法，采用递归方式；
- `removed` 为二级路由的子路径，当请求路径为/user/add， 第一轮匹配 `/user` 时，会先删除，再进一步往 route 层 处理，此时路径为 /add，当 /add 无法匹配，则递归调用 `dispatch` 调用下一个 layer，再把 /user 追加回来。


```js
proto.handle = function (req, res, out) {
    let { pathname } = url.parse(req.url);

    // 从 stack 第一个层开始处理
    let idx = 0;
    let removed = "";

    // 核心方法 err 是 next 函数调用传来的，表示错误捕获
    const dispatch = err => {
        // stack 为空，直接 out
        if (idx === this.stack.length) return out();

        // 若 removed 有值没说明上一轮匹配失败，本轮重新匹配，再次追加上
        // 清空 removed
        if (removed) {
            req.url = removed + req.url;
            removed = "";
        }

        // 获取当前 layer 层，并 把指针向下引
        let layer = this.stack[idx++];

        // 若捕获到错误
        if (err) {
            // 当前 layer 不是错误中间件，交给 layer 错误处理，不会往下走
            if (!layer.route) {
                layer.handle_err(err, req, res, dispatch);
            } else {
                // 当前就是错误捕获中间件 app.use((err, req, res, next) => {})
                // 交给它处理
                return dispatch(err);
            }
        } else {
            // 没有错误 且匹配到
            if (layer.match(pathname)) {
                if (!layer.rout) { // 如果是中间件 直接执行 对应的方法即可
                    // 在这里把中间件的路径 删除掉
                    // /user/add   /
                    if (layer.handler.length !== 4) {
                        if (layer.path !== '/') { // 如果中间件就是/
                            removed = layer.path;
                            req.url = req.url.slice(removed.length)
                        }
                        layer.handle_request(req, res, dispatch);
                    } else {
                        dispatch();
                    }
                } else {
                    // 路由
                    if (layer.route.methods[req.method.toLowerCase()]) {
                        req.params = layer.params;
                       this.process_params(layer, req, res, () => {
                          layer.handle_request(req, res, dispatch);
                       })
                    } else {
                        dispatch();
                    }
                }
            } else {
                dispatch();
            }
        }

    }
    dispatch();
}
```


### 导出 `Router` 类 


```js
module.exports = Router;
```


## <span id='layer'>express/lib/router/layer.js</span>
### 下载依赖包


```js
npm i path-to-regexp --save
```


### 引入依赖包
- [path-to-regexp](https://www.npmjs.com/package/path-to-regexp)


```js
const { pathToRegexp } = require('path-to-regexp');
```


### 创建 Layer 类
层的运用在两个场景
- 在 `Router.stack` 中，每一个数组元素都是 `layer`；
- 在 `Route.stack` 中，同上。


```js
function Layer(path, handler) {
    this.path = path;
    this.handler = handler;
    this.reg = pathToRegexp(this.path, this.keys=[]);
}
```


### match 方法


```js
Layer.prototype.match = function(pathname) {
    let match = pathname.match(this.reg);
    if (match) {
        this.params = this.keys.reduce((memo, current, index) => (memo[current.name] = match[index+1], memo), {});
        return true;
    }
    if (this.path === pathname) return true;
    if (!this.route) {
         if(this.path === '/'){
            return true;
        }
        return pathname.startsWith(this.path+'/')
    }
}
```


### handle_request 方法
核心


```js
Layer.prototype.handle_request = function(req, res, next) {
    this.handler(req, res, next);
}
```


### <span id='handle_err'>handle_err 方法</span>


```js
Layer.prototype.handle_err = function(err, req, res, next) {
    // 可能是错误中间件
    if (this.handler.length === 4) {
        return this.handler(err, req, res, next);
    }
    next(err);
}
```


### 导出 Layer 类


```js
module.exports = Layer;
```


## <span id='route'>express/lib/router/route.js</span>
### 引入依赖包


```js
const methods = require('methods');
const Layer = require('./layer');
```


### 创建 `Route` 类


```js
function Route() {
    this.stack = [];
    this.methods = {};
}
```


> methods 实例方法用来快速定位当前的 匹配方法是否正确，节约性能

### dispatch 实例方法
核心


```js
Route.prototype.dispatch = function (req, res, out) {
    let index = 0;
    let method = req.method.toLowerCase();
    const dispatch = err => {
        if (err) return out(err);
        if (index === this.stack.length) return out();
        let layer = this.stack[index++];
        if (layer.method === method) {
            layer.handle_request(req, res, dispatch);
        } else dispatch();
    }
    dispatch();
}
```


### [method] 实例方法


```js
methods.forEach(method => {
    Route.prototype[method] = function (handlers) {
        handlers.forEach(handler => {
            let layer = new Layer('/', handler);
            layer.method = method; // 用户调用什么方法 存入method就是什么
            this.methods[method] = true; // 如果用户绑定方法 我就记录一下
            this.stack.push(layer);
        });
    }
});
```


### 导出 Route 类


```js
module.exports = Route;
```


# DONE
写了好久，告一段落 - 后续补上一个简单的图以便更好理解学习。

文中若有误，欢迎指正。

一篇文章写到快转钟，连坐好几个小时，还有点上头呢。

Good news~~~

今天听到了好消息，就是武汉所有的方舱医院已休仓，我们的祖国计是伟大呢，现在就是要开始倒计时复工了呢~