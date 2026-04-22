# 打字

纯静态英语跟打练习，无后端，按意群逐块打字。自带填空练习和修饰模式。可本地跑、丢 GitHub Pages 或放 VPS。

## 运行

```bash
npm install
npm run dev        # 本地开发
npm run build      # 产物在 dist/，静态托管即可
```

## 添加自己的课程

方式一：直接手写 JSON，放到 `courses/` 目录：

```json
{
  "title": "课程名",
  "lessons": [
    {
      "translation": "我明天想去公园。",
      "phrases": ["I want to", "go to the park", "tomorrow."]
    }
  ]
}
```

方式二：用工具从文章生成。每行一个整句，英文用 `/` 切短语，`|` 后面是整句中译：

```
I want to / go to the park / tomorrow. | 我明天想去公园。
How / are you? | 你好吗？
```

```bash
npm run text2json -- my-article.txt
npm run text2json -- my-article.txt courses/02-mine.json --title="我的课程"
```

任何放进 `courses/*.json` 的文件会在构建时自动被收录，无需手改代码。

## 部署到 GitHub Pages

在 `vite.config.js` 把 `base` 改成 `'/<仓库名>/'`，然后：

```bash
npm run build
# 把 dist/ 推到 gh-pages 分支，或用 actions
```

## 快捷键

- `Enter` 完全正确时进入下一句
- `Esc` 清空当前输入
- `Tab` 提示下一个字母

## 进度

进度存在浏览器 localStorage，按课程 id 区分。清缓存会重置。
