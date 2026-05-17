"""文风分析脚本 — story-long-analyze skill Stage 6 专用

输入: 小说 .txt 文件(整本或某几章)
输出: analyze-data/{书名}/文风分析.md(按 fanqie-newbook-style-2026.md 模板)

用法:
    python style_analyzer.py "D:/path/to/书.txt"
    python style_analyzer.py "D:/path/to/书.txt" --out "analyze-data/{书名}/"
    python style_analyzer.py "D:/path/to/书.txt" --sample 9    # 采样章数,默认 9(前3+中3+末3)

依赖: 纯标准库,无第三方依赖。
"""
import re
import sys
import json
import argparse
import os
from pathlib import Path
from collections import Counter
from datetime import date

# ============== 解析章节 ==============

# 匹配 "第N章" / "第N 章" / "第N章 章名" / "楔子" / "序章" / "番外" 等多种格式
CHAPTER_RE = re.compile(
    r"^(?:"
    r"第\s*([0-9一二三四五六七八九十百千零两]+)\s*章\s*(.*?)"  # 正常章节
    r"|(楔子|序章|序言|引子|尾声|后记|番外|外传|特别篇)\s*(.*?)"  # 特殊章节
    r")\s*$",
    re.M
)

CN_NUM = {"零":0, "一":1, "二":2, "三":3, "四":4, "五":5, "六":6, "七":7, "八":8, "九":9, "十":10, "百":100, "千":1000, "两":2}

def cn_to_int(s):
    if not s: return 0
    # 跳过开头的 "零"(如 "一百零三" 切完是 "零三")
    s = s.lstrip("零")
    if not s: return 0
    if s.isdigit(): return int(s)
    # 处理 一/二十/三十五/一百零三/一千零三 等
    if "千" in s:
        p = s.split("千", 1)
        head = CN_NUM.get(p[0], 1) if p[0] else 1
        return head * 1000 + cn_to_int(p[1])  # 递归,处理"零三"等
    if "百" in s:
        p = s.split("百", 1)
        head = CN_NUM.get(p[0], 1) if p[0] else 1
        return head * 100 + cn_to_int(p[1])  # 递归
    if "十" in s:
        p = s.split("十", 1)
        head = CN_NUM.get(p[0], 1) if p[0] else 1
        tail = CN_NUM.get(p[1], 0) if p[1] else 0
        return head * 10 + tail
    return CN_NUM.get(s, 0)


def parse_chapters(text):
    """把整本文本切成章列表: [{'num': 1, 'title': '...', 'body': '...'}]"""
    # 找出所有章首位置
    matches = list(CHAPTER_RE.finditer(text))
    if not matches:
        # 没有章节标记,把全文当一章
        return [{"num": 1, "title": "(无章节)", "body": text.strip()}]

    chapters = []
    for i, m in enumerate(matches):
        # 优先取正常章节(group 1/2),其次取特殊章节(group 3/4)
        num_raw = m.group(1)
        title = (m.group(2) or "").strip()
        special = m.group(3)
        if special:
            # 特殊章节(楔子/序章/番外等),按出现顺序虚拟编号(用 0/负数,避免冲突)
            num = -(i + 1)  # 负数标识非正常章
            title = f"{special} {(m.group(4) or '').strip()}".strip()
        else:
            try:
                num = cn_to_int(num_raw)
            except Exception:
                num = i + 1
            if num == 0:  # 解析失败
                num = i + 1
        # 章体: 从本章末到下一章首(或文末)
        start = m.end()
        end = matches[i+1].start() if i+1 < len(matches) else len(text)
        body = text[start:end].strip()
        if body:  # 排除空章节
            chapters.append({"num": num, "title": title, "body": body})
    return chapters


# ============== 段落分析(核心算法) ==============

def split_paragraphs(text):
    """切段:用空行分隔,清理段首缩进"""
    # 清理段首的全角空格(网文常见缩进)
    paras = []
    for raw in re.split(r"\n\s*\n", text):
        cleaned = raw.strip().replace("　　", "").replace("　　", "").strip()
        if cleaned:
            paras.append(cleaned)
    return paras


