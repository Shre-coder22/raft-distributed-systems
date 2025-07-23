package raft

import (
	"math/rand"
	"mitraft/labrpc"
	"sync"
	"sync/atomic"
	"time"
)

// import "bytes"
// import "mitraft/labgob"

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

func (rf *Raft) GetState() (int, bool) {
	rf.mu.Lock()
	defer rf.mu.Unlock()
	return rf.currentTerm, rf.state == Leader
}

func (rf *Raft) persist() {
	// Your code here (2C).
}

// restore previously persisted state.
func (rf *Raft) readPersist(data []byte) {
	if len(data) < 1 { //data == nil ||
		return
	}
	// Your code here (2C).
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
	}

	reply.Term = rf.currentTerm // reply your current term
	reply.VoteGranted = false

	if (rf.votedFor == -1 || rf.votedFor == args.CandidateId) && (rf.isLogUpToDate(args.LastLogIndex, args.LastLogTerm)) {
		rf.votedFor = args.CandidateId
		reply.VoteGranted = true
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
		rf.electionResetEvent = time.Now()
		return
	}

	if reply.VoteGranted {
		rf.voteCount++
		if rf.voteCount > len(rf.peers)/2 {
			rf.state = Leader

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
	index := newEntry.Index
	term := newEntry.Term
	// fmt.Printf("[%d] new entry during term [%v] having index in log [%d]", rf.me, rf.currentTerm, newEntry.Index)

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
		rf.voteCount = 0
	}

	lastIndex := len(rf.log) - 1

	// consistency check
	if args.PrevLogIndex > lastIndex || rf.log[args.PrevLogIndex].Term != args.PrevLogTerm {
		reply.Success = false
		reply.Term = rf.currentTerm
		reply.Index = min(args.PrevLogIndex, len(rf.log)-1)
		return
	}

	// Append new entries and handle conflicts
	for i := 0; i < len(args.Entries); i++ {
		newEntry := args.Entries[i]

		if newEntry.Index < len(rf.log) {
			if rf.log[newEntry.Index].Term != newEntry.Term {
				rf.log = rf.log[:newEntry.Index]
				rf.log = append(rf.log, newEntry)
			}
		} else {
			rf.log = append(rf.log, newEntry)
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

	if rf.state != Leader || args.Term != rf.currentTerm || reply.Term < rf.currentTerm {
		return ok
	}

	if reply.Term > rf.currentTerm {
		rf.currentTerm = args.Term
		rf.state = Follower
		rf.votedFor = -1
		rf.voteCount = 0
		rf.electionResetEvent = time.Now()
		return ok
	}

	if reply.Success {
		if len(args.Entries) > 0 {
			lastEntry := args.Entries[len(args.Entries)-1]
			rf.nextIndex[server] = lastEntry.Index + 1
			rf.matchIndex[server] = lastEntry.Index
		}
	} else {
		rf.nextIndex[server] = reply.Index
	}

	// Majority commit calculation
	cnt := map[int]int{}
	for _, idx := range rf.matchIndex {
		cnt[idx]++
	}

	for commitIdx := len(rf.log) - 1; commitIdx > rf.commitIndex; commitIdx-- {
		count := 1 // self vote
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

		prevLogIndex := rf.nextIndex[peer] - 1
		prevLogTerm := rf.log[prevLogIndex].Term

		entries := make([]LogEntry, len(rf.log[rf.nextIndex[peer]:]))
		copy(entries, rf.log[rf.nextIndex[peer]:])

		args := AppendEntriesArgs{
			Term:         rf.currentTerm,
			LeaderId:     rf.me,
			PrevLogIndex: prevLogIndex,
			PrevLogTerm:  prevLogTerm,
			Entries:      entries,
			LeaderCommit: rf.commitIndex,
		}

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
	// Your code here, if desired.
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
			go rf.startElection()
		}

		if state == Leader {
			rf.broadcastAppendEntries()
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

	rf.readPersist(persister.ReadRaftState())

	go rf.ticker()

	return rf
}
