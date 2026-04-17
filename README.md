# 儿童 AI 科普学习平台
面向 6–12 岁儿童的 AI 科普内容生成平台。孩子输入（或语音提出）一个好奇心问题，系统自动生成包含快速解答、分级大纲、图文段落、思考题和播客音频的完整学习材料。

## 技术栈
React 19、TypeScript、Node.js、Express

## 特点
多 Agent 并行编排，树状依赖调度
quickAnswerBot 与 outlineBot 并行执行（L1），通过事件驱动（inference-done）依次触发 subTopicsBot → N 个 paragraphBot → N 个 podcastBot，将单次请求拆分为 5 层异步流水线，实现"秒出摘要、渐进生成全文"体验。

## 自定义 SSE 数据协议，前端路径式增量更新
单条 SSE 连接同时承载 quick-answer / outline / topics 三路数据流，服务端推送 {uri, delta} 事件，前端通过 jsonuri 精准更新嵌套状态树对应节点，相比全量 JSON 推送减少传输数据量。

## 联网搜索增强生成(RAG)
将用户问题转化为多条搜索 query，并行调用 Serper Google Search API 获取网络知识，然后作为上下文注入prompt，提升科普内容准确性和时效性。

## AI 集成（文本 / 图像 / 语音）
集成文本、图像、语音大模型API。

## 动态 Prompt 工程
设计 6 套 Prompt 模板，支持变量插值与年龄条件分支（age < 8 限制 topic 数），结合示例驱动 JSON 输出约束及 AvoidKeywords 负向约束，LLM 输出格式稳定性达 95% 以上。