def analyze_paragraph_style(text):
    """对单章正文计算文风指标(与 fanqie-newbook-style-2026.md 一致)"""
    paras = split_paragraphs(text)
    total = len(paras)
    if total == 0:
        return None

    para_lens = [len(p) for p in paras]
    single_sentence_paras = sum(
        1 for p in paras
        if p.count("。") + p.count("！") + p.count("？") + p.count(".") + p.count("!") + p.count("?") <= 1
    )
    dialogue_chars = '"' + '“' + '”' + '「' + '」'  # 直引号 / 左弯 / 右弯 / 「 / 」
    dialogue_paras = sum(1 for p in paras if any(c in p for c in dialogue_chars))
    visual_burst = sum(1 for p in paras if len(p) < 10 and not any(c in p for c in dialogue_chars))

    # 心理戏关键词
    psyc_keywords = ["想", "觉得", "心里", "暗道", "心想", "暗自", "回忆", "意识到"]
    psyc_chars = sum(len(p) for p in paras if any(k in p for k in psyc_keywords))

    # 连续短段堆叠(只在 streak == 3 的瞬间计 1,避免虚高)
    consec_short = 0
    max_streak = 0
    cur_streak = 0
    for p in paras:
        if len(p) < 10:
            cur_streak += 1
            max_streak = max(max_streak, cur_streak)
            if cur_streak == 3:  # 只在跨阈值瞬间计 1
                consec_short += 1
        else:
            cur_streak = 0

    return {
        "段数": total,
        "总字数": sum(para_lens),
        "平均段长": sum(para_lens) // total,
        "段长中位数": sorted(para_lens)[total // 2],
        "段长_P25": sorted(para_lens)[total // 4],
        "段长_P75": sorted(para_lens)[3 * total // 4],
        "单句段数": single_sentence_paras,
        "单句段占比": round(single_sentence_paras / total * 100, 1),
        "对话段数": dialogue_paras,
        "对话段占比": round(dialogue_paras / total * 100, 1),
        "视觉爆点独行": visual_burst,
        "心理戏总字数": psyc_chars,
        "连续短段堆叠次数": consec_short,
        "最长短段连续": max_streak,
    }


# ============== 章名钩子分类 ==============

HOOK_CATEGORIES = [
    "感叹号派(高情绪)",
    "问号派(悬念提问)",
    "省略号派(留白)",
    "对话派(直接引用台词)",
    "数字派(用数字制造悬念)",
    "动作派(短句动作)",
    "信息派(直白事件)",
]

def classify_hook(title):
    if "！" in title or "!" in title:
        return "感叹号派(高情绪)"
    if "？" in title or "?" in title:
        return "问号派(悬念提问)"
    if "……" in title or "..." in title or "…" in title:
        return "省略号派(留白)"
    if title.startswith('"') or title.startswith('"') or title.startswith("「"):
        return "对话派(直接引用台词)"
    if re.search(r"\d", title):
        return "数字派(用数字制造悬念)"
    if len(title) < 8:
        return "动作派(短句动作)"
    return "信息派(直白事件)"


# ============== 采样策略 ==============

def sample_chapters(chapters, n=9):
    """采样 n 章: 前 n/3 + 中 n/3 + 末 n/3"""
    total = len(chapters)
    if total <= n:
        return chapters
    per = max(1, n // 3)
    front = chapters[:per]
    middle_start = total // 2 - per // 2
    middle = chapters[middle_start:middle_start + per]
    tail = chapters[-per:]
    return front + middle + tail


# ============== 汇总 ==============

def aggregate(metrics_list):
    """对多个章节的指标做汇总(均值 + 中位数)"""
    if not metrics_list:
        return None
    keys = ["平均段长", "段长中位数", "段长_P25", "段长_P75", "单句段占比", "对话段占比", "视觉爆点独行", "连续短段堆叠次数", "心理戏总字数", "段数", "总字数"]
    agg = {}
    for k in keys:
        vals = [m[k] for m in metrics_list if m and k in m]
        if not vals: continue
        vals.sort()
        agg[k + "_平均"] = round(sum(vals) / len(vals), 1)
        agg[k + "_中位"] = vals[len(vals) // 2]
    agg["采样章数"] = len(metrics_list)
    return agg


# ============== 评分 ==============

def score_metric(val, target_low, target_high):
    if val < target_low or val > target_high:
        return "差"
    range_size = target_high - target_low
    margin = range_size * 0.2
    if target_low + margin <= val <= target_high - margin:
        return "优"
    return "中"


def score_all(agg):
    """对照番茄风目标值打分"""
    return {
        "平均段长": score_metric(agg.get("平均段长_平均", 0), 30, 80),
        "段长中位数": score_metric(agg.get("段长中位数_平均", 0), 35, 60),
        "单句段占比": "优" if agg.get("单句段占比_平均", 100) <= 30 else ("中" if agg.get("单句段占比_平均", 100) <= 40 else "差"),
        "对话段占比": score_metric(agg.get("对话段占比_平均", 0), 30, 50),
        "连续短段堆叠": "优" if agg.get("连续短段堆叠次数_平均", 99) == 0 else ("中" if agg.get("连续短段堆叠次数_平均", 99) <= 1 else "差"),
        "视觉爆点独行": "优" if agg.get("视觉爆点独行_平均", 0) <= 5 else "中",
        "心理戏总量": "优" if agg.get("心理戏总字数_平均", 0) <= 100 else ("中" if agg.get("心理戏总字数_平均", 0) <= 200 else "差"),
    }


# ============== 抽取标杆段落 ==============

SEP_RE = re.compile(r"^[-=*_~—]{5,}$|^[-=*]+\s*$")
DIALOG_CHARS = '"' + '“' + '”' + '「' + '」'  # 直引号 / 左弯 / 右弯 / 「 / 」

def _is_meaningful(p):
    """过滤掉纯分隔符 / 空白"""
    if not p or not p.strip(): return False
    if SEP_RE.match(p.strip()): return False
    return True

def extract_bench_paragraphs(chapters_sampled):
    """从采样章节中抽取标杆段落: 开篇 / 对话 / 爆点 / 章末"""
    benches = {"开篇": [], "对话": [], "爆点视觉化": [], "章末": []}
    for ch in chapters_sampled:
        paras = [p for p in split_paragraphs(ch["body"]) if _is_meaningful(p)]
        if not paras: continue
        # 开篇:本章第 1 段
        if len(benches["开篇"]) < 2:
            benches["开篇"].append((ch["num"], paras[0]))
        # 对话:含引号的段(用全角+半角全字符集)
        if len(benches["对话"]) < 2:
            for p in paras:
                if any(c in p for c in DIALOG_CHARS):
                    benches["对话"].append((ch["num"], p))
                    break
        # 爆点视觉化:很短独立段 + 含感叹号(收紧条件,排除普通短句)
        if len(benches["爆点视觉化"]) < 2:
            for p in paras:
                if len(p) < 15 and ("！" in p or "!" in p):
                    benches["爆点视觉化"].append((ch["num"], p))
                    break
        # 章末:本章末段(已过滤分隔符)
        if len(benches["章末"]) < 2:
            benches["章末"].append((ch["num"], paras[-1]))
    return benches


# ============== 输出 markdown ==============

def render_markdown(book_name, chapters_all, chapters_sampled, agg, scores, hook_dist, benches, source_file):
    md = []
    md.append(f"# 文风分析: {book_name}\n")
    md.append("## 数据来源\n")
    md.append(f"- 源文件: `{source_file}`")
    md.append(f"- 拆解时间: {date.today().isoformat()}")
    md.append(f"- 总章数: {len(chapters_all)} 章")
    md.append(f"- 采样章节: 共 {len(chapters_sampled)} 章(前/中/末 各 {len(chapters_sampled)//3} 章)")
    md.append(f"- 采样章号: {[c['num'] for c in chapters_sampled]}")
    md.append(f"- 采样总字数: {agg.get('总字数_平均', 0)*len(chapters_sampled):.0f} 字 (均值 {agg.get('总字数_平均', 0):.0f}/章)")
    md.append("")

    md.append("## 段落级指标\n")
    md.append("| 指标 | 数值(采样均值) | 中位数 | 番茄风目标 | 评分 |")
    md.append("|------|---------------:|-------:|-----------:|------|")
    rows = [
        ("平均段长", f"{agg.get('平均段长_平均', 0):.1f} 字", f"{agg.get('平均段长_中位', 0)}", "30-80", scores["平均段长"]),
        ("段长中位数", f"{agg.get('段长中位数_平均', 0):.1f} 字", f"{agg.get('段长中位数_中位', 0)}", "35-60", scores["段长中位数"]),
        ("段长 P25", f"{agg.get('段长_P25_平均', 0):.1f} 字", f"{agg.get('段长_P25_中位', 0)}", "—", "—"),
        ("段长 P75", f"{agg.get('段长_P75_平均', 0):.1f} 字", f"{agg.get('段长_P75_中位', 0)}", "—", "—"),
        ("单句段占比", f"{agg.get('单句段占比_平均', 0):.1f} %", f"{agg.get('单句段占比_中位', 0)} %", "≤30%", scores["单句段占比"]),
        ("对话段占比", f"{agg.get('对话段占比_平均', 0):.1f} %", f"{agg.get('对话段占比_中位', 0)} %", "30-50%", scores["对话段占比"]),
        ("视觉爆点独行", f"{agg.get('视觉爆点独行_平均', 0):.1f} 处/章", f"{agg.get('视觉爆点独行_中位', 0)}", "≤5/章", scores["视觉爆点独行"]),
        ("连续短段堆叠", f"{agg.get('连续短段堆叠次数_平均', 0):.2f} 次/章", f"{agg.get('连续短段堆叠次数_中位', 0)}", "0", scores["连续短段堆叠"]),
        ("心理戏总字数", f"{agg.get('心理戏总字数_平均', 0):.0f} 字/章", f"{agg.get('心理戏总字数_中位', 0)}", "≤100/章", scores["心理戏总量"]),
    ]
    for r in rows:
        md.append(f"| {r[0]} | {r[1]} | {r[2]} | {r[3]} | {r[4]} |")
    md.append("")

    md.append("## 章长分布(全书统计)\n")
    ch_lens = [len(c["body"]) for c in chapters_all]
    ch_lens.sort()
    md.append("| 指标 | 数值 |")
    md.append("|------|-----:|")
    md.append(f"| 章数 | {len(ch_lens)} |")
    md.append(f"| 平均章长 | {sum(ch_lens)//len(ch_lens)} 字 |")
    md.append(f"| 中位数 | {ch_lens[len(ch_lens)//2]} 字 |")
    md.append(f"| 最短 | {ch_lens[0]} 字 |")
    md.append(f"| 最长 | {ch_lens[-1]} 字 |")
    md.append(f"| P25 | {ch_lens[len(ch_lens)//4]} 字 |")
    md.append(f"| P75 | {ch_lens[3*len(ch_lens)//4]} 字 |")
    md.append("")

    md.append("## 章名钩子样式分布(全书统计)\n")
    md.append("| 类型 | 数量 | 占比 | 样本(取前 3) |")
    md.append("|------|-----:|-----:|---------------|")
    total_chs = sum(hook_dist.values())
    for cat in HOOK_CATEGORIES:
        n = hook_dist.get(cat, 0)
        if n == 0: continue
        pct = round(n / total_chs * 100, 1) if total_chs else 0
        samples = [c["title"] for c in chapters_all if classify_hook(c["title"]) == cat][:3]
        sample_str = " / ".join(f"「{s}」" for s in samples) if samples else "—"
        md.append(f"| {cat} | {n} | {pct}% | {sample_str} |")
    md.append("")

    md.append("## 标杆段落示例\n")
    for kind, items in benches.items():
        if not items: continue
        md.append(f"### {kind}段")
        for ch_num, para in items:
            md.append(f"\n**第 {ch_num} 章**:")
            md.append("```")
            md.append(para[:500] + ("..." if len(para) > 500 else ""))
            md.append("```")
        md.append("")

    md.append("## 文风总结\n")
    summary_lines = []
    avg_p = agg.get('平均段长_平均', 0)
    sg_p = agg.get('单句段占比_平均', 0)
    dialog_p = agg.get('对话段占比_平均', 0)

    if avg_p < 30:
        summary_lines.append(f"- 段落偏碎(平均 {avg_p:.0f} 字),节奏快但易碎裂")
    elif avg_p > 80:
        summary_lines.append(f"- 段落偏长(平均 {avg_p:.0f} 字),阅读墙风险高")
    else:
        summary_lines.append(f"- 段落长度适中(平均 {avg_p:.0f} 字),符合番茄风目标")

    if sg_p > 40:
        summary_lines.append(f"- 单句独立段过多({sg_p:.1f}%),需收紧")
    elif sg_p < 15:
        summary_lines.append(f"- 单句独立段较少({sg_p:.1f}%),可适当增加视觉爆点")
    else:
        summary_lines.append(f"- 单句独立段占比合理({sg_p:.1f}%)")

    if dialog_p > 50:
        summary_lines.append(f"- 对话推动型({dialog_p:.1f}%),适合快节奏")
    elif dialog_p < 25:
        summary_lines.append(f"- 描写推动型({dialog_p:.1f}%),节奏偏慢")
    else:
        summary_lines.append(f"- 对话与描写平衡({dialog_p:.1f}%)")

    md.extend(summary_lines)
    md.append("")

    md.append("## 写作复用建议\n")
    md.append(f"- **段长目标**: {agg.get('段长_P25_平均', 0):.0f}-{agg.get('段长_P75_平均', 0):.0f} 字/段(本书 P25-P75 区间)")
    md.append(f"- **单句段占比目标**: ≤ {min(sg_p*1.1, 30):.0f}%(±10% 容忍)")
    md.append(f"- **对话占比目标**: {max(dialog_p-10, 30):.0f}-{min(dialog_p+10, 50):.0f}%")
    md.append(f"- **每章视觉爆点**: ≤{max(agg.get('视觉爆点独行_平均', 5)+1, 5):.0f} 处")
    md.append(f"- **章名风格**: 优先用 {max(hook_dist, key=hook_dist.get) if hook_dist else '感叹号派'}")
    md.append("")

    return "\n".join(md)


# ============== 主流程 ==============

def main():
    parser = argparse.ArgumentParser(description="文风分析脚本")
    parser.add_argument("input", help="小说 .txt 文件路径")
    parser.add_argument("--out", default=None, help="输出目录,默认 analyze-data/{书名}/")
    parser.add_argument("--sample", type=int, default=9, help="采样章数,默认 9(前3+中3+末3)")
    args = parser.parse_args()

    in_path = Path(args.input)
    if not in_path.exists():
        print(f"[ERROR] File not found: {in_path}")
        sys.exit(1)

    # 提取书名(文件名去扩展名;如包含"书名："行则用之)
    text = in_path.read_text(encoding="utf-8", errors="replace")
    book_name = in_path.stem
    m = re.search(r"^书名[:：]\s*(.+?)\s*$", text, re.M)
    if m:
        book_name = m.group(1).strip()

    print(f"[INFO] Book: {book_name}")
    print(f"[INFO] Source: {in_path}")

    # 解析章节
    chapters = parse_chapters(text)
    print(f"[INFO] Parsed {len(chapters)} chapters")

    if not chapters:
        print("[ERROR] No chapters detected")
        sys.exit(1)

    # 采样
    sampled = sample_chapters(chapters, args.sample)
    print(f"[INFO] Sampled {len(sampled)} chapters: {[c['num'] for c in sampled]}")

    # 对每章跑分析
    metrics_list = []
    for ch in sampled:
        m = analyze_paragraph_style(ch["body"])
        if m:
            metrics_list.append(m)

    agg = aggregate(metrics_list)
    scores = score_all(agg)

    # 章名钩子分类(全书)
    hook_dist = Counter(classify_hook(c["title"]) for c in chapters)

    # 标杆段落
    benches = extract_bench_paragraphs(sampled)

    # 生成 markdown
    md = render_markdown(book_name, chapters, sampled, agg, scores, hook_dist, benches, str(in_path))

    # 确定输出路径
    if args.out:
        out_dir = Path(args.out)
    else:
        out_dir = Path("analyze-data") / book_name
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "文风分析.md"
    out_path.write_text(md, encoding="utf-8")

    print(f"[DONE] {out_path}")
    print(f"[STATS] avg_para_len={agg.get('平均段长_平均', 0):.1f} / single_sentence_pct={agg.get('单句段占比_平均', 0):.1f}% / dialogue_pct={agg.get('对话段占比_平均', 0):.1f}%")


if __name__ == "__main__":
    main()
