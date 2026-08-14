#!/usr/bin/env python3
"""
Notion → DeepScientist 自动启动脚本
从"论文"页面读取研究选题，自动构造 Quest 并启动

用法:
  python3 notion_autolaunch.py                    # 直接启动（单次）
  python3 notion_autolaunch.py --watch --interval 3600   # 定时自动检查
"""
import os
import sys
import json
import time
import argparse
import requests
from pathlib import Path

# ── 配置 ──────────────────────────────────────────────────────────────────
NOTION_KEY = os.environ.get("NOTION_API_TOKEN", "")
NOTION_HEADERS = {
    "Authorization": f"Bearer {NOTION_KEY}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
}

# Notion 页面 ID
PAPER_PAGE_ID = "34ce9664-cf39-80df-afc8-c84ada462f4a"  # "论文"主页
SUBPAGES = {
    "scan":    "34ce9664-cf39-8124-acff-dd51c3822d2b",  # 选题前快速扫描
    "topic12": "34ce9664-cf39-817d-a77d-c5b61d948159",  # Topic 1 & 2 深度剖析
}
LIT_DB_ID = "2b3e9664-cf39-808d-89b4-d9cfcd0c5948"  # 文献管理库

# DeepScientist daemon
DS_API = "http://127.0.0.1:20999/api"

# 自动化级别
AUTO_MODE = "autonomous"   # autonomous | copilot
RESEARCH_INTENSITY = "balanced"   # light | balanced | sprint
SCOPE = "baseline_plus_direction"  # baseline_only | baseline_plus_direction | full_research
BASELINE_MODE = "restore_from_url"
DECISION_POLICY = "autonomous"
NEED_PAPER = True
TIME_BUDGET = 24

# ── Notion API 封装 ────────────────────────────────────────────────────────
def notion_get(url, params=None):
    resp = requests.get(url, headers=NOTION_HEADERS, params=params)
    resp.raise_for_status()
    return resp.json()

def notion_post(url, payload):
    resp = requests.post(url, headers=NOTION_HEADERS, json=payload)
    resp.raise_for_status()
    return resp.json()

def get_all_children(block_id):
    """递归获取页面所有子块内容"""
    results = []
    cursor = None
    while True:
        params = {"page_size": 100}
        if cursor:
            params["start_cursor"] = cursor
        data = notion_get(
            f"https://api.notion.com/v1/blocks/{block_id}/children",
            params=params
        )
        results.extend(data.get("results", []))
        cursor = data.get("next_cursor")
        if not cursor:
            break
    return results

def block_to_text(block):
    """将单个 block 转为可读文本"""
    bt = block.get("type", "")
    rich_text = block.get(bt, {}).get("rich_text", [])
    text = "".join([r.get("plain_text", "") for r in rich_text])
    prefix = {"heading_1": "## ", "heading_2": "### ", "heading_3": "#### "}.get(bt, "")
    if bt == "bulleted_list_item":
        prefix = "- "
    elif bt == "numbered_list_item":
        prefix = "1. "
    elif bt == "quote":
        prefix = "> "
    elif bt == "code":
        lang = block.get("code", {}).get("language", "")
        return f"```{lang}\n{text}\n```"
    if prefix:
        return f"{prefix}{text}"
    return text if text.strip() else None

def read_page_content(block_id):
    """读取页面所有文本内容"""
    blocks = get_all_children(block_id)
    lines = []
    for b in blocks:
        line = block_to_text(b)
        if line:
            lines.append(line)
    return "\n".join(lines)

def read_literature_db():
    """读取文献管理库，提取标题和链接"""
    try:
        data = notion_post(
            f"https://api.notion.com/v1/databases/{LIT_DB_ID}/query",
            {"page_size": 100}
        )
        papers = []
        for item in data.get("results", []):
            props = item.get("properties", {})
            title = ""
            url_val = ""
            for k, v in props.items():
                if v.get("type") == "title":
                    title = "".join([t.get("plain_text", "") for t in v.get("title", [])])
                elif v.get("type") == "url":
                    url_val = v.get("url", "") or ""
            if title:
                papers.append({"title": title, "url": url_val})
        return papers
    except Exception as e:
        print(f"  [warn] 文献库读取失败: {e}")
        return []

# ── 内容拼接 ──────────────────────────────────────────────────────────────
def build_research_context():
    """从 Notion 拼接完整的研究上下文"""
    print("[1/4] 读取 Notion '论文' 页面内容...")

    scan_text = read_page_content(SUBPAGES["scan"])
    topic12_text = read_page_content(SUBPAGES["topic12"])
    papers = read_literature_db()

    # 文献列表（Markdown 链接格式）
    paper_lines = []
    for p in papers:
        if p["url"]:
            paper_lines.append(f"- [{p['title']}]({p['url']})")
        else:
            paper_lines.append(f"- {p['title']}")

    literature_section = "\n".join(paper_lines) if paper_lines else "_文献库暂无链接_"

    context = f"""# 研究上下文（来源：Notion "论文" 页面）

## 选题前快速扫描

{scan_text}

## Topic 1 & 2 深度剖析

{topic12_text}

## 文献管理库（共 {len(papers)} 篇）

{literature_section}
"""
    return context

