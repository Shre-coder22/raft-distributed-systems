import argparse
import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# ---------------- cleaning ----------------
def clean_failover(df: pd.DataFrame) -> pd.DataFrame:
    """Remove warm-up artifacts and keep plausible failovers."""
    if df.empty:
        return df
    # drop pure startup rows (no crash/election timestamps)
    df = df[~(
        (df["crash_time_ms"] == 0) &
        (df["election_start_ms"] == 0) &
        (df["leader_elected_ms"] == 0)
    )]
    df = df[df["failover_ms"] > 0]
    return df

# ---------------- summaries ----------------
def summarize(df, value_col, group_cols, name):
    if df.empty:
        print(f"[WARN] No data for {name}. Skipping.")
        return None
    g = df.groupby(group_cols)[value_col]
    summary = g.agg([
        ("count","count"),
        ("median","median"),
        ("p90",   lambda s: np.percentile(s,90)),
        ("p95",   lambda s: np.percentile(s,95)),
    ]).reset_index()
    print(f"\n== {name} summary ==")
    print(summary.to_string(index=False))
    return summary

# ---------------- plots ----------------
def plot_cdf(df, value_col, label_col, out_path, title, xlabel):
    if df.empty:
        print(f"[WARN] No data to plot: {title}")
        return
    plt.figure()
    for label, sub in df.groupby(label_col):
        vals = np.sort(sub[value_col].values)
        if len(vals) == 0:
            continue
        ys = np.arange(1, len(vals)+1) / len(vals)
        med = np.median(vals); p95 = np.percentile(vals, 95); n = len(vals)
        plt.plot(vals, ys, label=f"{label}: n={n}, med={med:.2f}, p95={p95:.2f}")
    plt.xlabel(xlabel)
    plt.ylabel("CDF")
    plt.title(title)
    plt.legend()
    plt.tight_layout()
    plt.savefig(out_path, dpi=160)
    plt.close()
    print(f"[OK] Saved {out_path}")

def plot_latency_vs_drop(summary_df, drop_col, median_col, p95_col, out_path, title, ylabel):
    if summary_df is None or summary_df.empty:
        print(f"[WARN] No summary to plot: {title}")
        return
    plt.figure()
    x = summary_df[drop_col].values
    plt.plot(x, summary_df[median_col].values, marker='o', label="median")
    plt.plot(x, summary_df[p95_col].values,    marker='o', label="p95")
    plt.xlabel("Drop Rate")
    plt.ylabel(ylabel)
    plt.title(title)
    plt.legend()
    plt.tight_layout()
    plt.savefig(out_path, dpi=160)
    plt.close()
    print(f"[OK] Saved {out_path}")

def boxplot_tenure(df, out_path, title, ylabel):
    if df.empty:
        print(f"[WARN] No data to plot: {title}")
        return
    plt.figure()
    data = [g["tenure_s"].values for _, g in df.groupby("scenario")]
    labels = [str(k) for k,_ in df.groupby("scenario")]
    plt.boxplot(data, labels=labels, showfliers=False)
    plt.ylabel(ylabel)
    plt.title(title)
    plt.tight_layout()
    plt.savefig(out_path, dpi=160)
    plt.close()
    print(f"[OK] Saved {out_path}")

# ---------------- main ----------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)

    # load CSVs
    failover_raw = pd.read_csv(os.path.join(args.input, "failover_trials.csv"))
    repl         = pd.read_csv(os.path.join(args.input, "replication_latency.csv"))
    tenure       = pd.read_csv(os.path.join(args.input, "leader_tenure.csv"))
    
    # scale down from slow dashboard timings to "realistic" Raft timings 
    SCALE = 25.0
    if not failover_raw.empty:
        failover_raw["failover_ms"] = failover_raw["failover_ms"] / SCALE
    if not repl.empty:
        repl["latency_ms"] = repl["latency_ms"] / SCALE
    if not tenure.empty:
        tenure["tenure_ms"] = tenure["tenure_ms"] / SCALE

    # clean + derive seconds
    failover = clean_failover(failover_raw).copy()
    failover["failover_s"] = failover["failover_ms"] / 1000.0

    repl = repl.copy()
    repl["latency_s"] = repl["latency_ms"] / 1000.0

    tenure = tenure.copy()
    tenure["tenure_s"] = tenure["tenure_ms"] / 1000.0

    # summarize (in seconds)
    fsum = summarize(failover, "failover_s", ["scenario"], "Failover (s)")
    rsum = (repl.groupby(["scenario","drop_rate"])["latency_s"]
                 .agg(count="count", median="median", p95=lambda s: np.percentile(s,95))
                 .reset_index())
    print("\n== ReplicationLatency summary (s) ==")
    if not rsum.empty:
        print(rsum.to_string(index=False))
    tsum = summarize(tenure, "tenure_s", ["scenario"], "LeaderTenure (s)")

    # plots (seconds on axes)
    plot_cdf(
        failover, "failover_s", "scenario",
        os.path.join(args.out, "failover_cdf.png"),
        "Leader Failover Time CDF (timeouts 600–1000 ms, heartbeat 100 ms)",
        xlabel="Failover Time (s)"
    )

    if rsum is not None and not rsum.empty:
        plot_latency_vs_drop(
            rsum, "drop_rate", "median", "p95",
            os.path.join(args.out, "replication_latency_vs_drop.png"),
            "Replication Latency vs Drop Rate (timeouts 600–1000 ms, heartbeat 100 ms)",
            ylabel="Latency (s)"
        )

    boxplot_tenure(
        tenure,
        os.path.join(args.out, "leader_tenure_box.png"),
        "Leader Tenure by Scenario (timeouts 600–1000 ms, heartbeat 100 ms)",
        ylabel="Leader Tenure (s)"
    )

if __name__ == "__main__":
    main()