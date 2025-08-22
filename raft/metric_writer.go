package raft

import (
	"encoding/csv"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"sync"
	"time"
)

// ---- MetricsWriter: writes 3 CSVs in ./metrics (same repo root) ----

type metricsWriter struct {
	mu sync.Mutex

	// files + csv writers
	dir          string
	failoverFile *os.File
	failoverCSV  *csv.Writer
	replFile     *os.File
	replCSV      *csv.Writer
	tenureFile   *os.File
	tenureCSV    *csv.Writer

	// experiment tags
	scenario                string
	seed, trial             int
	timeoutLow, timeoutHigh int

	// monotonic origin
	t0 time.Time

	// per-election state
	lastLeaderID   int
	lastLeaderFrom int64 // ms since t0

	// crash→election timeline (optional if you trigger crash from outside)
	crashTimeMs  int64
	electStartMs int64
	electedMs    int64
	firstHbMs    int64
}

func nowMs(from time.Time) int64 { return time.Since(from).Milliseconds() }

func ensureCSV(path string, header []string) (*os.File, *csv.Writer, error) {
	new := false
	if _, err := os.Stat(path); os.IsNotExist(err) {
		new = true
	}
	f, err := os.OpenFile(path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return nil, nil, err
	}
	w := csv.NewWriter(f)
	if new {
		_ = w.Write(header)
		w.Flush()
	}
	return f, w, nil
}

func newMetrics(dir, scenario string, seed, trial, toutLow, toutHigh int) (*metricsWriter, error) {
	if dir == "" {
		dir = "./metrics"
	}
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, err
	}

	failoverFile, failoverCSV, err := ensureCSV(
		filepath.Join(dir, "failover_trials.csv"),
		[]string{"scenario", "timeout_low_ms", "timeout_high_ms", "seed", "trial", "old_leader", "new_leader", "crash_time_ms", "election_start_ms", "leader_elected_ms", "first_heartbeat_ms", "failover_ms"},
	)
	if err != nil {
		return nil, err
	}

	replFile, replCSV, err := ensureCSV(
		filepath.Join(dir, "replication_latency.csv"),
		[]string{"scenario", "drop_rate", "seed", "trial", "entry_id", "leader_term", "start_ts_ms", "commit_ts_ms", "latency_ms"},
	)
	if err != nil {
		return nil, err
	}

	tenureFile, tenureCSV, err := ensureCSV(
		filepath.Join(dir, "leader_tenure.csv"),
		[]string{"scenario", "seed", "trial", "leader_id", "term", "start_ts_ms", "end_ts_ms", "tenure_ms"},
	)
	if err != nil {
		return nil, err
	}

	return &metricsWriter{
		dir:          dir,
		failoverFile: failoverFile, failoverCSV: failoverCSV,
		replFile: replFile, replCSV: replCSV,
		tenureFile: tenureFile, tenureCSV: tenureCSV,
		scenario: scenario, seed: seed, trial: trial,
		timeoutLow: toutLow, timeoutHigh: toutHigh,
		t0:           time.Now(),
		lastLeaderID: -1, lastLeaderFrom: -1,
	}, nil
}

func (m *metricsWriter) Close() {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.failoverCSV != nil {
		m.failoverCSV.Flush()
	}
	if m.replCSV != nil {
		m.replCSV.Flush()
	}
	if m.tenureCSV != nil {
		m.tenureCSV.Flush()
	}
	if m.failoverFile != nil {
		_ = m.failoverFile.Close()
	}
	if m.replFile != nil {
		_ = m.replFile.Close()
	}
	if m.tenureFile != nil {
		_ = m.tenureFile.Close()
	}
}

// ---- Failover timeline (optional crash hooks) ----

func (m *metricsWriter) RecordLeaderCrash(oldLeader int) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.crashTimeMs = nowMs(m.t0)
}

func (m *metricsWriter) RecordElectionStart() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.electStartMs = nowMs(m.t0)
}

func (m *metricsWriter) RecordLeaderElected(newLeader, term int) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.electedMs = nowMs(m.t0)

	// close previous leader tenure, if any
	if m.lastLeaderFrom >= 0 && m.lastLeaderID >= 0 {
		end := m.electedMs
		_ = m.tenureCSV.Write([]string{
			m.scenario,
			strconv.Itoa(m.seed), strconv.Itoa(m.trial),
			strconv.Itoa(m.lastLeaderID), strconv.Itoa(term - 1),
			strconv.FormatInt(m.lastLeaderFrom, 10), strconv.FormatInt(end, 10),
			strconv.FormatInt(end-m.lastLeaderFrom, 10),
		})
		m.tenureCSV.Flush()
	}
	m.lastLeaderID = newLeader
	m.lastLeaderFrom = m.electedMs
}

func (m *metricsWriter) RecordFirstHeartbeat(newLeader int) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.firstHbMs = nowMs(m.t0)
	if m.crashTimeMs == 0 { // if no explicit crash recorded, still emit row with failover from election→HB
		m.crashTimeMs = m.electedMs // fallback
	}
	failoverMs := m.firstHbMs - m.crashTimeMs
	_ = m.failoverCSV.Write([]string{
		m.scenario,
		strconv.Itoa(m.timeoutLow), strconv.Itoa(m.timeoutHigh),
		strconv.Itoa(m.seed), strconv.Itoa(m.trial),
		"-1", strconv.Itoa(newLeader),
		strconv.FormatInt(m.crashTimeMs, 10),
		strconv.FormatInt(m.electStartMs, 10),
		strconv.FormatInt(m.electedMs, 10),
		strconv.FormatInt(m.firstHbMs, 10),
		strconv.FormatInt(failoverMs, 10),
	})
	m.failoverCSV.Flush()
}

// ---- Replication latency ----

func (m *metricsWriter) RecordStart(index int, leaderTerm int, dropRate float64) int64 {
	m.mu.Lock()
	defer m.mu.Unlock()
	return nowMs(m.t0)
}

func (m *metricsWriter) RecordCommit(index int, leaderTerm int, dropRate float64, startMs int64) {
	m.mu.Lock()
	defer m.mu.Unlock()
	commit := nowMs(m.t0)
	_ = m.replCSV.Write([]string{
		m.scenario,
		fmt.Sprintf("%.2f", dropRate),
		strconv.Itoa(m.seed), strconv.Itoa(m.trial),
		strconv.Itoa(index), strconv.Itoa(leaderTerm),
		strconv.FormatInt(startMs, 10), strconv.FormatInt(commit, 10),
		strconv.FormatInt(commit-startMs, 10),
	})
	m.replCSV.Flush()
}
