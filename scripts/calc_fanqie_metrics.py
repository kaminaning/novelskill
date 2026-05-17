"""从 scan-data/20260515_2347_番茄/ 推算番茄市场指标"""
import re
import os
from pathlib import Path
from collections import defaultdict
import json

SCAN_DIR = Path(r"D:\study\novelskill\scan-data\20260515_2347_番茄")

files = {
    "男频新书榜": SCAN_DIR / "番茄男频新书榜_全题材_20260515.md",
    "女频新书榜": SCAN_DIR / "番茄女频新书榜_全题材_20260515.md",
    "男频阅读榜": SCAN_DIR / "番茄男频阅读榜_全题材_20260515.md",
    "女频阅读榜": SCAN_DIR / "番茄女频阅读榜_全题材_20260515.md",
}

meta_re = re.compile(r"\*未知 · 连载中 · ([\d.]+)万 在读 · ([\d.]+)万字\*")
update_re = re.compile(r"\*\*最新更新：\*\* 第\s*(\d+|[零一二三四五六七八九十百千]+)\s*章\s*(.+)")

cn_num = {"零":0,"一":1,"二":2,"三":3,"四":4,"五":5,"六":6,"七":7,"八":8,"九":9}

def cn_to_int(s):
    if s.isdigit():
        return int(s)
    if "千" in s:
        parts = s.split("千")
        k = cn_num.get(parts[0], 1) if parts[0] else 1
        rest_n = cn_to_int(parts[1]) if parts[1] else 0
        return k*1000 + rest_n
    if "百" in s:
        parts = s.split("百")
        h = cn_num.get(parts[0], 1) if parts[0] else 1
        rest = parts[1]
        if not rest:
            return h*100
        if "十" in rest:
            rp = rest.split("十")
            t = cn_num.get(rp[0], 1) if rp[0] else 1
            o = cn_num.get(rp[1], 0) if rp[1] else 0
            return h*100 + t*10 + o
        else:
            return h*100 + (cn_num.get(rest, 0) if rest else 0)
    if "十" in s:
        parts = s.split("十")
        t = cn_num.get(parts[0], 1) if parts[0] else 1
        o = cn_num.get(parts[1], 0) if parts[1] else 0
        return t*10 + o
    return cn_num.get(s, 0)

def parse_file(path):
    """返回 list of dict"""
    entries = []
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()

    blocks = re.split(r"^## ", text, flags=re.M)
    for blk in blocks[1:]:
        first_line = blk.split("\n",1)[0]
        sm = re.match(r"(.+?) — (\d+) 本", first_line)
        if not sm: continue
        ticai = sm.group(1).strip()
        count = int(sm.group(2))
        if count == 0: continue

        book_blocks = re.split(r"^### #", blk, flags=re.M)
        for bb in book_blocks[1:]:
            lines = bb.split("\n")
            rank_line = lines[0]
            try:
                rank = int(rank_line.split(" ",1)[0])
            except:
                continue

            mm = meta_re.search(bb)
            if not mm: continue
            zaidu = float(mm.group(1))
            zishu = float(mm.group(2))

            um = update_re.search(bb)
            if not um: continue
            ch_raw = um.group(1)
            ch_name = um.group(2).strip()
            try:
                ch_num = cn_to_int(ch_raw)
            except:
                ch_num = 0
            if ch_num == 0: continue

            entries.append({
                "题材": ticai,
                "排名": rank,
                "在读_万": zaidu,
                "字数_万": zishu,
                "最新章号": ch_num,
                "章名": ch_name,
                "章均字数": int(zishu * 10000 / ch_num) if ch_num > 0 else 0,
            })
    return entries

all_entries = {}
for tag, path in files.items():
    all_entries[tag] = parse_file(path)

# ===== 计算指标 =====

print("=" * 60)
print("各榜单样本量")
print("=" * 60)
for tag, ents in all_entries.items():
    print(f"  {tag}: {len(ents)} 条有效样本")

# 1. 整体章均字数
print("\n" + "=" * 60)
print("整体章均字数(全样本)")
print("=" * 60)
all_data = []
for ents in all_entries.values():
    all_data.extend(ents)

ch_lens = [e["章均字数"] for e in all_data if e["章均字数"] > 0]
ch_lens.sort()
print(f"  样本量: {len(ch_lens)}")
print(f"  平均章长: {sum(ch_lens)/len(ch_lens):.0f} 字")
print(f"  中位数:   {ch_lens[len(ch_lens)//2]} 字")
print(f"  P25:      {ch_lens[len(ch_lens)//4]} 字")
print(f"  P75:      {ch_lens[3*len(ch_lens)//4]} 字")
print(f"  最小:     {ch_lens[0]} 字")
print(f"  最大:     {ch_lens[-1]} 字")

# 2. 按性别向
print("\n" + "=" * 60)
print("按性别向 - 章均字数")
print("=" * 60)
for gender in ["男频", "女频"]:
    gender_data = []
    for tag, ents in all_entries.items():
        if tag.startswith(gender):
            gender_data.extend(ents)
    cl = [e["章均字数"] for e in gender_data if e["章均字数"] > 0]
    if not cl: continue
    cl.sort()
    print(f"\n  {gender}({len(cl)} 条):")
    print(f"    平均章长: {sum(cl)/len(cl):.0f} 字")
    print(f"    中位数:   {cl[len(cl)//2]} 字")

# 3. 按题材
print("\n" + "=" * 60)
print("按题材 - 章均字数(TOP 题材,样本 ≥10)")
print("=" * 60)
ticai_data = defaultdict(list)
for ents in all_entries.values():
    for e in ents:
        ticai_data[e["题材"]].append(e["章均字数"])

