# 打字

纯静态英语训练站，面向 TOEFL / IELTS 写作讲评课。三个功能合一：

- **跟打**：按意群逐块打字，遇到介词短语 / 关系从句等修饰语自动标识（修饰模式可开启）
- **填空**：同一篇文章 4 轮独立挖空——连接词 / 动词搭配 / 名词短语 / 句法骨架
- **主题**：白天 / 夜间切换，移动端适配

无后端，无数据库。`npm run build` 产物静态托管即可。

## 内容

- **10 篇 TOEFL Academic Discussion 满分范文**（jj-001 / jj-043 / ad-001 / ad-002 / jj-028 / jj-010 / jj-083 / jj-006 / jj-046 / jj-038）覆盖 Path A binary/agree、Path B 最优选择、Path C evaluate/design 全部 5 种路径
- **1 篇 IELTS Band 8 范文**（Clean Water as a Basic Right）
- **血字的研究 · 顺译法全本**（14 章）
- **Reviews or Advice** 起步练习

每篇文章同时以"跟打课程"和"4 轮填空练习"两种形态出现。

## 运行

```bash
npm install
npm run dev      # 本地开发
npm run build    # 产物在 dist/
```

## 自己加课程

放 JSON 到 `courses/` 自动收录：

```json
{
  "title": "课程名",
  "lessons": [
    { "translation": "我明天想去公园。",
      "phrases": ["I want to", "go to the park", "tomorrow."] }
  ]
}
```

从 md 文章批量转：`npm run text2json -- article.md`。

填空放 `cloze/`，格式见现有文件（`tokens` 数组由 `{t:"text"}` 和 `{t:"blank", answer, hint}` 组成）。

## 修饰模式

跟打页顶部点击"修饰"按钮开启。运行时通过词首自动识别介词短语（`for/in/on/with/as/...`）、关系从句（`who/which/where/when/...`）、让步/时间从句（`although/unless/while/...`）等修饰成分，到达它们时只显示不打字，按 **空格** 或 **Enter** 跳过。核心主谓结构照常打字。用于训练学生区分句子骨架与修饰层。

## 快捷键

- `Enter` 完全正确时进入下一句
- `Esc` 清空当前输入
- `Tab` 提示下一个字母
- 修饰模式下：`Space` / `Enter` 跳过修饰语

## 进度与状态

课程进度、修饰模式开关、主题偏好都存在浏览器 localStorage，按课程 id 区分。清缓存会重置。

## 部署

推到 GitHub Pages：仓库 Settings → Pages → Source 选 "GitHub Actions"，`main` 分支 push 即自动部署。VPS 部署直接挂 `dist/` 即可。
