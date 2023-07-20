# HTTP 协议

基于 TCP/IP 协议的应用协议

[[toc]]

## HTTP/0.9

特点：1991年
- 不涉及传输包 packet
- 只支持 `GET` 命令
- HTML 格式字符串，，只能请求网页文档

```cmd
GET /index.html
```

## HTTP/1.0

特新：1996年
- 任何格式的内容都可以发送，图片，视频等
- 除了 `GET` 命令，还引入了 `POST` 命令和 `HEAD` 命令(无响应体，同`GET`)，丰富了浏览器与服务器的互动手段。
- HTTP 请求和回应的格式也变了。
  - 除了数据部分，每次通信都必须包括头信息`HTTP header`，用来描述一些元数据。
  - `Content-Type`
  - `Content-Length`
  - `Expires`
  - `Last-Modified`
  - `Server`
  - `Content-Encoding`: `chunked`/ `gzip`/ `deflate`/ `compress`/ `identify`
  - `User-Agent`
  - `Accept-Encoding`
- 状态码（`status code`）、多字符集支持、多部分发送（`multi-part type`）、权限（`authorization`）、缓存（`cache`）、内容编码（`content encoding`）等。

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

## HTTP/1.1

特性：
- 持久连接（`persistent connection`），无需声明 Connection: keep-alive
  - 客户端最后一个请求，发送 Connection: close，明确要求服务器关闭 TCP 链接
- 管线化 (`pipeline`)，同时发多个请求，顺序返回
  - 对头堵塞 (`Head-of-line blocking`)
- `Content-Length` 区分是哪个回应
- `Transfer-Encoding`: chunked 分块传输编码 buffer => 流
- 新增了许多动词方法：
  - `PUT`替
  - `PATCH`改
  - `HEAD`报文头
  - `OPTIONS`
    - 预检`prelight`（目标资源，通信选项如跨域 204）
    - `Access-Control-Allow-Origin`
    - `Access-Control-Allow-Methods`
    - `Access-Control-Allow-Headers`
    - `Access-Control-Allow-Credentials`
    - `Access-Control-Allow-Expose-Headers`
    - `Access-Control-Allow-Max-Age`
  - `DELETE`
- Host 指定服务器域名
- Etag

## HTTP/2.0

特性：

- HTTP/1.1 头信息肯定是文本（ASCII编码），数据体可以是文本，也可以是`二进制`
- HTTP/2 则是一个彻底的二进制协议，头信息和数据体都是二进制，并且统称为"帧"（frame）：头信息帧和数据帧
- 多工（`multiplexing`），不按顺序返回，避免对头堵塞
- 数据流
- 头信息压缩
  - 头信息使用 `gzip` 或 `compress` 压缩后再发送
  - 客户端和服务器同时维护一张头信息表，所有字段都会存入这个表，生成一个索引号，以后就不发送同样字段了，只发送索引号，这样就提高速度了。
- 服务器推送 `server push`
  - 服务器可以预期到客户端请求网页后，很可能会再请求静态资源，所以就主动把这些静态资源随着网页一起发给客户端了。
  - 详见[性能章节](../front/performance/#push-cache)


