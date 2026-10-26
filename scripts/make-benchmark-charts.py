#!/usr/bin/env python3
"""Generate the benchmark charts used in README.md / README.fr.md.

Reads docs/benchmarks/2026-10-26-expanded.json and writes PNG assets.
No network, no model calls.
"""

from __future__ import annotations

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "docs" / "benchmarks" / "2026-10-26-expanded.json"
OUT = ROOT / "docs" / "assets"

ROUTED = "#f1592c"
BASELINE = "#64748b"
GREEN = "#16a34a"
RED = "#dc2626"
INK = "#0f172a"
MUTED = "#64748b"
GRID = "#e2e8f0"

TIERS = ["mechanical", "implementation", "debugging"]
LABELS = {
    "en": {
        "mechanical": "mechanical",
        "implementation": "implementation",
        "debugging": "debugging",
        "overall": "overall",
        "routed": "Routed",
        "baseline": "Baseline",
        "cost_title": "Cost per accepted task",
        "cost_sub": "USD, lower is better. Debugging is a quality guard, not a saving.",
        "quality_title": "Pass rate",
        "quality_sub": "Accepted runs / runs. Higher is better.",
        "change_title": "Cost change vs baseline",
        "change_sub": "Negative is a saving. Debugging costs more because Opus is used.",
        "tokens_title": "Tokens per accepted task",
        "tokens_sub": "Lower is better. Baseline failures inflate its debugging token count.",
        "cost_axis": "USD per accepted task",
        "quality_axis": "Pass rate",
        "change_axis": "Change vs baseline",
        "tokens_axis": "Tokens per accepted task",
        "colors": "Orange = routed, grey = baseline.",
        "source": "Source: 48 runs, 12 tasks × 2 variants × 2 repeats. API-equivalent cost, not a subscription bill.",
        "lang": "en",
    },
    "fr": {
        "mechanical": "mechanical",
        "implementation": "implementation",
        "debugging": "debugging",
        "overall": "global",
        "routed": "Routé",
        "baseline": "Baseline",
        "cost_title": "Coût par tâche acceptée",
        "cost_sub": "USD, plus bas = mieux. Le debugging est un garde-fou qualité, pas une économie.",
        "quality_title": "Taux d’acceptation",
        "quality_sub": "Runs acceptés / runs. Plus haut = mieux.",
        "change_title": "Écart de coût vs baseline",
        "change_sub": "Négatif = économie. Le debugging coûte plus cher car Opus est utilisé.",
        "tokens_title": "Tokens par tâche acceptée",
        "tokens_sub": "Plus bas = mieux. Les échecs du baseline gonflent ses tokens en debugging.",
        "cost_axis": "USD par tâche acceptée",
        "quality_axis": "Taux d’acceptation",
        "change_axis": "Écart vs baseline",
        "tokens_axis": "Tokens par tâche acceptée",
        "colors": "Orange = routé, gris = baseline.",
        "source": "Source : 48 runs, 12 tâches × 2 variantes × 2 répétitions. Coût API-équivalent, pas une facture d’abonnement.",
        "lang": "fr",
    },
}


def load() -> dict:
    return json.loads(DATA.read_text())


def tier_stats(data: dict, tier: str, variant: str) -> dict:
    rows = [r for r in data["results"] if r["tier"] == tier and r["variant"] == variant]
    passed = sum(1 for r in rows if r["accepted"])
    cost = sum(r["cost_usd"] for r in rows)
    tokens = sum(r["tokens"] for r in rows)
    return {
        "runs": len(rows),
        "passed": passed,
        "pass_rate": passed / len(rows) if rows else 0,
        "cost": cost,
        "cost_per_passed": cost / passed if passed else None,
        "tokens": tokens,
        "tokens_per_passed": tokens / passed if passed else None,
    }


def overall(data: dict, variant: str) -> dict:
    s = data["summary"][variant]
    return {
        "passed": s["passed"],
        "runs": s["runs"],
        "pass_rate": s["passRate"],
        "cost_per_passed": s["costPerPassedUsd"],
        "tokens_per_passed": s["tokensPerPassed"],
    }


def style(ax, title: str, subtitle: str, axis_label: str) -> None:
    ax.set_facecolor("white")
    ax.text(0, 1.12, title, transform=ax.transAxes, fontsize=17, fontweight="bold", color=INK, va="bottom")
    ax.text(0, 1.04, subtitle, transform=ax.transAxes, fontsize=10.5, color=MUTED, va="bottom")
    ax.set_xlabel(axis_label, fontsize=10.5, color=MUTED, labelpad=8)
    ax.tick_params(colors=MUTED, labelsize=10)
    ax.grid(axis="x", color=GRID, linewidth=1)
    ax.set_axisbelow(True)
    for spine in ("top", "right", "left"):
        ax.spines[spine].set_visible(False)
    ax.spines["bottom"].set_color(GRID)




def money(v: float, lang: str) -> str:
    raw = f"{v:.4f}" if v < 0.01 else f"{v:.3f}"
    return f"${raw}" if lang == "en" else f"{raw.replace('.', ',')} $"


def pct(v: float, lang: str, signed: bool = False) -> str:
    raw = f"{v:+.1f}" if signed else f"{v:.1f}"
    return f"{raw}%" if lang == "en" else f"{raw.replace('.', ',')} %"


def count(v: float, lang: str) -> str:
    raw = f"{v:,.0f}"
    return raw if lang == "en" else raw.replace(",", " ")