# ── Goal 构造 ─────────────────────────────────────────────────────────────
def build_goal(context):
    """从研究上下文提取 Quest goal"""
    # 从 scan 页面提取标题
    lines = context.split("\n")
    title = "SSM-Pruning Research"  # 默认
    for line in lines:
        if line.startswith("## ") and "选题前" in line:
            title = line.replace("## ", "").strip()
            break

    # 核心研究方向
    goal = f"""基于 Notion "论文" 页面内容，启动自主研究。

研究主题：{title}

具体执行以下研究任务：

1. 优先聚焦 Topic 1（SSM 剪枝失效机制分析）和 Topic 2（混合架构基准评测），这是当前研究空白最大的方向。

2. 建立 SSM（Mamba）剪枝的理论框架：
   - 分析 SSM 的核心矩阵（A、B、C、Δ）对剪枝的敏感性差异
   - 建立 Δ 剪枝与选择性机制崩溃的定量关系
   - 验证 A 矩阵行剪枝 → 长序列 perplexity 恶化的失效模式
   - 提出 SSM-aware 剪枝策略，在同等压缩率下优于 Wanda/SparseGPT baseline

3. 混合架构基准评测：
   - 针对 Jamba/Nemotron-H 等混合架构，建立效率-精度 Pareto 前沿
   - 定义 SSM-Attention Efficiency Score（SAES）
   - 在不同任务（长文本、代码、推理）上测量分层剪枝效果

4. 参考以下文献方法：SparseGPT、Wanda、LLM-Pruner、ZipLM、FlashSSM、AWQ

5. 实验完成后输出：
   - 决策工件（decision artifact）：记录主要研究发现和下一步方向
   - 实验工件（experiment artifact）：记录实验配置、指标和关键结论
   - 必要时产出 paper-ready 写作

请以 autonomous 模式运行，持续推进直到遇到需要人工决策的节点。
"""
    return goal

# ── DeepScientist API ──────────────────────────────────────────────────────
def quest_create(goal, context, title):
    """通过 DeepScientist API 创建 Quest"""
    print(f"[2/4] 创建 Quest: {title}")

    # 构造 startup_contract
    contract = {
        "schema_version": 3,
        "user_language": "zh",
        "need_research_paper": NEED_PAPER,
        "research_intensity": RESEARCH_INTENSITY,
        "decision_policy": DECISION_POLICY,
        "launch_mode": "standard",
        "scope": SCOPE,
        "baseline_mode": BASELINE_MODE,
        "resource_policy": "balanced",
        "time_budget_hours": TIME_BUDGET,
        "git_strategy": "semantic_head_plus_controlled_integration",
        "workspace_mode": AUTO_MODE,
        "objectives": [
            "分析 SSM 剪枝失效机制，建立定量预测框架",
            "测量混合架构效率-精度 Pareto 前沿",
            "产出实验工件和决策工件",
        ],
        "entry_state_summary": "Notion 论文页面已完成初步扫描，包含两个详细 Topic 分析和文献管理库（27篇论文）",
    }

    payload = {
        "title": title,
        "goal": goal,
        "quest_id": "",
        "startup_contract": contract,
        "auto_start": True,
        "initial_message": (
            "请从 Notion '论文' 页面读取研究上下文，完成以下任务：\n\n"
            "## 你的研究背景\n\n"
            f"{context}\n\n"
            "## 执行要求\n\n"
            "1. 进入 scout 阶段，读取所有相关文献\n"
            "2. 基于 Topic 1（SSM 剪枝失效机制）建立实验计划\n"
            "3. 进入 baseline 阶段，搭建 Mamba-2 实验环境\n"
            "4. 运行剪枝实验，测量 Δ 分布、A 矩阵谱半径、状态条件数等 SSM 特有指标\n"
            "5. 产出决策工件，记录关键发现和下一步方向\n\n"
            "注意：以 autonomous 模式运行，持续推进直到需要人工决策。"
        ),
    }

    resp = requests.post(f"{DS_API}/quests", json=payload)
    data = resp.json()
    if not data.get("ok"):
        print(f"  [ERROR] Quest 创建失败: {data.get('message')}")
        return None

    snapshot = data.get("snapshot", {})
    quest_id = snapshot.get("quest_id")
    print(f"[3/4] Quest 创建成功: {quest_id}")
    print(f"       状态: {snapshot.get('status')}")
    print(f"       活跃锚点: {snapshot.get('active_anchor')}")

    # 等待一下让 auto_start 生效
    time.sleep(2)

    # 检查运行状态
    status_resp = requests.get(f"{DS_API}/quests/{quest_id}")
    status_data = status_resp.json()
    print(f"[4/4] Quest 已提交运行")
    print(f"       状态: {status_data.get('status')}")
    print(f"       → 详情: {DS_API.replace('api', '')}quests/{quest_id}")

    return quest_id

# ── 主流程 ─────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Notion → DeepScientist 自动启动")
    parser.add_argument("--watch", action="store_true", help="持续监控模式")
    parser.add_argument("--interval", type=int, default=3600, help="检查间隔（秒）")
    parser.add_argument("--goal-only", action="store_true", help="仅打印 goal，不创建 Quest")
    args = parser.parse_args()

    if not NOTION_KEY:
        sys.exit("NOTION_API_TOKEN must be set before running this script.")

    context = build_research_context()
    title = "SSM-Pruning: 论文页面全自动研究"
    goal = build_goal(context)

    if args.goal_only:
        print("=" * 60)
        print("GOAL:")
        print("=" * 60)
        print(goal)
        print("=" * 60)
        print("CONTEXT (前 500 字符):")
        print(context[:500])
        return

    quest_id = quest_create(goal, context, title)

    if quest_id and args.watch:
        print(f"\n[watch] 持续监控 Notion 选题，每 {args.interval} 秒检查一次...")
        print("[watch] 按 Ctrl+C 停止")
        try:
            while True:
                time.sleep(args.interval)
                # 未来：这里可以比对 Notion 页面版本，决定是否启动新 Quest
                print(f"[{time.strftime('%H:%M:%S')}] 检查 Notion 页面...")
        except KeyboardInterrupt:
            print("\n[watch] 停止监控。")

if __name__ == "__main__":
    main()
