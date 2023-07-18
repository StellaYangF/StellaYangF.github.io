# 架构介绍

## monorepo 管理代码

Vue3源码采用 monorepo 方式进行管理，将模块拆分到 package 目录中。
Monorepo 是管理项目代码的一个方式，指在一个项目仓库(repo)中管理多个模块/包(package)。

- 一个仓库可维护多个模块，不用到处找仓库
- 方便版本管理和依赖管理，模块之间的引用，调用都非常方便

## 项目结构

![vue3 structure](../assets/vue3.structure.png)

## 类型检查

- Vue3源码采用 `Typescript` 来进行重写 , 对Ts的支持更加友好
- Vue2 采用 `Flow` 来进行类型检测 （Vue2中对TS支持并不友好）
