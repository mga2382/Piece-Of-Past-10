#!/usr/bin/env python3
"""
Büyük Türkçe Sözlük PDF'sinden her seviye için "ekstra kelime" listesi üretir.

Kullanım (proje kökünden):
    pip install pdfplumber
    python3 tools/build_extras.py --pdf "Büyük_Türkçe_Sözlük.pdf" \
        --levels www/data/levels.json --out www/data/extras.json

PDF'i okumak ~8-10 dk sürer. İlk çalıştırmada ara sonuç tools/.sozluk_cache.jsonl
dosyasına yazılır; sonraki çalıştırmalar (yeni bölüm eklediğinde) saniyeler sürer.

Çıktı (extras.json):
    { "<bölüm id>": { "x": {EKSTRA_KELİME: anlam, ...},   # sözlükte var, levels.json'da yok
                      "m": {BÖLÜM_KELİMESİ: anlam, ...} } }  # levels.json kelimelerinin anlamları
"""
import argparse, json, os, re, sys
from collections import Counter, defaultdict

NOM = {'ı': 2.0, 'ş': 4.0, 'ğ': 4.0, 'İ': 3.0, 'Ş': 5.0, 'Ğ': 7.0}  # PDF'te Türkçe harflerin gerçek genişliği
MAX_SENSES, MAX_SENSE_LEN, MAX_TOTAL = 3, 110, 240


# ---------- 1) PDF -> satırlar ----------
def page_lines(p):
    ch = sorted(p.chars, key=lambda c: (c['top'], c['x0']))
    lines, cur, t0 = [], [], None
    for c in ch:
        if t0 is None or c['top'] - t0 > 3:
            if cur:
                lines.append(cur)
            cur, t0 = [c], c['top']
        else:
            cur.append(c)
    if cur:
        lines.append(cur)
    for l in lines:
        l.sort(key=lambda c: c['x0'])
        txt, prev = "", None
        for c in l:
            if prev is not None and c['text'] != ' ':
                pw = NOM.get(prev['text'], prev['x1'] - prev['x0']) if 'LNTSC' in prev['fontname'] else prev['x1'] - prev['x0']
                if c['x0'] - prev['x0'] - pw > 1.5:
                    txt += " "
            txt += c['text']
            prev = c
        yield round(l[0]['x0'], 1), round(l[0]['top'], 1), txt


def read_pdf(pdf_path, cache):
    if os.path.exists(cache):
        with open(cache, encoding="utf-8") as f:
            return [json.loads(x) for x in f]
    import pdfplumber
    rows = []
    with pdfplumber.open(pdf_path) as pdf:
        n = len(pdf.pages)
        for i, p in enumerate(pdf.pages):
            for x, t, s in page_lines(p):
                rows.append([i, x, t, s])
            p.flush_cache()
            if i % 200 == 0:
                print(f"  sayfa {i}/{n}", file=sys.stderr)
    with open(cache, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    return rows


# ---------- 2) satırlar -> {madde: [anlamlar]} ----------
def parse_entries(rows):
    entries = []          # (madde, [anlam, ...])
    head, senses = None, []
    prev_page, prev_top = -1, -999
    n = len(rows)
    for k, (pg, x, top, s) in enumerate(rows):
        s = s.strip()
        if not s:
            continue
        new_block = pg != prev_page or top - prev_top >= 18
        nxt = rows[k + 1] if k + 1 < n else None
        next_is_sense = nxt is not None and nxt[3].lstrip().startswith("*")
        if x < 80 and not s.startswith("*") and new_block and next_is_sense:
            if head is not None:
                entries.append((head, senses))
            head, senses = s, []
        elif head is not None:
            if s.startswith("*"):
                senses.append(s.lstrip("* ").strip())
            elif senses:
                senses[-1] += " " + s          # satır devamı
        prev_page, prev_top = pg, top
    if head is not None:
        entries.append((head, senses))
    return entries


# ---------- 3) Türkçe büyük harf normalleştirme ----------
FOLD = {'â': 'a', 'î': 'i', 'û': 'u', 'Â': 'A', 'Î': 'İ', 'Û': 'U'}
OK = set("ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ")


def tr_upper(s):
    return "".join(FOLD.get(ch, ch) for ch in s).replace("i", "İ").replace("ı", "I").upper()


def clean_sense(t):
    t = re.sub(r"\s+", " ", t).strip()
    t = re.sub(r"\s+([,.;:!?])", r"\1", t)
    return t


def pack_meaning(senses):
    ss = [clean_sense(s) for s in senses if clean_sense(s)]
    real = [s for s in ss if not s.lower().startswith("bkz")]
    ss = real or ss
    out, total = [], 0
    for s in ss[:MAX_SENSES]:
        if len(s) > MAX_SENSE_LEN:
            s = s[:MAX_SENSE_LEN].rsplit(" ", 1)[0].rstrip(",;:") + "…"
        if total + len(s) > MAX_TOTAL and out:
            break
        out.append(s)
        total += len(s)
    return " • ".join(out) if len(out) > 1 else (out[0] if out else "")


def build_dictionary(entries):
    d = defaultdict(list)
    for head, senses in entries:
        h = head.strip()
        if not h or not h[0].islower():              # özel isimleri ve ek/kısaltmaları alma
            continue
        if not re.fullmatch(r"[a-zçğıöşüâîû]+", h):  # tek sözcük, sadece harf
            continue
        w = tr_upper(h)
        if len(w) < 3 or not set(w) <= OK:
            continue
        d[w].extend(senses)
    return {w: m for w, m in ((w, pack_meaning(s)) for w, s in d.items()) if m}


# ---------- 4) seviyeler için ekstra kelimeler ----------
def build_extras(levels, dic):
    res = {}
    for L in levels:
        letters = Counter(L["letters"])
        lvl_words = {w for ws in L["words"].values() for w in ws}
        x, m = {}, {}
        for w, mean in dic.items():
            if len(w) > len(L["letters"]):
                continue
            need = Counter(w)
            if any(need[c] > letters[c] for c in need):
                continue
            if w in lvl_words:
                m[w] = mean
            else:
                x[w] = mean
        res[str(L["id"])] = {"x": dict(sorted(x.items(), key=lambda kv: (len(kv[0]), kv[0]))),
                             "m": dict(sorted(m.items()))}
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", default="Büyük_Türkçe_Sözlük.pdf")
    ap.add_argument("--levels", default="www/data/levels.json")
    ap.add_argument("--out", default="www/data/extras.json")
    ap.add_argument("--cache", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), ".sozluk_cache.jsonl"))
    a = ap.parse_args()
    rows = read_pdf(a.pdf, a.cache)
    dic = build_dictionary(parse_entries(rows))
    print(f"sözlükte {len(dic)} tek sözcüklü madde")
    levels = json.load(open(a.levels, encoding="utf-8"))["levels"]
    res = build_extras(levels, dic)
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(res, f, ensure_ascii=False, separators=(",", ":"))
    for k, v in res.items():
        print(f"bölüm {k}: {len(v['x'])} ekstra kelime")


if __name__ == "__main__":
    main()