ticai_stats = []
for ticai, cls in ticai_data.items():
    cls = [c for c in cls if c > 0]
    if len(cls) < 10: continue
    cls.sort()
    ticai_stats.append({
        "题材": ticai,
        "样本": len(cls),
        "平均章长": int(sum(cls)/len(cls)),
        "中位数": cls[len(cls)//2],
        "P25": cls[len(cls)//4],
        "P75": cls[3*len(cls)//4],
    })

# 按平均章长降序
ticai_stats.sort(key=lambda x: x["平均章长"], reverse=True)
print(f"\n  {'题材':<12} {'样本':>4} {'平均':>5} {'中位':>5} {'P25':>5} {'P75':>5}")
print("  " + "-"*46)
for s in ticai_stats:
    print(f"  {s['题材']:<12} {s['样本']:>4} {s['平均章长']:>5} {s['中位数']:>5} {s['P25']:>5} {s['P75']:>5}")

# 4. 新书 vs 阅读榜对比
print("\n" + "=" * 60)
print("新书榜 vs 阅读榜 - 章均字数对比")
print("=" * 60)
for gender in ["男频", "女频"]:
    new_data = [e["章均字数"] for e in all_entries[f"{gender}新书榜"] if e["章均字数"] > 0]
    read_data = [e["章均字数"] for e in all_entries[f"{gender}阅读榜"] if e["章均字数"] > 0]
    if not new_data or not read_data: continue
    print(f"\n  {gender}:")
    print(f"    新书榜平均: {sum(new_data)/len(new_data):.0f} 字/章 ({len(new_data)} 本)")
    print(f"    阅读榜平均: {sum(read_data)/len(read_data):.0f} 字/章 ({len(read_data)} 本)")

# 5. 章名钩子样式抽取
print("\n" + "=" * 60)
print("章名钩子样式分类(取男频新书榜 TOP30 样本)")
print("=" * 60)
top_new_men = sorted(all_entries["男频新书榜"], key=lambda x:x["在读_万"], reverse=True)[:30]
hook_categories = {
    "数字派(用数字制造悬念)": [],
    "感叹号派(高情绪)": [],
    "问号派(悬念提问)": [],
    "省略号派(留白)": [],
    "对话派(直接引用台词)": [],
    "动作派(短句动作)": [],
    "信息派(直白事件)": [],
}
for e in top_new_men:
    name = e["章名"]
    if "！" in name or "!" in name:
        hook_categories["感叹号派(高情绪)"].append(name)
    elif "？" in name or "?" in name:
        hook_categories["问号派(悬念提问)"].append(name)
    elif "……" in name or "..." in name:
        hook_categories["省略号派(留白)"].append(name)
    elif name.startswith('"') or name.startswith("「") or name.startswith('"') or name.startswith('"'):
        hook_categories["对话派(直接引用台词)"].append(name)
    elif re.search(r'\d', name):
        hook_categories["数字派(用数字制造悬念)"].append(name)
    elif len(name) < 8:
        hook_categories["动作派(短句动作)"].append(name)
    else:
        hook_categories["信息派(直白事件)"].append(name)

for cat, items in hook_categories.items():
    if items:
        print(f"\n  {cat} ({len(items)}/{len(top_new_men)}={len(items)*100//len(top_new_men)}%):")
        for n in items[:5]:
            print(f"    · {n}")

# 6. 各题材 TOP 章名示例(供文风参考)
print("\n" + "=" * 60)
print("各题材 TOP3 新书的章名样式(供文风对标)")
print("=" * 60)
ticai_top_new = defaultdict(list)
for e in all_entries["男频新书榜"] + all_entries["女频新书榜"]:
    ticai_top_new[e["题材"]].append(e)
for ticai, ents in sorted(ticai_top_new.items()):
    ents.sort(key=lambda x:x["在读_万"], reverse=True)
    if not ents[:3]: continue
    print(f"\n  [{ticai}]")
    for e in ents[:3]:
        print(f"    #{e['排名']:>2} 在读 {e['在读_万']:>5.1f} 万 / 章均 {e['章均字数']:>4} 字 / 章名: {e['章名'][:30]}")

# 7. 输出 JSON 供 reference 文件直接用
# 各题材 TOP3 新书章名(避免终端乱码误抄)
ticai_top3 = {}
for ticai, ents in ticai_top_new.items():
    ents.sort(key=lambda x:x["在读_万"], reverse=True)
    ticai_top3[ticai] = [{"排名": e["排名"], "在读_万": e["在读_万"], "章均字数": e["章均字数"], "章名": e["章名"], "最新章号": e["最新章号"]} for e in ents[:3]]

# 章名钩子分类(基于男频新书榜 TOP30,完整记录每个章名归属哪一类)
hook_samples = {}
for cat, items in hook_categories.items():
    hook_samples[cat] = items

output = {
    "整体": {
        "样本量": len(ch_lens),
        "平均章长": int(sum(ch_lens)/len(ch_lens)),
        "中位数": ch_lens[len(ch_lens)//2],
        "P25": ch_lens[len(ch_lens)//4],
        "P75": ch_lens[3*len(ch_lens)//4],
    },
    "按题材": ticai_stats,
    "各题材TOP3新书": ticai_top3,
    "章名钩子分类_男频新书TOP30": hook_samples,
}
out_path = Path(r"D:\study\novelskill\scripts\fanqie_metrics.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)
print(f"\n\n[DONE] JSON written to: {out_path}")
