---
emoji: '🛠️'
title: 'Chrome DevTools 系列目录'
seoTitle: 'Chrome DevTools 系列目录：32 个问题'
date: '2026-11-19'
categories: 前端 DevTools
description: '本系列以读者打开 Network、Elements、Sources 等面板时提出的问题为线索，逐一介绍 Chrome DevTools。这里列出 32 篇文章、阅读顺序、公开页面的观察范围与测量方法，以及通过本地代码复现的内容。'
keywords: 'Chrome DevTools 教程, DevTools 系列目录, Network 面板, Elements 面板, Performance 面板, 浏览器开发者工具, 前端开发'
locale: zh-CN
translationOf: '261119'
sourceHash: 702bba9ed249e486a86c7ef8f342eb15e8e15bf31740c2ac62f44abae34eb97d
---

打开 Network 面板查看页面性能的读者，可以在本系列中按问题查找 DevTools 的其他面板和具体功能。每篇文章围绕一个问题展开，介绍用于寻找答案的功能。

我在公司处理页面性能时每天都会打开 Network 面板。使用浏览器开发者工具时，人们常常只用自己熟悉的功能。因此我写了这个系列，逐一深入介绍 Elements、Sources、Console、Network、Performance、Memory、Application、Security、Lighthouse 和 Recorder。我会以官方文档和专业资料为依据进行讲解，也会加入真实浏览器界面的截图。

## 按问题划分的 32 篇文章

本系列的目录不是按标签页名称划分，而是围绕读者打开标签页时提出的问题组织。罗列功能的文章会变成一份功能目录，因为最后一节无法用一个决定把前面的章节串联起来。每篇文章聚焦一个问题，只整理回答该问题所需的功能。一个标签页中未能涵盖的功能，会在同一标签页的下一篇文章中围绕另一个问题介绍。

每篇文章都可以独立阅读，不必先读前一篇。如果一个面板无法通过一个问题讲完，就会拆分成子系列。我会对照官方文档和真实的 Chrome 界面，列出面板中的所有元素，并决定每个元素由哪篇文章介绍。目录共有 32 篇。

### Network

- **首屏会接收什么，接收多少**：请求列表、筛选器、列、Size、Initiator。[通过 Network 面板追踪 42 MB](/261120)
- **一个请求的时间花在哪里**：Waterfall、Timing 阶段、Priority、Protocol、Connection ID
- **请求和响应中传输了什么**：详情标签页、Cookie、preflight、WebSocket、EventStream
- **如何通过改变条件缩小原因范围**：throttling、Request conditions、Overrides、Copy as、HAR

### Elements

- **页面上的这个元素在 DOM 的哪里**：树、徽标、搜索、编辑、Break on
- **这个样式来自哪里**：Styles、Computed、cascade layer、各类编辑器
- **如何查看布局和无障碍信息**：Layout、Accessibility、Properties、Event Listeners

### Console

- **如何筛选并阅读控制台消息**：级别、筛选器、设置、堆栈跟踪
- **如何在控制台中检查页面**：Utilities、Live expressions、对象查看

### Sources

- **如何阅读压缩后的 bundle**：文件树、pretty print、source map、ignore list
- **如何决定何时暂停**：11 种断点
- **暂停后看什么**：Scope、Watch、Call Stack、执行控制、Threads
- **如何保留在 DevTools 中修改的代码**：Snippets、Workspace、Overrides、Changes

### Performance

- **录制前看什么**：Local metrics、Field metrics、Environment settings
- **如何阅读录制结果中的轨道**：概览、Main flame chart、Network、Frames、Interactions、Layout shifts
- **如何缩小问题原因的范围**：Summary、Bottom-up、Call tree、Event log、Insights
- **如何进行更深入的测量**：Capture settings、Layers、Selector stats、Annotations、扩展 API

### Memory

- **什么占用了内存**：4 种 heap snapshot 视图、retainers
- **内存何时增加**：Allocations on timeline、sampling、Detached elements、Performance monitor

### Application

- **Toss 在浏览器中存储了什么**：Cookie、storage、IndexedDB、Cache storage、Storage buckets
- **页面关闭后仍会运行的内容**：Service worker、Manifest、Background services
- **让返回和前往下一页更快的机制**：bfcache、Speculative loads、Frames

### Security、Issues

- **在哪里查看浏览器发出的警告**：Security、Issues

### Lighthouse

- **除了分数，还要看什么**：3 种模式、throttling 方式、结果

### Recorder

- **录制用户流程并将其转换为测试**：Recorder

### Coverage

- **接收的代码中有多少实际运行了**：Coverage

### Rendering

- **直观查看屏幕的重绘位置，模拟媒体查询**：Rendering

### Layers、Animations

- **合成图层与动画**：Layers、Animations

### Performance monitor

- **用实时指标查看长时间打开的页面**：Performance monitor

### Device mode、Sensors

- **模拟移动环境及其局限**：Device mode、Sensors

### 代理、AI

- **向 AI 代理开放 DevTools**：DevTools for agents、AI assistance

### 快速操作

- **如何快速操作 DevTools**：Command menu、Search、Quick source、快捷键、Settings

## 不涵盖的内容

- 不介绍 Media、WebAudio、WebAuthn、Autofill 面板，以及仍处于预览阶段的 CSS overview。
- Memory inspector 会在 Memory 文章中介绍，Developer resources 会在 Sources 的第一篇文章中用一段话介绍。

本系列结束后，我会另写一篇面向原生开发的移动端文章。

## 观察范围与实测方法

观察对象是 Toss Bank 和 Toss Securities 的公开页面。我不登录账号，而是使用新建的配置文件打开页面查看，也不会截图登录页面和账户数据。我无法知道服务为何采用这样的设计，因此不会对此做出判断。我会介绍面板显示的数字，以及这些数字的产生原理。

真实服务的页面会随着部署变化，甚至同一天内也可能变化。因此，我会为所有数值标注测量日期和 Chrome 版本，同一篇文章中使用的数值和截图也只采用一次连续测量所得的内容。介绍断点和 heap snapshot 的文章会使用本地代码，方便读者跟着操作。服务 bundle 已经过压缩，读者无法照着“在这一行暂停就能看到这个值”的过程操作。需要时，我也会制作复现相同结构的小型演示，并一并测量。

## 阅读顺序

我会先写 Network 的四篇文章。读懂 Network 后，就更容易查看 Performance 的 Network 轨道和 Application。接下来按 Elements、Console、Sources 第一篇、Performance 的顺序撰写。Sources 中另外三篇需要使用本地代码的文章，以及 Memory 的两篇文章，会在之后撰写。其余面板的顺序尚未确定。

每发布一篇文章，我都会在本目录中添加链接。想了解每篇文章涵盖的面板和功能，可以按照上面的条目查看。

:::ref
- [docs] [Chrome for Developers，Chrome DevTools](https://developer.chrome.com/docs/devtools)
:::