package raft

import (
	"bytes"
	"math/rand"
	"mitraft/labgob"
	"mitraft/labrpc"
	"os"
	"strconv"
	"sync"
	"sync/atomic"
	"time"
)

type ApplyMsg struct {
	CommandValid bool
	Command      interface{}
	CommandIndex int
}

// A Go object implementing a single Raft peer.
type Raft struct {
	mu        sync.Mutex          // Lock to protect shared access to this peer's state
	peers     []*labrpc.ClientEnd // RPC end points of all peers
	persister *Persister          // Object to hold this peer's persisted state
	me        int                 // this peer's index into peers[]
	dead      int32               // set by Kill()

	// Initializing struct using Figure 2 of Raft Paper
	currentTerm int
	votedFor    int
	log         []LogEntry
	commitIndex int
	lastApplied int

	nextIndex  []int
	matchIndex []int

	state              string // Follower, Candidate, Leader
	electionResetEvent time.Time

	voteCount int
	applyCh   chan ApplyMsg

	// For Metric writing....
	mw                 *metricsWriter
	startTimes         map[int]int64 // log index -> startMs (leader-side)
	termOfStart        map[int]int   // index -> term at Start
	firstHBSentForTerm map[int]bool  // dedupe FirstHeartbeat per term

}

type LogEntry struct {
	Term    int
	Command interface{}
	Index   int
}

const (
	Follower  = "Follower"
	Candidate = "Candidate"
	Leader    = "Leader"
)

