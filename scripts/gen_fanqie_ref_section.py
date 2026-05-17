"""根据 fanqie_metrics.json 生成 fanqie-newbook-style-2026.md 的章名样本段(避免手抄改坏标点)"""
import json
from pathlib import Path

data = json.load(open(Path(__file__).parent / "fanqie_metrics.json", encoding="utf-8"))
lines = []

lines.append("### 章名钩子样式分类(基于男频新书榜 TOP30 真实样本)\n")
lines.append("> 数据来源:scripts/fanqie_metrics.json `章名钩子分类_男频新书TOP30` 字段,所有样本均为榜单原文,保留原始标点。\n")
lines.append("| 钩子类型 | 数量 | 占比 | 真实样本(取前 3,标点原样) |")
lines.append("|---------|-----:|-----:|------------------------------|")

hooks = data["章名钩子分类_男频新书TOP30"]
total = sum(len(v) for v in hooks.values())
order = [
    "感叹号派(高情绪)",
    "动作派(短句动作)",
    "信息派(直白事件)",
    "问号派(悬念提问)",
    "数字派(用数字制造悬念)",
    "对话派(直接引用台词)",
    "省略号派(留白)",
]
for cat in order:
    items = hooks.get(cat, [])
    n = len(items)
    pct = round(n / total * 100, 1) if total else 0
    sample = " / ".join(f"「{i}」" for i in items[:3]) if items else "(本样本中未出现以引号/省略号开头的章名)"
    lines.append(f"| {cat} | {n} | {pct}% | {sample} |")
lines.append(f"| 合计 | {total} | 100% | |")

lines.append("")
lines.append("**结论**:")
lines.append("- 感叹号 + 动作 + 信息派合占 87%(10+9+7=26/30)——番茄新书章名绝对主流")
lines.append("- 章名长度普遍 4-25 字,信息密度高,常含人物名/动作/情绪词")
lines.append("- **对话派 0% / 省略号派 0%** 是真实数据(本批样本中无以引号或省略号**开头**的章名),但章名内部嵌入对话片段很常见")
lines.append("- 设计章名时:优先用感叹号/动作短句,信息派(直接讲事件)次之,数字/问号是点缀")

lines.append("")
lines.append("### 各题材 TOP3 新书的章名样式(供文风对标,真实数据)\n")
lines.append("> 数据来源:scripts/fanqie_metrics.json `各题材TOP3新书` 字段,全部从同一行抓取(题材-在读-章均字数-章名 一致,标点原样)。\n")

# 男频题材
lines.append("#### 男频题材\n")
lines.append("| 题材 | TOP1 在读 | TOP1 章均字数 | TOP1 章名 |")
lines.append("|------|----------:|--------------:|-----------|")

male_ticai = ["都市脑洞","动漫衍生","年代","现言脑洞","男频衍生","玄幻脑洞","都市日常","历史脑洞","抗战谍战","悬疑脑洞","都市高武","悬疑灵异","都市修真","科幻末世","历史古代","传统玄幻","西方奇幻","都市种田","战神赘婿","游戏体育"]
top3 = data["各题材TOP3新书"]
# 按 TOP1 在读量降序
male_sorted = sorted([(t, top3[t][0]) for t in male_ticai if t in top3 and top3[t]], key=lambda x: -x[1]["在读_万"])
for ticai, top1 in male_sorted:
    lines.append(f"| {ticai} | {top1['在读_万']:.1f} 万 | {top1['章均字数']} 字 | 「{top1['章名']}」 |")

lines.append("")
lines.append("#### 女频题材\n")
lines.append("| 题材 | TOP1 在读 | TOP1 章均字数 | TOP1 章名 |")
lines.append("|------|----------:|--------------:|-----------|")
female_ticai = ["豪门总裁","青春甜宠","星光璀璨","古言脑洞","女频衍生","快穿","宫斗宅斗","职场婚恋","玄幻言情","种田","古风世情","女频悬疑","民国言情"]
female_sorted = sorted([(t, top3[t][0]) for t in female_ticai if t in top3 and top3[t]], key=lambda x: -x[1]["在读_万"])
for ticai, top1 in female_sorted:
    lines.append(f"| {ticai} | {top1['在读_万']:.1f} 万 | {top1['章均字数']} 字 | 「{top1['章名']}」 |")

lines.append("")
lines.append("**观察**:")
lines.append("- 女频章名整体比男频更短、更克制(平均 4-8 字 vs 男频 8-15 字)")
lines.append("- 男频更多用感叹号 + 信息密度")
lines.append('- 女频高在读 TOP1 章名极短(豪门总裁「宴会」/ 星光璀璨「晚上直播PK」)——靠「留白 + 期待」')
lines.append("")
lines.append("(完整 30 题材 × 3 本 = 90 个真实章名见 `scripts/fanqie_metrics.json` 的 `各题材TOP3新书` 字段)")

# Write to file directly to avoid PowerShell encoding issues
out = Path(__file__).parent / "_fanqie_ref_section.md"
out.write_text("\n".join(lines), encoding="utf-8")
print(f"[DONE] {out}")
