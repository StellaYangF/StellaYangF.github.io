# 样式

## CSS

### :root 伪类选择器

`:root` 这个 `CSS` 伪类匹配文档树的根元素。对于 `HTML` 来说，`:root` 表示 `<html>` 元素，除了优先级更高之外，与 `html` 选择器相同。

### 示例

在声明全局 CSS 变量时 :root 会很有用：

```css
:root {
  --main-color: hotpink;
  --pane-padding: 5px 42px;
  --card-skeleton: linear-gradient(lightgrey var(--card-height), transparent 0);
}
```

### 运用骨架屏

<div class='el-main'>
  <skeleton></skeleton>
</div>

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

#### 嵌套 CSS 规则

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

**父元素选择器标识符&**

```sass
article a {
  color: blue;
  &:hover { color: red }
}

// 编译后
article a { color: blue }
article a:hover { color: red }
```

**群组选择器的嵌套**

```sass
nav, aside {
  a {color: blue}
}

// 编译后
nav a, aside a {color: blue}
```

**子组合选择器和同层组合选择器：>、+和~**

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

**嵌套属性**

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

#### 导入SASS文件

使用sass的@import规则并不需要指明被导入文件的全名。你可以省略.sass或.scss文件后缀

**使用SASS部分文件**

sass局部文件的文件名以下划线开头。这样，sass就不会在编译时单独编译这个文件输出css，而只把这个文件用作导入

举例来说，你想导入themes/_night-sky.scss这个局部文件里的变量，你只需在样式表中写@import "themes/night-sky";。

**默认变量值**

反复声明一个变量，只有最后一处声明有效且它会覆盖前边的值


**嵌套导入**

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

#### 混合器

通过sass的混合器实现大段样式的重用。

关键字 `@mixin` className, `@include` className

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

**混合器传参**

用法：
`@mixin className(arg1, arg2, ...)`

`@include className(param1, parma2, ...)`

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

> sass 允许通过语法` $name: value` 的形式指定每个参数的值。这种形式的传参，参数顺序就不必再在乎了，只需要保证没有漏掉参数即可：

```sass
a {
    @include link-colors(
      $normal: blue,
      $visited: green,
      $hover: red
  );
}
```

#### 使用选择器继承来精简CSS

关键字 `@extend`

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
