# -*- coding: utf-8 -*-
"""
完整截图所有模块的所有视图，保存到 latexnew/figures/。

视图清单：
  memberA 5 张: overview, migration, centers, identity, periods
  memberB 7 张: trajectory, comparison, heatmap, evolution, rhythm, cohort, radar
  memberC 3 张: fig1(团队规模), fig2(合作弧线), fig3(内部引用)
  memberD 3 张: evolution, bridges, breadth
  memberE 3 张: Physics, Chemistry, Medicine
合计 21 张。
"""

import os
import sys
import time
import http.server
import socketserver
import mimetypes
import threading
import contextlib
import subprocess

from playwright.sync_api import sync_playwright

ROOT = r"c:\Users\ADMIN\Desktop\code\datavisualization"
OUT = os.path.join(ROOT, "latexnew", "figures")
PORT = 18766
os.makedirs(OUT, exist_ok=True)


# -------- 启动本地静态服务器 --------
def start_server():
    mimetypes.add_type("application/javascript", ".js")
    mimetypes.add_type("application/wasm", ".wasm")
    mimetypes.add_type("text/css", ".css")
    mimetypes.add_type("text/html", ".html")
    mimetypes.add_type("application/json", ".json")
    mimetypes.add_type("text/csv", ".csv")
    mimetypes.add_type("image/svg+xml", ".svg")
    mimetypes.add_type("image/jpeg", ".jpg")
    mimetypes.add_type("image/png", ".png")
    mimetypes.add_type("image/webp", ".webp")

    class QuietHandler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, fmt, *args):
            pass

    os.chdir(ROOT)

    class ReusableTCPServer(socketserver.TCPServer):
        allow_reuse_address = True

    httpd = ReusableTCPServer(("127.0.0.1", PORT), QuietHandler)
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    return httpd


def wait_idle(page, ms=400):
    try:
        page.wait_for_load_state("networkidle", timeout=8000)
    except Exception:
        pass
    page.wait_for_timeout(ms)


def goto_module(page, section_id):
    page.wait_for_selector(f"#{section_id}", timeout=20000, state="attached")
    page.evaluate(
        """
        async (targetId) => {
          for (let i = 0; i < 80; i++) {
            const sec = document.getElementById(targetId);
            if (!sec) return;
            if (sec.classList.contains('is-active')) break;
            const all = Array.from(document.querySelectorAll('.page'));
            const idx = all.findIndex(p => p.id === targetId);
            const dots = document.querySelectorAll('.page-dot');
            if (dots[idx]) dots[idx].click();
            await new Promise(r => setTimeout(r, 250));
          }
          const sec = document.getElementById(targetId);
          if (sec) sec.scrollIntoView({behavior:'instant', block:'center'});
        }
        """,
        section_id,
    )
    wait_idle(page, 2000)


def click_tab(page, selector, settle=1500):
    page.wait_for_selector(selector, timeout=15000, state="attached")
    page.evaluate(
        """(sel) => {
          const el = document.querySelector(sel);
          if (el) el.click();
        }""",
        selector,
    )
    wait_idle(page, settle)


def screenshot_svg(page, svg_selector, out_path):
    el = page.query_selector(svg_selector)
    if not el:
        print(f"  [WARN] 找不到 {svg_selector}")
        return False
    el.scroll_into_view_if_needed()
    wait_idle(page, 400)
    el.screenshot(path=out_path, omit_background=False, scale="device")
    print(f"  [OK] {os.path.basename(out_path)}")
    return True


def screenshot_container(page, sel, out_path):
    el = page.query_selector(sel)
    if not el:
        print(f"  [WARN] 找不到 {sel}")
        return False
    el.scroll_into_view_if_needed()
    wait_idle(page, 400)
    el.screenshot(path=out_path)
    print(f"  [OK] {os.path.basename(out_path)}")
    return True


