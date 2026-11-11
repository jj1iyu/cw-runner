"""実在局データ（data/cwr-data.js）を作り直す

Morse Runner Community Edition（https://github.com/w7sst/MorseRunner, MPL 2.0）の
JARL_ALLJA.TXT・CQWWCW.txt・DXCC.LIST を読み込み、JA CW Runner 用の形に変換します。

使い方:
  git clone --depth 1 https://github.com/w7sst/MorseRunner /tmp/MorseRunner
  python3 tools/convert-data.py /tmp/MorseRunner
  npm test        # データの形を検査
"""
import json
import pathlib
import re
import sys

src = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/MorseRunner')
out_path = pathlib.Path(__file__).resolve().parent.parent / 'data' / 'cwr-data.js'


def lines(name):
    raw = (src / name).read_bytes().decode('cp932', errors='replace')
    for line in raw.splitlines():
        line = line.strip()
        if not line or line.startswith('#') or line.startswith('!!'):
            continue
        yield [x.strip() for x in line.split(',')]


# ALL JA：コールと「都府県支庁ナンバー＋電力」
ja = []
for f in lines('JARL_ALLJA.TXT'):
    if len(f) >= 2 and re.fullmatch(r'[A-Z0-9/]+', f[0]) and re.fullmatch(r'\d{1,3}[HMLP]', f[1]):
        ja.append(f'{f[0]},{f[1]}')

# DXCC：コールからエンティティと大陸を判定するための正規表現
dx_re = []
for line in (src / 'DXCC.LIST').read_text(encoding='utf-8', errors='replace').splitlines():
    p = line.strip().split(';')
    if len(p) < 7:
        continue
    try:
        rx = re.compile(p[1])
    except re.error:
        continue
    dx_re.append((rx, p[2], p[3][:2]))


def entity(call):
    base = call.split('/')[0]
    best, best_len = None, 0
    for rx, name, cont in dx_re:
        m = rx.match(base)
        if m and len(m.group(0)) > best_len:
            best, best_len = (name, cont), len(m.group(0))
    return best


# DX：CQ WW CW の参加局（JA は除く）、CQゾーンは 1〜40 のものだけ
JA = re.compile(r'^(J[A-S]|7[J-N]|8[J-N])')
ents, conts, eidx, dx = [], [], {}, []
skipped = {'no_entity': 0, 'bad_zone': 0}
for f in lines('CQWWCW.txt'):
    if len(f) < 2 or not f[1].isdigit():
        continue
    call, zone = f[0], int(f[1])
    if JA.match(call) or not re.fullmatch(r'[A-Z0-9/]+', call):
        continue
    if not 1 <= zone <= 40:
        skipped['bad_zone'] += 1
        continue
    e = entity(call)
    if not e:
        skipped['no_entity'] += 1
        continue
    if e[0] not in eidx:
        eidx[e[0]] = len(ents)
        ents.append(e[0])
        conts.append(e[1])
    dx.append(f'{call},{zone},{eidx[e[0]]}')

header = '''/* JA CW Runner 参加局データ（tools/convert-data.py で生成。手で編集しないでください）
 * 出典: Morse Runner Community Edition (https://github.com/w7sst/MorseRunner)
 *   JARL_ALLJA.TXT（2026年 ALL JA 提出ログをもとに作成）, CQWWCW.txt（VE2FK 作成の N1MM コールヒストリー）, DXCC.LIST
 * これらのデータは Mozilla Public License 2.0 に従います: https://mozilla.org/MPL/2.0/
 */
'''
data = {'ja': ';'.join(ja), 'dxEnts': ents, 'dxCont': conts, 'dx': ';'.join(dx)}
out_path.write_text(header + 'window.CWR_DATA=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(f'ALL JA {len(ja)}局 / DX {len(dx)}局・{len(ents)}エンティティ / 除外 {skipped}')