def grouped_bars(ax, values_routed, values_baseline, labels, fmt, title, subtitle, axis_label):
    y = list(range(len(labels)))
    h = 0.36
    ax.barh([i + h / 2 for i in y], values_routed, height=h, color=ROUTED, label=LABELS["en"]["routed"])
    ax.barh([i - h / 2 for i in y], values_baseline, height=h, color=BASELINE, label=LABELS["en"]["baseline"])
    ax.set_yticks(y)
    ax.set_yticklabels(labels)
    ax.invert_yaxis()
    for i, v in enumerate(values_routed):
        ax.text(v, i + h / 2, "  " + fmt(v), va="center", fontsize=9.5, color=INK, fontweight="bold")
    for i, v in enumerate(values_baseline):
        ax.text(v, i - h / 2, "  " + fmt(v), va="center", fontsize=9.5, color=INK)
    style(ax, title, subtitle, axis_label)


def make(lang: str, data: dict) -> None:
    L = LABELS[lang]
    plt.rcParams.update({
        "font.family": "Lato",
        "figure.facecolor": "white",
        "axes.facecolor": "white",
    })

    stats = {(t, v): tier_stats(data, t, v) for t in TIERS for v in ("routed", "baseline")}
    totals = {v: overall(data, v) for v in ("routed", "baseline")}

    # Figure 1: cost per accepted + pass rate.
    fig, axes = plt.subplots(1, 2, figsize=(16, 6.4), dpi=160)
    fig.subplots_adjust(left=0.11, right=0.98, top=0.80, bottom=0.16, wspace=0.35)

    labels = [L[t] for t in TIERS] + [L["overall"]]
    cost_routed = [stats[(t, "routed")]["cost_per_passed"] for t in TIERS] + [totals["routed"]["cost_per_passed"]]
    cost_baseline = [stats[(t, "baseline")]["cost_per_passed"] for t in TIERS] + [totals["baseline"]["cost_per_passed"]]
    grouped_bars(
        axes[0],
        cost_routed,
        cost_baseline,
        labels,
        lambda v: money(v, lang),
        L["cost_title"],
        f"{L['cost_sub']} {L['colors']}",
        L["cost_axis"],
    )

    pass_routed = [stats[(t, "routed")]["pass_rate"] * 100 for t in TIERS] + [totals["routed"]["pass_rate"] * 100]
    pass_baseline = [stats[(t, "baseline")]["pass_rate"] * 100 for t in TIERS] + [totals["baseline"]["pass_rate"] * 100]
    grouped_bars(
        axes[1],
        pass_routed,
        pass_baseline,
        labels,
        lambda v: pct(v, lang),
        L["quality_title"],
        f"{L['quality_sub']} {L['colors']}",
        L["quality_axis"],
    )
    axes[1].set_xlim(0, 112)

    fig.text(0.01, 0.015, L["source"], fontsize=8.5, color=MUTED)
    fig.savefig(OUT / f"benchmark-cost-quality.{lang}.png", bbox_inches="tight", facecolor="white")
    plt.close(fig)

    # Figure 2: cost change + tokens per accepted.
    fig, axes = plt.subplots(1, 2, figsize=(16, 6.4), dpi=160)
    fig.subplots_adjust(left=0.11, right=0.98, top=0.80, bottom=0.16, wspace=0.35)

    change = []
    for t in TIERS:
        r = stats[(t, "routed")]["cost_per_passed"]
        b = stats[(t, "baseline")]["cost_per_passed"]
        change.append((r - b) / b * 100)
    change.append((totals["routed"]["cost_per_passed"] - totals["baseline"]["cost_per_passed"]) / totals["baseline"]["cost_per_passed"] * 100)
    colors = [GREEN if v < 0 else RED for v in change]
    y = list(range(len(labels)))
    axes[0].barh(y, change, color=colors, height=0.55)
    axes[0].axvline(0, color=INK, linewidth=1)
    axes[0].set_yticks(y)
    axes[0].set_yticklabels(labels)
    axes[0].invert_yaxis()
    for i, v in enumerate(change):
        axes[0].text(v + (2.5 if v >= 0 else -2.5), i, pct(v, lang, signed=True), va="center", ha="left" if v >= 0 else "right", fontsize=10, fontweight="bold", color=INK)
    axes[0].set_xlim(-115, 45)
    style(axes[0], L["change_title"], L["change_sub"], L["change_axis"])

    tok_routed = [stats[(t, "routed")]["tokens_per_passed"] for t in TIERS] + [totals["routed"]["tokens_per_passed"]]
    tok_baseline = [stats[(t, "baseline")]["tokens_per_passed"] for t in TIERS] + [totals["baseline"]["tokens_per_passed"]]
    grouped_bars(
        axes[1],
        tok_routed,
        tok_baseline,
        labels,
        lambda v: count(v, lang),
        L["tokens_title"],
        f"{L['tokens_sub']} {L['colors']}",
        L["tokens_axis"],
    )
    axes[1].xaxis.set_major_formatter(FuncFormatter(lambda v, _: f"{v/1000:.0f}k"))

    fig.text(0.01, 0.015, L["source"], fontsize=8.5, color=MUTED)
    fig.savefig(OUT / f"benchmark-savings-tokens.{lang}.png", bbox_inches="tight", facecolor="white")
    plt.close(fig)

    print(f"wrote {lang} charts")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    data = load()
    make("en", data)
    make("fr", data)


if __name__ == "__main__":
    main()
