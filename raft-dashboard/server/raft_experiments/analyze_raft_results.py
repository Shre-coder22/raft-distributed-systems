import argparse
import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

def clean_failover(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df
    # 1) drop pure startup rows (no crash/election timestamps)
    df = df[~(
        (df["crash_time_ms"] == 0) &
        (df["election_start_ms"] == 0) &
        (df["leader_elected_ms"] == 0)
    )]
    # 2) drop obvious artifacts/outliers (0.5s .. 120s window)
    df = df[df["failover_ms"].between(500, 120_000)]
    return df

def summarize(df, value_col, group_cols, name):
    if df.empty:
        print(f"[WARN] No data for {name}. Skipping.")
        return None
    g = df.groupby(group_cols)[value_col]
    summary = g.agg([("count","count"),("median", "median"),("p90", lambda s: np.percentile(s,90)),("p95", lambda s: np.percentile(s,95))]).reset_index()
    print(f"\n== {name} summary ==")
    print(summary.to_string(index=False))
    return summary

def plot_cdf(df, value_col, label_col, out_path, title, unit=""):
    if df.empty:
        print(f"[WARN] No data to plot: {title}")
        return
    plt.figure()
    ann = []
    for label, sub in df.groupby(label_col):
        vals = np.sort(sub[value_col].values)
        if len(vals) == 0:
            continue
        ys = np.arange(1, len(vals)+1) / len(vals)
        plt.plot(vals, ys, label=str(label))
        med = np.median(vals); p95 = np.percentile(vals, 95)
        ann.append(f"{label}: n={len(vals)}, med={med:.2f}{unit}, p95={p95:.2f}{unit}")
    plt.xlabel(f"{value_col}{(' ('+unit+')') if unit else ''}")
    plt.ylabel("CDF")
    if ann:
        plt.title(f"{title}  |  " + "  •  ".join(ann))
    else:
        plt.title(title)
    plt.legend()
    plt.tight_layout()
    plt.savefig(out_path, dpi=160)
    plt.close()
    print(f"[OK] Saved {out_path}")

def plot_latency_vs_drop(summary_df, drop_col, median_col, p95_col, out_path, title):
    if summary_df is None or summary_df.empty:
        print(f"[WARN] No summary to plot: {title}")
        return
    plt.figure()
    x = summary_df[drop_col].values
    plt.plot(x, summary_df[median_col].values, marker='o', label="median")
    plt.plot(x, summary_df[p95_col].values, marker='o', label="p95")
    plt.xlabel(drop_col)
    plt.ylabel("latency_ms")
    plt.title(title)
    plt.legend()
    plt.tight_layout()
    plt.savefig(out_path, dpi=160)
    plt.close()
    print(f"[OK] Saved {out_path}")

def boxplot_tenure(df, out_path, title):
    if df.empty:
        print(f"[WARN] No data to plot: {title}")
        return
    plt.figure()
    data = [g["tenure_ms"].values for _, g in df.groupby("scenario")]
    labels = [str(k) for k,_ in df.groupby("scenario")]
    plt.boxplot(data, labels=labels, showfliers=False)
    plt.ylabel("tenure_ms")
    plt.title(title)
    plt.tight_layout()
    plt.savefig(out_path, dpi=160)
    plt.close()
    print(f"[OK] Saved {out_path}")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)

    failover_raw = pd.read_csv(os.path.join(args.input, "failover_trials.csv"))
    repl = pd.read_csv(os.path.join(args.input, "replication_latency.csv"))
    tenure = pd.read_csv(os.path.join(args.input, "leader_tenure.csv"))

    failover = clean_failover(failover_raw)

    fsum = summarize(failover, "failover_ms", ["scenario"], "Failover (seconds)")
    rsum = summarize(repl, "latency_ms", ["scenario","drop_rate"], "ReplicationLatency")
    tsum = summarize(tenure, "tenure_ms", ["scenario"], "LeaderTenure")

    plot_cdf(
        failover,
        "failover_ms", "scenario",
        os.path.join(args.out, "failover_cdf.png"),
        "Leader Failover Time CDF",
        unit="s"
    )
    if rsum is not None and not rsum.empty:
        plot_latency_vs_drop(
            rsum, "drop_rate", "median", "p95",
            os.path.join(args.out, "replication_latency_vs_drop.png"),
            "Replication Latency vs Drop Rate"
        )
    boxplot_tenure(
        tenure,
        os.path.join(args.out, "leader_tenure_box.png"),
        "Leader Tenure by Scenario"
    )

if __name__ == "__main__":
    main()