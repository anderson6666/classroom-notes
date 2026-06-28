# 课堂笔记 · Classroom Notes

基于浏览器 Web Speech API 的实时课堂语音转文字工具。支持 AI 总结、说话人识别、防息屏，纯前端、数据本地保存。

## 功能特性

- **实时转写**：Web Speech API 流式输出，临时结果实时显示，落定后可编辑
- **AI 总结与纠错**：接入 Agnes（agnes-2.0-flash），录音时自动生成要点总结，支持全文纠错
- **说话人识别**：纯前端 MFCC 声纹特征 + 余弦相似度在线聚类，自动区分不同说话人，可重命名
- **防息屏**：Wake Lock API 保持录音时屏幕常亮
- **本地存储**：localStorage + IndexedDB 双重保障，支持导出 JSON / Markdown / TXT
- **多主题**：亮色纸张 / 暗色墨绿 / 跟随系统

## 技术栈

| 领域 | 选型 |
|------|------|
| 框架 | React 18 + TypeScript + Vite |
| 状态管理 | Zustand |
| 路由 | React Router（HashRouter） |
| 样式 | Tailwind CSS + CSS 变量 |
| 语音识别 | Web Speech API（SpeechRecognition） |
| 声纹聚类 | Meyda（MFCC 特征提取） |
| AI | Agnes API（OpenAI 兼容 SSE 流式） |
| 存储 | localStorage + idb-keyval |

## 本地开发

```bash
npm install
npm run dev
```

打开浏览器访问 `http://localhost:5173`。推荐使用 Chrome 或 Edge。

## 部署到 GitHub Pages

本项目已配置 GitHub Actions 自动部署。推送到 `main` 分支即可触发：

1. 在 GitHub 仓库 **Settings → Pages** 中，将 **Source** 设为 **GitHub Actions**
2. 将代码推送到 `main` 分支
3. 等待 workflow 完成后访问站点

### 避免白屏的关键配置

- `vite.config.ts` 中 `base: './'` — 使用相对路径，适配 GitHub Pages 子路径
- `HashRouter` — 路由通过 `#` 锚点实现，刷新不会 404
- `public/.nojekyll` — 禁用 Jekyll 处理，避免下划线开头的静态资源被跳过
- `public/404.html` — 意外路径自动跳转回应用入口

## 浏览器兼容性

| 浏览器 | 语音识别 | 说话人识别 |
|--------|----------|------------|
| Chrome / Edge（桌面） | ✅ 最佳 | ✅ |
| Safari | ⚠️ 部分支持 | ✅ |
| Firefox | ❌ 不支持 | ✅ |

## 使用说明

1. 进入「设置 → AI 助手」填入 Agnes API Key（仅存于本地浏览器）
2. 在工作台点击金色按钮开始录音
3. 转写文本实时显示，双击可编辑，点击高亮按钮可标记重点
4. 右侧 AI 面板自动生成要点总结，可切换到「全文纠错」标签进行纠错
5. 转写段落上方的彩色标签为说话人标识，点击可重命名（如「老师」「同学」）
6. 在「课程库」中查看历史记录，支持导出

## License

MIT
