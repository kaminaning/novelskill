"""
番茄反爬字体解码：用图像比对找出 PUA 字符 → 真实汉字的映射。

原理：
1. 番茄反爬字体 (fanqie.woff2) 把真实汉字字形放在 PUA 位置 (E000-F8FF)
2. 用 Pillow 把每个 PUA 字符渲染为图像
3. 用同样的渲染参数把常用汉字（GB2312 一级字库 3755 字）也渲染为图像
4. 通过图像相似度找最近邻，建立映射表

输出: char_map.json (PUA codepoint -> real char)
"""
import sys, io, json, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont
import numpy as np

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FONT_PATH = os.path.join(SCRIPT_DIR, "fanqie.woff2")
OUTPUT_MAP = os.path.join(SCRIPT_DIR, "char_map.json")

# 渲染参数
IMG_SIZE = 64
FONT_SIZE = 50

def render_char(font_path, char, size=IMG_SIZE, font_size=FONT_SIZE):
    """渲染单字到固定大小的灰度图像"""
    img = Image.new("L", (size, size), 255)  # white bg
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype(font_path, font_size)
    except Exception as e:
        raise RuntimeError(f"无法加载字体 {font_path}: {e}")
    # 获取字符 bbox
    bbox = draw.textbbox((0, 0), char, font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    # 居中
    x = (size - w) // 2 - bbox[0]
    y = (size - h) // 2 - bbox[1]
    draw.text((x, y), char, fill=0, font=font)
    return np.array(img)

def img_to_features(arr):
    """简单的二值特征向量（行列像素和）"""
    binary = (arr < 128).astype(np.float32)
    return binary.flatten()

def similarity(a, b):
    """归一化欧氏距离的反数"""
    diff = np.sum(np.abs(a - b))
    return 1.0 / (1.0 + diff)

def load_pua_chars(font_path):
    """从 woff2 字体加载所有 PUA 字符列表"""
    f = TTFont(font_path)
    cmap = f.getBestCmap()
    return sorted(c for c in cmap if 0xE000 <= c <= 0xF8FF)

def load_candidate_chars():
    """加载候选汉字列表（GB2312 一级 3755 字 + 常用扩展）"""
    chars = set()
    # GB2312 一级汉字 (A1A1-FEFE 中编码范围 B0A1-D7FA)
    for high in range(0xB0, 0xD8):
        for low in range(0xA1, 0xFF):
            try:
                ch = bytes([high, low]).decode("gb2312")
                if len(ch) == 1:
                    chars.add(ch)
            except UnicodeDecodeError:
                continue
    # 补充：CJK 统一汉字常用区前 3500 字
    for cp in range(0x4E00, 0x4E00 + 3500):
        chars.add(chr(cp))
    return sorted(chars)

def main():
    pua_chars = load_pua_chars(FONT_PATH)
    print(f"PUA 字符数: {len(pua_chars)}")

    candidates = load_candidate_chars()
    print(f"候选字数: {len(candidates)}")

    # 渲染 PUA 字符（用番茄字体）
    print("渲染 PUA 字符（番茄字体）...")
    pua_features = {}
    for cp in pua_chars:
        try:
            arr = render_char(FONT_PATH, chr(cp))
            pua_features[cp] = img_to_features(arr)
        except Exception as e:
            print(f"  PUA U+{cp:04X} 渲染失败: {e}")

    # 渲染候选汉字（用微软雅黑作为参考字体）
    REF_FONT = r"C:\Windows\Fonts\msyh.ttc"
    if not os.path.exists(REF_FONT):
        REF_FONT = r"C:\Windows\Fonts\simhei.ttf"
    print(f"渲染候选汉字（参考字体: {REF_FONT}）...")
    cand_features = {}
    for ch in candidates:
        try:
            arr = render_char(REF_FONT, ch)
            cand_features[ch] = img_to_features(arr)
        except Exception:
            continue
    print(f"  实际渲染候选字: {len(cand_features)}")

    # 最近邻匹配
    print("匹配中（穷举最近邻）...")
    char_map = {}
    cand_arr = np.array(list(cand_features.values()))
    cand_keys = list(cand_features.keys())

    for i, (cp, pfeat) in enumerate(pua_features.items()):
        if i % 50 == 0:
            print(f"  [{i}/{len(pua_features)}]")
        # 计算与所有候选字的距离
        dist = np.sum(np.abs(cand_arr - pfeat), axis=1)
        best_idx = int(np.argmin(dist))
        best_char = cand_keys[best_idx]
        best_dist = float(dist[best_idx])
        char_map[f"U+{cp:04X}"] = {"char": best_char, "dist": best_dist}

    # 保存映射表
    # 简化输出：U+XXXX -> char
    simple_map = {hex(cp): char_map[f"U+{cp:04X}"]["char"] for cp in pua_chars}
    with open(OUTPUT_MAP, "w", encoding="utf-8") as f:
        json.dump(simple_map, f, ensure_ascii=False, indent=2)
    print(f"\n映射表已保存到 {OUTPUT_MAP}")

    # 测试：用映射表解码书名
    test_str = "巫：识，杀穿？"  # 实际是 "巫：xxxx识，x杀穿xx？"
    decoded = ""
    for c in test_str:
        cp = ord(c)
        if 0xE000 <= cp <= 0xF8FF:
            decoded += simple_map.get(hex(cp), "?")
        else:
            decoded += c
    print(f"\n测试解码:")
    print(f"  原始: {test_str}")
    print(f"  解码: {decoded}")

    # 输出 distance 分布做诊断
    dists = sorted([v["dist"] for v in char_map.values()])
    print(f"\n距离分布: min={dists[0]:.1f} median={dists[len(dists)//2]:.1f} max={dists[-1]:.1f}")

if __name__ == "__main__":
    main()
