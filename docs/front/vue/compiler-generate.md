# 编译原理-生成代码

[[toc]]

## 创建生成上下文

生成代码时需要将生成的代码拼接成字符串，同时添加换行缩进等。

::: code-group
```ts [createCodegenContext]
function createCodegenContext(){
  const context = {
    code: ``,
    indentLevel: 0,
    helper(key) {
      return `_${helperNameMap[key]}`
    },
    push(code) {
      context.code += code
    },
    indent(){ // 前进
      newline(++context.indentLevel)
    },
    deindent(withoutnewline = false){ // 缩进
      if (withoutnewline) {
        --context.indentLevel
      } else {
        newline(--context.indentLevel)
      }
    },
    newline(){ 
      newline(context.indentLevel) 
    } // 换行
  }
  function newline(n){
    context.push('\n' + `  `.repeat(n))
  }
  return context
}
```
```ts [generate]
function generate(ast){
  const context = createCodegenContext();
}
```
```ts [compile]
export function compile(template){
  // 1.将模板转化成ast语法树
  const ast = baseParse(template);
  // 2.对ast语法树进行转化
  transform(ast);
  // 3.生成代码
  return generate(ast)
}
```
:::

## 生成文本代码

仅仅是文本直接返回即可
::: code-group
```ts [genText]
function genText(node, context){
  context.push(JSON.stringify(node.content)) // 添加文本代码
}
function genFunctionPreamble(ast,context){ // 生成函数
  const {push, newline} = context
  if(ast.helpers.length > 0){ // 生成导入语句
    push(`const {${ast.helpers.map((s)=>`${helperNameMap[s]}:_${helperNameMap[s]}`).join(', ')}} = Vue`)
  }
  newline()
  push(`return `)
}
function genNode(node, context){
  switch(node.type){
    case NodeTypes.TEXT:
      genText(node, context) 
      break;
  }
}
function generate(ast){
  const context = createCodegeContext();
  const {push, indent} = context
  genFunctionPreamble(ast, context);
  const functionName = 'render';
  const args = ['_ctx', '$props'];
  push(`function ${functionName}(${args.join(', ')}){`)
  indent();
  push(`return `)
  if (ast.codegenNode) {
    genNode(ast.codegenNode, context)
  } else {
    push(`null`)
  }
  return context.code
}
```

```ts [example]
compile('hello world')
```
:::

## 生成表达式代码

::: code-group
```ts [genExpression]
function genExpression(node, context){
  const { content } = node
  context.push(content)
}
function genInterpolation(node, context){
  const { push, helper } = context
  push(`${helper(TO_DISPLAY_STRING)}(`)
  genNode(node.content, context)
  push(`)`)
}
function genNode(node, context){
  switch(node.type){
    case NodeTypes.TEXT:
      genText(node, context)
      break;
    case NodeTypes.INTERPOLATION: // 生成表达式
      genInterpolation(node, context)
      break; 
    case NodeTypes.SIMPLE_EXPRESSION: // 简单表达式的处理
      genExpression(node, context)
      break
  }
}
```

```ts [example]
compile('{{age}}')
```
:::

## 生成元素表达式

::: code-group
```ts [genVNodeCall]
function genNodeList(nodes, context){ // 生成节点列表，用","分割
  const { push } = context;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (isString(node)) {
    push(`${node}`); // 如果是字符串直接放入
    }else if(Array.isArray(node)){
      genNodeList(node, context)
    } else {
      genNode(node, context);
    }
    if (i < nodes.length - 1) {
      push(", ");
    }
  }
}
function genVNodeCall(node, context){
  const {push,helper} = context;
  const {tag, props, children, isBlock} = node

  if(isBlock){
    push(`(${helper(OPEN_BLOCK)}(),`)
  }
  // 生成createElementBlock或者createElementVnode
  const callHelper = isBlock ? CREATE_ELEMENT_BLOCK: CREATE_ELEMENT_VNODE; 
  push(helper(callHelper));
  push('(');
  genNodeList([tag, props, children].map(item=>item || 'null'), context);
  push(`)`)
  if(isBlock){
    push(`)`)
  }
}
function genNode(node, context){
  switch(node.type){
    case NodeTypes.VNODE_CALL: // 元素调用
      genVNodeCall(node, context);
      break;
  }
}
```

```ts [example]
compile(`<div a='1' b='2'>123</div>`)
```
:::

## 生成元素属性

```ts
function genObjectExpression(node, context) {
  const { push, newline } = context
  const { properties } = node
  if (!properties.length) {
    push(`{}`)
    return
  }
  push('{')
  for (let i = 0; i < properties.length; i++) {
    const { key, value } = properties[i]
    // key
    push(key);
    push(`: `)
    push(JSON.stringify(value));
    // value
    if (i < properties.length - 1) {
      push(`,`)
    }
  }
  push('}')
}
function genNode(node,context){
  switch(node.type){
    case NodeTypes.JS_OBJECT_EXPRESSION:
      genObjectExpression(node, context)
      break
  }
}
```

## 处理复合表达式

::: code-group
```ts [genCompoundExpression]
function genCompoundExpression(node, context) {
  for (let i = 0; i < node.children!.length; i++) {
    const child = node.children![i]
    if (isString(child)) {
      context.push(child)
    } else {
      genNode(child, context)
    }
  }
}
function genNode(node, context){
  switch(node.type){
    case NodeTypes.COMPOUND_EXPRESSION:
      genCompoundExpression(node, context)
      break
  }
}
```

```ts [example]
compile(`<div>123 {{abc}}</div>`)
```
:::

## 复合表达式 + 元素处理

::: code-group
```ts [genCallExpression]
function genCallExpression(node, context) {
  const { push, helper } = context
  const callee = helper(node.callee)

  push(callee + `(`, node)
  genNodeList(node.arguments, context)
  push(`)`)
}
function genNode(node, context){
  switch(node.type){
    // ...
    case NodeTypes.TEXT_CALL: // 对文本处理
      genNode(node.codegenNode, context)
      break
    case NodeTypes.JS_CALL_EXPRESSION: // 表达式处理
      genCallExpression(node, context)
      break
  }
}
```

```ts [example]
compile(`<div>123 {{name}} <span>{{name}}</span></div>`)
```
:::