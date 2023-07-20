# cookie vs session

## 缓存

在[前端-性能优化](../front/performance/index)中探讨过缓存，具体可详见该章节内容。

以下做简单回顾：

作用：
- 减少冗余数据传输，节省带宽
- 减少服务器负担，大大提高网站性能
- 加快客户端加载网页速度

## cookie

res.cookie(name, value, [, options])

### 参数
- `domain`
- `path`
- `httpOnly`: 客户端不能通过 `document.cookie`代码获取、修改。防 `xss` 攻击(jsonp)
- `maxAge`: Number
- `expires`: Date
- `secure`：只通过 https 协议访问 cookie
- `sameSite`：2020.02发布 chrome80，新增属性，防 `csrf` 攻击、用户追踪
  - `Strict`：完全禁止，跨站点不发 cookie
  - `Lax`：（默认值）
  - `None`: 必须与 Secure 同用

### 注意

- 可能被客户端篡改，使用前验证合法性
- 不要存储敏感数据，比如用户密码，账户余额
- 使用 `httpOnly` 保证安全，
- 尽量减少 cookie 的体积
- 设置正确的 domain 和 path，减少数据传输

document.cookie 可以获取 cookie

## session

- session 是另一种记录客户状态的机制，不同的是Cookie保存在客户端浏览器中，而 session 保存在服务器上
- 客户端浏览器访问服务器的时候，服务器把客户端信息以某种形式记录在服务器上，这就是session。客户端浏览器再次访问时只需要从该 session 中查找该客户的状态就可以了

### 二者区别
- cookie 数据存放在客户的浏览器上，session 数据放在服务器上。
- cookie 不是很安全，别人可以分析存放在本地的 cookie 并进行 COOKIE 欺骗，考虑到安全应当使用 session
- session 会在一定时间内保存在服务器上。当访问增多，会比较占用你服务器的性能，考虑到减轻服务器性能方面，应当使用 cookie
- 单个 cookie 保存的数据不能超过 4K，很多浏览器都限制一个站点最多保存20个cookie