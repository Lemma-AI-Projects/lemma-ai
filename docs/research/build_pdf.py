"""Focus Mode 调研报告 PDF 构建脚本（可复用管线）。

用法：python build_pdf.py [v1|v2|<md路径>]
流程：docs/research/focus-mode-technical-report.md
  → markdown → HTML 模板（A4 / 每页左上 logo / 中文字体 / 表格样式）
  → chrome --headless --print-to-pdf → 同目录同名 PDF。

⚠️ 上边距 26mm：logo（fixed, top 5mm, 高约 12mm）与正文之间必须留 ≥8mm 空隙，
   否则首段文字与 logo 重叠（2026-10-26 用户反馈的排版事故）。
"""
import markdown, pathlib, subprocess, sys

ROOT = pathlib.Path(__file__).parent
arg = sys.argv[1] if len(sys.argv) > 1 else "v1"
if arg == "v1":
    MD = ROOT / "focus-mode-technical-report.md"
elif arg == "v2":
    MD = ROOT / "focus-mode-technical-report-v2.md"
else:
    MD = pathlib.Path(arg)
PDF = MD.with_name("Lemma AI Focus Mode 交互机制与技术实现路线调研报告" +
    (" V2" if "v2" in MD.stem else "") + ".pdf")
LOGO = "file:///C:/Users/chkev/Desktop/software/lemma%20logo.png"
CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe"
TMP = r"D:/github projects/lemma-ai/.workbuddy/tmp/focus-mode-report.html"

TPL = """<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<style>
@page { size: A4; margin: 26mm 15mm 16mm 22mm; }
@media screen { body { padding-top: 70px; } }
* { box-sizing: border-box; }
body {
  font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif;
  font-size: 10.5pt; line-height: 1.75; color: #1f2328; margin: 0;
}
.brand { position: fixed; top: 5mm; left: 8mm; width: 40px; }
.brand img { width: 40px; height: auto; }
.brand::after {
  content: "Lemma AI"; display: block; font-size: 7pt; color: #8A5A2B;
  letter-spacing: .08em; margin-top: 1px;
}
h1 { font-size: 19pt; line-height: 1.4; border-bottom: 2px solid #8A5A2B; padding-bottom: 8px; }
h2 { font-size: 14.5pt; margin-top: 26px; border-left: 4px solid #8A5A2B; padding-left: 10px; page-break-after: avoid; }
h3 { font-size: 12pt; margin-top: 18px; page-break-after: avoid; }
p, li { text-align: justify; }
blockquote { margin: 8px 0; padding: 6px 12px; border-left: 3px solid #D9C79E; background: #FBF8F1; color: #57534E; }
code { font-family: Consolas, monospace; font-size: 9pt; background: #F4F2EC; padding: 1px 4px; border-radius: 3px; }
pre { background: #F7F6F2; padding: 8px 10px; border-radius: 6px; font-size: 8.5pt; overflow-x: hidden; page-break-inside: avoid; }
pre code { background: none; padding: 0; }
table { border-collapse: collapse; width: 100%; font-size: 9pt; margin: 10px 0; page-break-inside: avoid; }
th, td { border: 1px solid #D6D3CD; padding: 4px 7px; text-align: left; vertical-align: top; }
th { background: #F0EDE6; font-weight: 600; }
hr { border: none; border-top: 1px solid #D6D3CD; margin: 18px 0; }
a { color: #8A5A2B; text-decoration: none; }
strong { color: #111; }
figure { margin: 12px 0; text-align: center; page-break-inside: avoid; }
figcaption { font-size: 9pt; color: #6B7280; margin-top: 4px; }
svg { max-width: 100%; height: auto; }
</style></head><body>
<img class="brand" src="__LOGO__" alt="Lemma AI">
<main>__BODY__</main>
</body></html>"""

body = markdown.markdown(MD.read_text(encoding="utf-8"), extensions=["tables", "fenced_code"])
html_doc = TPL.replace("__LOGO__", LOGO).replace("__BODY__", body)
pathlib.Path(TMP).write_text(html_doc, encoding="utf-8")
subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-first-run",
                "--no-pdf-header-footer", "--virtual-time-budget=8000",
                f"--print-to-pdf={PDF}", TMP], check=True)
r_size = PDF.stat().st_size
print(f"PDF written: {PDF} ({r_size} bytes)")
