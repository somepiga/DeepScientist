# Notion 文献库权限说明

文献管理库（database ID: `2b3e9664-cf39-808d-89b4-d9cfcd0c5948`）已确认存在，
但 `POST /databases/{id}/query` 返回 404。

原因：Notion integration 需要对数据库有"读取内容"权限才能 query。
请在 Notion 中执行以下操作：

1. 打开"文献管理库"数据库页面
2. 点击右上角 "..." → "Connections" → 找到你的 integration（名称: agent）
3. 点击 "Connect" 授权

授权后，`scripts/notion_autolaunch.py` 就能读取全部 27 篇文献并注入到 DeepScientist 研究上下文。
