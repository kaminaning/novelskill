"""检查番茄反爬字体的 cmap 结构，找出 PUA → 真实字符的映射规律"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from fontTools.ttLib import TTFont

font = TTFont("fanqie.woff2")

# 看看有哪些表
print("Tables:", list(font.keys()))

# cmap 表 - 字符到 glyph id 的映射
cmap = font.getBestCmap()
pua_chars = [(c, name) for c, name in cmap.items() if 0xE000 <= c <= 0xF8FF]
non_pua = [(c, name) for c, name in cmap.items() if not (0xE000 <= c <= 0xF8FF)]

print(f"\nTotal mapped characters: {len(cmap)}")
print(f"PUA chars (E000-F8FF): {len(pua_chars)}")
print(f"Non-PUA chars: {len(non_pua)}")

# 看前 20 个 PUA 映射
print("\n=== First 20 PUA mappings ===")
for c, name in pua_chars[:20]:
    print(f"U+{c:04X}  glyph_name='{name}'  char='{chr(c)}'")

# 看 non-PUA 映射的 glyph 名
print("\n=== First 20 non-PUA mappings ===")
for c, name in non_pua[:20]:
    print(f"U+{c:04X} ({chr(c)})  glyph_name='{name}'")

# 检查 glyph 名规律
print("\n=== Glyph name patterns ===")
name_patterns = {}
for c, name in pua_chars[:30]:
    prefix = ''.join(filter(str.isalpha, name[:5]))
    name_patterns.setdefault(prefix, []).append((c, name))
for prefix, items in list(name_patterns.items())[:5]:
    print(f"  prefix='{prefix}' count={len(items)} sample={items[:3]}")

# 检查特定的 PUA 字符（书名"巫：识，杀穿？"里的 e453）
print("\n=== Specific characters from book name ===")
for c in [0xe453, 0xe4bf, 0xe487, 0xe421, 0xe4a4, 0xe466, 0xe506]:
    name = cmap.get(c, None)
    print(f"U+{c:04X} -> glyph_name='{name}'")