def main():
    # 先清空旧的 module* 截图
    import glob
    for f in glob.glob(os.path.join(OUT, "module*.png")):
        os.remove(f)
        print(f"  [clean] removed {os.path.basename(f)}")

    print("[INFO] 启动本地 HTTP 服务器 ...")
    httpd = start_server()
    url = f"http://127.0.0.1:{PORT}/index.html"
    print(f"[INFO] 将打开 {url}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            viewport={"width": 1600, "height": 1000},
            device_scale_factor=1.5,
        )
        page = ctx.new_page()
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        wait_idle(page, 4000)

        # ===== 模块 A：5 张 =====
        print("\n[A] 模块A · 地缘轨迹（5 视图）")
        goto_module(page, "section-macro")
        for view in ["overview", "migration", "centers", "identity", "periods"]:
            click_tab(
                page,
                f".member-a-tabs .member-a-tab[data-view='{view}']",
                settle=1500,
            )
            screenshot_container(
                page,
                "#section-macro .member-a-chart",
                os.path.join(OUT, f"moduleA_{view}.png"),
            )

        # ===== 模块 B：7 张 =====
        print("\n[B] 模块B · 学术生命周期（7 视图）")
        goto_module(page, "section-trajectory")
        for view in [
            "trajectory",
            "comparison",
            "heatmap",
            "evolution",
            "rhythm",
            "cohort",
            "radar",
        ]:
            click_tab(
                page,
                f".member-b-tabs .member-b-tab[data-view='{view}']",
                settle=1500,
            )
            screenshot_container(
                page,
                "#section-trajectory .member-b-chart",
                os.path.join(OUT, f"moduleB_{view}.png"),
            )

        # ===== 模块 C：3 张（三视图切换） =====
        print("\n[C] 模块C · 合作网络（3 视图）")
        goto_module(page, "section-network")
        wait_idle(page, 1500)
        for idx, label, svgsel, fname in [
            (0, "团队规模", "svg[data-mc-svg='1']", "team_size"),
            (1, "合作弧线", "svg[data-mc-svg='2']", "collab_arcs"),
            (2, "内部引用", "svg[data-mc-svg='3']", "citation_heat"),
        ]:
            click_tab(
                page,
                f".mc-tabs .mc-tab[data-mc-tab='{idx}']",
                settle=1500,
            )
            screenshot_svg(
                page,
                svgsel,
                os.path.join(OUT, f"moduleC_{fname}.png"),
            )

        # ===== 模块 D：3 张 =====
        print("\n[D] 模块D · 研究主题迁移（3 视图）")
        goto_module(page, "section-alluvial")
        wait_idle(page, 1500)
        for view in ["evolution", "bridges", "breadth"]:
            click_tab(
                page,
                f".member-d-tabs .member-d-tab[data-d-view='{view}']",
                settle=1500,
            )
            screenshot_container(
                page,
                "#section-alluvial .member-d-chart",
                os.path.join(OUT, f"moduleD_{view}.png"),
            )

        # ===== 模块 E：3 张 =====
        print("\n[E] 模块E · 长尾影响力（3 学科）")
        goto_module(page, "section-morphing")
        wait_idle(page, 1500)
        for disc in ["Physics", "Chemistry", "Medicine"]:
            click_tab(
                page,
                f".member-a-tabs .member-a-tab[data-e-discipline='{disc}']",
                settle=1500,
            )
            screenshot_container(
                page,
                "#section-morphing .member-a-chart",
                os.path.join(OUT, f"moduleE_{disc.lower()}.png"),
            )

        browser.close()

    httpd.shutdown()

    # 总结
    files = sorted(glob.glob(os.path.join(OUT, "module*.png")))
    print(f"\n[ALL DONE] 共 {len(files)} 张截图")
    for f in files:
        print(f"  {os.path.basename(f):<32} {os.path.getsize(f) / 1024:>7.1f} KB")


if __name__ == "__main__":
    main()
