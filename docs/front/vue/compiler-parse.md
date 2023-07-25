# 编译原理-解析内容

模板编译 Vue 中对 template 属性会编译成 render 方法。[*online template explorer*](https://vue-next-template-explorer.netlify.app/)

本节开始，聚焦 `compile`

[[toc]]

## 新增 compiler-core 包

```ts [package.json]
{
    "name": "@vue/compiler-core",
    "version": "1.0.0",
    "description": "@vue/compiler-core",
    "main": "index.js",
    "module": "dist/compiler-core.esm-bundler.js",
    "buildOptions": {
        "name": "VueCompilerCore",
        "compat": true,
        "formats": [
            "esm-bundler",
            "cjs"
        ]
    }
}
```

## 核心步骤

1. `baseParse`: 将模板转化成 ast 语法树
2. `transform`: 对 ast 语法树进行转化
3. `generate`: 生成代码

> 几乎所有编译都是这三步，包括 rollup、webpack 等。小程序框架开发，也支持过 typescript 编译源码，

```ts
export function compile(template){
  const ast = baseParse(template);
  transform(ast);
  return generate(ast)
}
```

## 生成 ast 语法树

[*online ast*](https://astexplorer.net/)

### 1. 准备语法树相关 type
```ts
export const enum NodeTypes {
  ROOT, // 根节点
  ELEMENT, // 元素
  TEXT, // 文本
  COMMENT, // 注释
  SIMPLE_EXPRESSION, // 简单表达式
  INTERPOLATION, // 模板表达式
  ATTRIBUTE,
  DIRECTIVE,
  // containers
  COMPOUND_EXPRESSION, // 复合表达式
  IF,
  IF_BRANCH,
  FOR,
  TEXT_CALL, // 文本调用
  // codegen
  VNODE_CALL, // 元素调用
  JS_CALL_EXPRESSION, // JS 调用表达式
}
```

### 2. 创建解析上下文
```ts
function createParserContext(content) {
  return {
    line: 1,
    column: 1,
    offset: 0,
    source: content, // source会不停的被截取
    originalSource: content // 原始内容
  }
}
function isEnd(context) {
  const source = context.source;
  return !source;
}
const delimiters = ['<', '{{', '}}', '/>']
function parseChildren(context) {
  const nodes = [];
  while (!isEnd(context)) {
    const s = context.source;
    let node;
    if (s.startsWith(delimiters[1])){
      // 处理表达式类型
    }else if(s[0] === delimiters[0]){
      // 标签的开头
      if(/[a-z]/i.test(s[1])){
        // 开始标签
      } 
    }
    if(!node){ // 文本的处理
        
    }
    nodes.push(node);
  }
  return nodes;
}
function baseParse(template){
  const context =  createParserContext(template);
  return parseChildren(context);
}
```

### 3. 处理文本节点

#### 3.1 采用假设法获取文本结束位置

```ts
function parseText(context) { // 123123{{name}}</div>
  const delimiters = ['<', '{{', '}}', '/>']
  let endIndex = context.source.length;
  for (let i = 0; i < endTokens.length; i++) {
    const index = context.source.indexOf(endTokens[i], 1);
    if (index !== -1 && endIndex > index) {
      endIndex = index;
    }
  }
}
```

#### 3.2 处理文本内容，删除匹配到的结果，计算最新上下文位置信息
::: code-group
```ts [parseText]
function parseText(context) {
  // ...
  let start = getCursor(context); // 1.获取文本开始位置
  const content = parseTextData(context, endIndex); // 2.处理文本数据

  return {
      type: NodeTypes.TEXT,
      content,
      loc: getSelection(context, start) // 3.获取全部信息
  }
}
```
```ts [getCursor | parseTextData | getSelection]
// 获取当前位置
function getCursor(context) {
  let { line, column, offset } = context;
  return { line, column, offset }
}
function parseTextData(context, endIndex) {
  const rawText = context.source.slice(0, endIndex);
  advanceBy(context, endIndex); // 截取内容
  return rawText
}
function getSelection(context,start){
  const end = getCursor(context);
  return {
    start,
    end,
    source:context.originalSource.slice(start.offset,end.offset)
  }
}
```
```ts [advance]
function advanceBy(context, endIndex) {
  let s = context.source;
  // 更改位置信息
  advancePositionWithMutation(context, s, endIndex) 
  context.source = s.slice(endIndex);
}

function advancePositionWithMutation(context, s, endIndex) {
  // 更新最新上下文信息
  let linesCount = 0; // 计算行数
  let linePos = -1; // 计算启示行开始位置
  for (let i = 0; i < endIndex; i++) {
    if (s.charCodeAt(i) === 10) { // 遇到\n就增加一行
        linesCount++;
        linePos = i; // 记录换行后的字节位置
    }
  }
  context.offset += endIndex; // 累加偏移量
  context.line += linesCount; // 累加行数
  // 计算列数，如果无换行,则直接在原列基础 + 文本末尾位置，否则 总位置减去换行后的字节位置
  context.column = linePos == -1 ? context.column + endIndex : endIndex - linePos
}

```
:::

#### 3.4 处理表达式节点

获取表达式中的变量，计算表达式的位置信息

```ts
function parseInterpolation(context) { 
  const start = getCursor(context); // 获取表达式的开头位置
  const closeIndex = context.source.indexOf(delimiters[2], delimiters[1]); // '}}', '{{'
  advanceBy(context, 2);
  const innerStart = getCursor(context); // 计算里面开始和结束
  const innerEnd = getCursor(context);
  const rawContentLength = closeIndex - 2; // 拿到内容
  const preTrimContent = parseTextData(context, rawContentLength);
  const content = preTrimContent.trim(); 
  const startOffest = preTrimContent.indexOf(content);
  if (startOffest > 0) { // 有空格
    advancePositionWithMutation(innerStart, preTrimContent, startOffest); // 计算表达式开始位置
  }
  const endOffset = content.length + startOffest;
  advancePositionWithMutation(innerEnd, preTrimContent, endOffset)
  advanceBy(context, 2);
  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      isStatic: false,
      content,
      loc: getSelection(context, innerStart, innerEnd) // 需要修改getSelection方法
  },
    loc: getSelection(context, start)
  }
}
```

### 5. 处理元素节点

#### 5.1 处理标签

```ts
function advanceSpaces(context){
  const match = /^[ \t\r\n]+/.exec(context.source);
  if(match){
    advanceBy(context, match[0].length);
  }
}
function parseTag(context){
  const start = getCursor(context); // 获取开始位置
  const match = /^<\/?([a-z][^ \t\r\n/>]*)/.exec(context.source); // 匹配标签名
  const tag = match[1];
  advanceBy(context,match[0].length); // 删除标签
  advanceSpaces(context); // 删除空格
  const isSelfClosing = context.source.startsWith('/>'); // 是否是自闭合
  advanceBy(context,isSelfClosing?2:1); // 删除闭合 /> >
  return {
    type: NodeTypes.ELEMENT,
    tag,
    isSelfClosing,
    loc: getSelection(context,start) 
  }
}
function parseElement(context) {
  // 1.解析标签名 
  let ele = parseTag(context);
  if(context.source.startsWith('</')){
    parseTag(context); // 解析标签，标签没有儿子，则直接更新标签信息的结束位置
  }
  ele.loc = getSelection(context, ele.loc.start); // 更新最终位置
  return ele;
}
```

#### 5.2 处理子节点

递归处理子节点元素

```ts
function isEnd(context) {
  const source = context.source;
  if(context.source.startsWith('</')){ // 如果遇到结束标签说明没有子节点
    return true;
  }
  return !source;
}

function parseElement(context) {
  let ele = parseTag(context);
  const children = parseChildren(context); 
  // 因为结尾标签, 会再次触发 parseElement, 这里如果是结尾需要停止
  if(context.source.startsWith('</')){
    parseTag(context); 
  }
  ele.loc = getSelection(context,ele.loc.start); // 更新最终位置
  (ele as any).children = children; // 添加children
  return ele;
}
```

#### 5.3 处理属性
在处理标签后处理属性

::: code-group
```ts [parseTag]
function parseTag(context){
  const start = getCursor(context); 
  const match = /^<\/?([a-z][^ \t\r\n/>]*)/.exec(context.source); 
  const tag = match[1];
  advanceBy(context, match[0].length); 
  advanceBySpaces(context);
  let props = parseAttributes(context); // 处理属性
  // ...
  return {
    type: NodeTypes.ELEMENT,
    tag,
    isSelfClosing,
    loc: getSelection(context, start),
    props
  }
}
```

```ts [parseAttributes]
function parseAttributes(context) {
    const props: any = [];
    while (context.source.length > 0 && !context.source.startsWith('>')) {
        const attr = parseAttribute(context)
        props.push(attr);
        advanceSpaces(context); // 解析一个去空格一个
    }
    return props
}
function parseAttribute(context) {
    const start = getCursor(context);
    const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source)!
    const name = match[0]; // 捕获到属性名
    advanceBy(context, name.length); // 删除属性名

    let value
    if (/^[\t\r\n\f ]*=/.test(context.source)) { // 删除空格 等号
        advanceSpaces(context);
        advanceBy(context, 1);
        advanceSpaces(context);
        value = parseAttributeValue(context); // 解析属性值
    }
    const loc = getSelection(context, start)
    return {
        type: NodeTypes.ATTRIBUTE,
        name,
        value: {
            type: NodeTypes.TEXT,
            content: value.content,
            loc: value.loc
        },
        loc
    }
}
function parseAttributeValue(context) {
    const start = getCursor(context);
    const quote = context.source[0];
    let content
    const isQuoted = quote === '"' || quote === "'";
    if (isQuoted) {
        advanceBy(context, 1);
        const endIndex = context.source.indexOf(quote); 
        content = parseTextData(context, endIndex);  // 解析引号中间的值
        advanceBy(context, 1);
    }
    return { content, loc: getSelection(context, start) }
}
```
:::

#### 5.4 处理空节点
```ts
function parseChildren(context) {
  const nodes: any = [];
  while (!isEnd(context)) {
      //....
  }
  for(let i = 0 ;i < nodes.length; i++){
    const node = nodes[i];
    if(node.type == NodeTypes.TEXT){
      // 如果是文本 删除空白文本，其他的空格变为一个
      if(!/[^\t\r\n\f ]/.test(node.content)){
        nodes[i] = null
      }else{
        node.content = node.content.replace(/[\t\r\n\f ]+/g, ' ')
      }
    }
  }
  return nodes.filter(Boolean)
}
```

#### 5.5 创建根节点

将解析出的节点，再次进行包裹，这样可以支持模板下多个根节点的情况，即: `Fragment`
```ts
export function createRoot(children, loc){
  return {
    type: NodeTypes.ROOT,
    children,
    loc
  }
}
function baseParse(template) {
  // 标识节点的信息  行 列 偏移量
  const context = createParserContext(template);
  const start = getCursor(context);
  return createRoot(
    parseChildren(context),
    getSelection(context, start)
  )
}
```