func min(a int, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func (rf *Raft) GetState() (int, bool) {
	rf.mu.Lock()
	defer rf.mu.Unlock()
	return rf.currentTerm, rf.state == Leader
}

func (rf *Raft) persist() {
	// Your code here (2C).
	w := new(bytes.Buffer)    // In-memory buffer to hold raw binary data.
	e := labgob.NewEncoder(w) // This encoder will convert your Go variables (like int, struct, []LogEntry) into a byte stream.

	e.Encode(rf.currentTerm) // CurrentTerm must persist across restarts to avoid granting votes to stale leaders.
	e.Encode(rf.votedFor)    // To remember its votes
	e.Encode(rf.log)         // To maintain consistency

	data := w.Bytes()                // Converts the encoded to data into byte form.
	rf.persister.SaveRaftState(data) // Save the current state to restore it exactly from here after crash and restart.
}

// restore previously persisted state.
func (rf *Raft) readPersist(data []byte) {
	if len(data) < 1 {
		return
	}
	// Your code here (2C).
	r := bytes.NewBuffer(data)
	d := labgob.NewDecoder(r)

	var cTerm int
	var vFor int
	var lg []LogEntry

	if d.Decode(&cTerm) != nil ||
		d.Decode(&vFor) != nil ||
		d.Decode(&lg) != nil {
		return
	}

	rf.currentTerm = cTerm
	rf.votedFor = vFor
	rf.log = lg
}

func (rf *Raft) isLogUpToDate(cLastIndex int, cLastTerm int) bool {
	myLastIndex, myLastTerm := len(rf.log)-1, rf.log[len(rf.log)-1].Term

	if cLastTerm == myLastTerm {
		return cLastIndex >= myLastIndex
	}

	return cLastTerm > myLastTerm
}

// RequestVote RPC arguments structure.
type RequestVoteArgs struct {
	// Figure 2 raft paper
	Term         int
	CandidateId  int
	LastLogIndex int
	LastLogTerm  int
}

// RequestVote RPC reply structure.
type RequestVoteReply struct {
	// Figure 2 raft paper
	Term        int
	VoteGranted bool
}

// RequestVote RPC handler.
func (rf *Raft) RequestVote(args *RequestVoteArgs, reply *RequestVoteReply) {
	rf.mu.Lock()         // Protect shared state
	defer rf.mu.Unlock() // Releases the lock before exiting
	// fmt.Printf("[Node %d] Received RequestVote from %d for term %d (mine: %d)\n", rf.me, args.CandidateId, args.Term, rf.currentTerm)
	if args.Term < rf.currentTerm {
		reply.Term = rf.currentTerm
		reply.VoteGranted = false // vote rejected due to stale term
		return
	}
	if args.Term > rf.currentTerm {
		rf.state = Follower
		rf.currentTerm = args.Term
		rf.votedFor = -1 // Reset vote due to greater term of candidate
		rf.persist()
	}

	reply.Term = rf.currentTerm // reply your current term
	reply.VoteGranted = false

	if (rf.votedFor == -1 || rf.votedFor == args.CandidateId) && (rf.isLogUpToDate(args.LastLogIndex, args.LastLogTerm)) {
		rf.votedFor = args.CandidateId
		reply.VoteGranted = true
		rf.persist()
		// fmt.Printf("[Node %d] voted for %d in term %d\n", rf.me, args.CandidateId, args.Term)
	}

}

func (rf *Raft) sendRequestVote(server int, args *RequestVoteArgs, reply *RequestVoteReply) {
	ok := rf.peers[server].Call("Raft.RequestVote", args, reply)
	if !ok {
		return
	}

	rf.mu.Lock()
	defer rf.mu.Unlock()

	if rf.state != Candidate || args.Term != rf.currentTerm || reply.Term < rf.currentTerm {
		return
	}

	if reply.Term > rf.currentTerm {
		rf.currentTerm = reply.Term
		rf.state = Follower
		rf.votedFor = -1
		rf.persist()
		rf.electionResetEvent = time.Now()
		return
	}

	if reply.VoteGranted {
		rf.voteCount++
		if rf.voteCount > len(rf.peers)/2 {
			rf.state = Leader
			if rf.mw != nil {
				rf.mw.RecordLeaderElected(rf.me, rf.currentTerm)
			}
			rf.persist()

			for i := range rf.peers {
				rf.nextIndex[i] = len(rf.log)
				rf.matchIndex[i] = 0
			}
			rf.electionResetEvent = time.Now()

			go func(term int) {
				for !rf.killed() {
					rf.mu.Lock()
					if rf.state != Leader || rf.currentTerm != term {
						rf.mu.Unlock()
						return
					}
					rf.mu.Unlock()
					rf.broadcastAppendEntries()
					time.Sleep(100 * time.Millisecond)
				}
			}(args.Term)
		}
	}
}

func (rf *Raft) broadcastRequestVote() {
	if rf.state != Candidate {
		return
	}

	args := RequestVoteArgs{
		Term:         rf.currentTerm,
		CandidateId:  rf.me,
		LastLogIndex: len(rf.log) - 1,
		LastLogTerm:  rf.log[len(rf.log)-1].Term,
	}

	for server := range rf.peers {
		if server != rf.me {
			go rf.sendRequestVote(server, &args, &RequestVoteReply{})
		}
	}
}

func (rf *Raft) Start(command interface{}) (int, int, bool) {
	rf.mu.Lock()
	defer rf.mu.Unlock()

	if rf.state != Leader {
		return -1, -1, false
	}

	prevIndex := len(rf.log) - 1
	newEntry := LogEntry{rf.currentTerm, command, prevIndex + 1}
	rf.log = append(rf.log, newEntry)
	rf.persist()
	index := newEntry.Index
	term := newEntry.Term
	if rf.state == Leader && rf.mw != nil {
		start := rf.mw.RecordStart(index, rf.currentTerm, 0.0)
		rf.startTimes[index] = start
		rf.termOfStart[index] = rf.currentTerm
	}
	// fmt.Printf("[%d] new entry during term [%v] having index in log [%d]", rf.me, rf.currentTerm, newEntry.Index)

	// go rf.broadcastAppendEntries()
	return index, term, true
}

type AppendEntriesArgs struct {
	Term         int
	LeaderId     int
	PrevLogIndex int
	PrevLogTerm  int
	Entries      []LogEntry
	LeaderCommit int
}

type AppendEntriesReply struct {
	Term    int
	Success bool
	Index   int
}

func (rf *Raft) AppendEntries(args *AppendEntriesArgs, reply *AppendEntriesReply) {
	rf.mu.Lock()
	defer rf.mu.Unlock()

	// fmt.Printf("[%d %s] received AppendEntries from [%d]", rf.me, rf.state, args.LeaderId)

	if args.Term < rf.currentTerm {
		reply.Success = false
		reply.Term = rf.currentTerm
		return
	}

	rf.electionResetEvent = time.Now()

	if args.Term > rf.currentTerm {
		// fmt.Printf("[%d] stepping down to follower from [%s] for term [%d]", rf.me, rf.state, args.Term)
		rf.currentTerm = args.Term
		rf.state = Follower
		rf.votedFor = -1
		rf.persist()
		rf.voteCount = 0
	}

	lastIndex := len(rf.log) - 1

	// consistency check
	if args.PrevLogIndex > lastIndex {
		reply.Success = false
		reply.Term = rf.currentTerm
		// Ask leader to back off to follower's nextIndex (len(log))
		reply.Index = len(rf.log)
		return
	}

	if rf.log[args.PrevLogIndex].Term != args.PrevLogTerm {
		reply.Success = false
		reply.Term = rf.currentTerm
		conflictTerm := rf.log[args.PrevLogIndex].Term
		i := args.PrevLogIndex
		for i > 0 && rf.log[i-1].Term == conflictTerm {
			i--
		}
		reply.Index = i
		return
	}

	// Append new entries and handle conflicts
	for i := 0; i < len(args.Entries); i++ {
		newEntry := args.Entries[i]

		if newEntry.Index < len(rf.log) {
			if rf.log[newEntry.Index].Term != newEntry.Term {
				rf.log = rf.log[:newEntry.Index]
				rf.log = append(rf.log, newEntry)
				rf.persist()
			}
		} else {
			rf.log = append(rf.log, newEntry)
			rf.persist()
		}
	}

	if len(args.Entries) > 0 {
		lastEntryIndex := args.Entries[len(args.Entries)-1].Index
		if len(rf.log)-1 > lastEntryIndex {
			rf.log = rf.log[:lastEntryIndex+1]
		}
	}

	if args.LeaderCommit > rf.commitIndex {
		rf.commitIndex = min(args.LeaderCommit, len(rf.log)-1)
	}

	reply.Success = true
	reply.Term = rf.currentTerm

	go rf.ApplyLog()
}

func (rf *Raft) sendAppendEntries(server int, args *AppendEntriesArgs, reply *AppendEntriesReply) bool {
	ok := rf.peers[server].Call("Raft.AppendEntries", args, reply)
	if !ok {
		return false
	}

	rf.mu.Lock()
	defer rf.mu.Unlock()

	// Ignore stale results / role changes
	if rf.state != Leader || args.Term != rf.currentTerm {
		return ok
	}

	// Higher term discovered → step down & persist
	if reply.Term > rf.currentTerm {
		rf.currentTerm = reply.Term // <-- use reply.Term (bug fix)
		rf.state = Follower
		rf.votedFor = -1
		rf.voteCount = 0
		rf.persist()
		rf.electionResetEvent = time.Now()
		return ok
	}

	// If follower is behind, adjust indices
	if reply.Success {
		if len(args.Entries) > 0 {
			lastEntry := args.Entries[len(args.Entries)-1]
			// Advance match/next cautiously
			if lastEntry.Index > rf.matchIndex[server] {
				rf.matchIndex[server] = lastEntry.Index
			}
			rf.nextIndex[server] = rf.matchIndex[server] + 1
		}
	} else {
		// Back off using follower's hint if available; always clamp to >=1
		ni := reply.Index
		if ni < 1 {
			ni = max(1, rf.nextIndex[server]-1) // fallback slow backoff
		}
		if ni < 1 {
			ni = 1
		}
		rf.nextIndex[server] = ni
	}

	// Majority commit (only commit entries from current term)
	for commitIdx := len(rf.log) - 1; commitIdx > rf.commitIndex; commitIdx-- {
		count := 1 // self
		for i := range rf.peers {
			if i != rf.me && rf.matchIndex[i] >= commitIdx {
				count++
			}
		}
		if count > len(rf.peers)/2 && rf.log[commitIdx].Term == rf.currentTerm {
			rf.commitIndex = commitIdx
			break
		}
	}

	go rf.ApplyLog()
	return ok
}

func (rf *Raft) broadcastAppendEntries() {
	for peer := range rf.peers {
		if peer == rf.me {
			continue
		}

		// === Snapshot under lock & clamp indices ===
		rf.mu.Lock()

		// If not leader anymore, skip
		if rf.state != Leader {
			rf.mu.Unlock()
			continue
		}

		// Clamp nextIndex to [1, len(log)]
		next := rf.nextIndex[peer]
		if next < 1 {
			next = 1
			rf.nextIndex[peer] = 1
		}
		lastIndex := len(rf.log) - 1
		if next > len(rf.log) { // safety (shouldn't usually happen)
			next = len(rf.log)
		}

		prevLogIndex := next - 1
		if prevLogIndex < 0 {
			prevLogIndex = 0
		}
		prevLogTerm := rf.log[prevLogIndex].Term

		// Slice entries safely (may be empty → heartbeat)
		var entries []LogEntry
		if next <= lastIndex {
			entries = make([]LogEntry, lastIndex-next+1)
			copy(entries, rf.log[next:])
		} else {
			entries = nil
		}

		args := AppendEntriesArgs{
			Term:         rf.currentTerm,
			LeaderId:     rf.me,
			PrevLogIndex: prevLogIndex,
			PrevLogTerm:  prevLogTerm,
			Entries:      entries,
			LeaderCommit: rf.commitIndex,
		}
		rf.mu.Unlock()

		var reply AppendEntriesReply
		go rf.sendAppendEntries(peer, &args, &reply)
	}
}

func (rf *Raft) ApplyLog() {
	rf.mu.Lock()
	defer rf.mu.Unlock()

	for rf.lastApplied < rf.commitIndex {
		rf.lastApplied++
		entry := rf.log[rf.lastApplied]
		if rf.state == Leader && rf.mw != nil {
			if start, ok := rf.startTimes[entry.Index]; ok {
				term := rf.termOfStart[entry.Index]
				go rf.mw.RecordCommit(entry.Index, term, 0.0, start)
				delete(rf.startTimes, entry.Index)
				delete(rf.termOfStart, entry.Index)
			}
		}

		msg := ApplyMsg{
			CommandValid: true,
			Command:      entry.Command,
			CommandIndex: entry.Index,
		}

		rf.applyCh <- msg
	}
}

func (rf *Raft) Kill() {
	atomic.StoreInt32(&rf.dead, 1)
	// mark crash time if this server is the leader at kill time
	if rf.mw != nil {
		rf.mu.Lock()
		isLeader := (rf.state == Leader)
		rf.mu.Unlock()
		if isLeader {
			go rf.mw.RecordLeaderCrash(rf.me)
		}
	}
}

func (rf *Raft) killed() bool {
	z := atomic.LoadInt32(&rf.dead)
	return z == 1
}

func (rf *Raft) ticker() {
	for !rf.killed() {
		// Randomized election timeout between 250-500ms
		timeout := time.Duration(250+rand.Intn(250)) * time.Millisecond

		rf.mu.Lock()
		state := rf.state
		elapsed := time.Since(rf.electionResetEvent)
		rf.mu.Unlock()

		if state != Leader && elapsed >= timeout {
			if rf.mw != nil {
				// outside the lock is fine too; this call is cheap & mutexed internally
				go rf.mw.RecordElectionStart()
			}
			go rf.startElection()
		}

		if state == Leader {
			rf.broadcastAppendEntries()
			if rf.mw != nil && !rf.firstHBSentForTerm[rf.currentTerm] {
				rf.firstHBSentForTerm[rf.currentTerm] = true
				go rf.mw.RecordFirstHeartbeat(rf.me)
			}
		}

		time.Sleep(100 * time.Millisecond)
	}
}

func (rf *Raft) startElection() {
	rf.mu.Lock()

	rf.state = Candidate
	rf.currentTerm++
	rf.votedFor = rf.me
	rf.voteCount = 1 // vote for self
	rf.electionResetEvent = time.Now()

	rf.mu.Unlock()

	rf.broadcastRequestVote()

	go func(term int) {
		time.Sleep(1500 * time.Millisecond)
		rf.mu.Lock()
		defer rf.mu.Unlock()
		if rf.state != Leader && rf.currentTerm == term {
			// fmt.Printf("[Node %d] still not a leader in term %d\n", rf.me, term)
		}
	}(rf.currentTerm)
}

func Make(peers []*labrpc.ClientEnd, me int,
	persister *Persister, applyCh chan ApplyMsg) *Raft {

	rf := &Raft{}
	rf.peers = peers
	rf.persister = persister
	rf.me = me

	rf.currentTerm = 0
	rf.votedFor = -1

	rf.log = []LogEntry{{Term: 0}}

	rf.commitIndex = 0
	rf.lastApplied = 0

	rf.nextIndex = make([]int, len(peers))
	rf.matchIndex = make([]int, len(peers))

	rf.state = Follower
	rf.applyCh = applyCh
	rf.electionResetEvent = time.Now()

	rf.mw = nil
	rf.startTimes = make(map[int]int64)
	rf.termOfStart = make(map[int]int)
	rf.firstHBSentForTerm = make(map[int]bool)

	// OPTIONAL: create the writer (you can guard with an env var or a flag)
	mw, err := newMetrics("./metrics",
		getEnvStr("RAFT_SCENARIO", "leader_crash_restart"),
		getEnvInt("RAFT_SEED", 0),
		getEnvInt("RAFT_TRIAL", 1),
		600, 1000,
	)
	if err == nil {
		rf.mw = mw
	}

	rf.readPersist(persister.ReadRaftState())

	go rf.ticker()

	return rf
}

func getEnvStr(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
func getEnvInt(k string, def int) int {
	if v := os.Getenv(k); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}
