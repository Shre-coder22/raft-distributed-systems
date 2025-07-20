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

	applyCh      chan ApplyMsg
	logBaseIndex int
}

type LogEntry struct {
	Term    int
	Command interface{}
}

const (
	Follower  = "Follower"
	Candidate = "Candidate"
	Leader    = "Leader"
)

func min(a, b int) int {
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

	if rf.votedFor == -1 || rf.votedFor == args.CandidateId {
		rf.votedFor = args.CandidateId
		reply.VoteGranted = true
		// fmt.Printf("[Node %d] voted for %d in term %d\n", rf.me, args.CandidateId, args.Term)
	}

}

func (rf *Raft) sendRequestVote(server int, args *RequestVoteArgs, reply *RequestVoteReply) bool {
	ok := rf.peers[server].Call("Raft.RequestVote", args, reply)
	return ok
}

func (rf *Raft) Start(command interface{}) (int, int, bool) {
	rf.mu.Lock()
	defer rf.mu.Unlock()

	if rf.state != Leader {
		return -1, rf.currentTerm, false
	}

	term := rf.currentTerm
	newEntry := LogEntry{Command: command, Term: term}
	rf.log = append(rf.log, newEntry)
	index := rf.logBaseIndex + len(rf.log) - 1

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
	Term          int
	Success       bool
	ConflictIndex int
	ConflictTerm  int
}

func (rf *Raft) ApplyLog() {
	rf.mu.Lock()
	defer rf.mu.Unlock()

	for rf.commitIndex > rf.lastApplied {
		rf.lastApplied++
		entry := rf.log[rf.lastApplied-rf.logBaseIndex]
		applyMsg := ApplyMsg{
			CommandValid: true,
			Command:      entry.Command,
			CommandIndex: rf.lastApplied,
		}
		rf.mu.Unlock()
		rf.applyCh <- applyMsg
		rf.mu.Lock()
	}
}

func (rf *Raft) AppendEntries(args *AppendEntriesArgs, reply *AppendEntriesReply) {
	rf.mu.Lock()
	defer rf.mu.Unlock()

	reply.Term = rf.currentTerm
	reply.Success = false
	reply.ConflictTerm = -1
	reply.ConflictIndex = -1

	if args.Term < rf.currentTerm {
		return
	}

	if args.Term > rf.currentTerm {
		rf.currentTerm = args.Term
		rf.state = Follower
		rf.votedFor = -1
	}
	rf.electionResetEvent = time.Now()

	prevLogIndex := args.PrevLogIndex
	if prevLogIndex < rf.logBaseIndex {
		reply.ConflictIndex = rf.logBaseIndex
		return
	}
	if prevLogIndex >= rf.logBaseIndex+len(rf.log) {
		reply.ConflictIndex = rf.logBaseIndex + len(rf.log)
		return
	}
	if rf.log[prevLogIndex-rf.logBaseIndex].Term != args.PrevLogTerm {
		reply.ConflictTerm = rf.log[prevLogIndex-rf.logBaseIndex].Term
		// Find first index with this term
		for i := prevLogIndex - 1; i >= rf.logBaseIndex; i-- {
			if rf.log[i-rf.logBaseIndex].Term != reply.ConflictTerm {
				reply.ConflictIndex = i + 1
				break
			}
		}
		if reply.ConflictIndex == -1 {
			reply.ConflictIndex = rf.logBaseIndex
		}
		return
	}

	// Append new entries
	for i, entry := range args.Entries {
		index := args.PrevLogIndex + 1 + i
		if index < rf.logBaseIndex+len(rf.log) {
			if rf.log[index-rf.logBaseIndex].Term != entry.Term {
				rf.log = rf.log[:index-rf.logBaseIndex]
				rf.log = append(rf.log, args.Entries[i:]...)
				break
			}
		} else {
			rf.log = append(rf.log, args.Entries[i:]...)
			break
		}
	}

	if args.LeaderCommit > rf.commitIndex {
		rf.commitIndex = min(args.LeaderCommit, rf.logBaseIndex+len(rf.log)-1)
		go rf.ApplyLog()
	}

	reply.Success = true
}

func (rf *Raft) sendAppendEntries(server int, args *AppendEntriesArgs, reply *AppendEntriesReply) bool {
	ok := rf.peers[server].Call("Raft.AppendEntries", args, reply)
	if !ok {
		return false
	}

	rf.mu.Lock()
	defer rf.mu.Unlock()

	if args.Term != rf.currentTerm || rf.state != Leader {
		return false
	}

	if reply.Term > rf.currentTerm {
		rf.currentTerm = reply.Term
		rf.state = Follower
		rf.votedFor = -1
		rf.electionResetEvent = time.Now()
		return false
	}

	if reply.Success {
		newMatch := args.PrevLogIndex + len(args.Entries)
		rf.matchIndex[server] = newMatch
		rf.nextIndex[server] = newMatch + 1

		for N := rf.commitIndex + 1; N < rf.logBaseIndex+len(rf.log); N++ {
			count := 1 // count self
			for i := range rf.peers {
				if i != rf.me && rf.matchIndex[i] >= N {
					count++
				}
			}
			if count > len(rf.peers)/2 && rf.log[N-rf.logBaseIndex].Term == rf.currentTerm {
				rf.commitIndex = N
				go rf.ApplyLog()
			}
		}
	} else {
		if reply.ConflictTerm != -1 {
			found := false
			for i := len(rf.log) - 1; i >= 0; i-- {
				if rf.log[i].Term == reply.ConflictTerm {
					rf.nextIndex[server] = rf.logBaseIndex + i
					found = true
					break
				}
			}
			if !found {
				rf.nextIndex[server] = reply.ConflictIndex
			}
		} else {
			rf.nextIndex[server] = reply.ConflictIndex
		}
	}
	return true
}

func (rf *Raft) broadcastAppendEntries() {
	rf.mu.Lock()
	term := rf.currentTerm
	rf.mu.Unlock()

	for peer := range rf.peers {
		if peer == rf.me {
			continue
		}
		go func(peer int) {
			rf.mu.Lock()
			if rf.state != Leader {
				rf.mu.Unlock()
				return
			}
			prevLogIndex := rf.nextIndex[peer] - 1
			prevLogTerm := rf.log[prevLogIndex-rf.logBaseIndex].Term
			entries := append([]LogEntry{}, rf.log[rf.nextIndex[peer]-rf.logBaseIndex:]...)
			args := AppendEntriesArgs{
				Term:         term,
				LeaderId:     rf.me,
				PrevLogIndex: prevLogIndex,
				PrevLogTerm:  prevLogTerm,
				Entries:      entries,
				LeaderCommit: rf.commitIndex,
			}
			rf.mu.Unlock()

			var reply AppendEntriesReply
			rf.sendAppendEntries(peer, &args, &reply)
		}(peer)
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
			go rf.broadcastAppendEntries()
		}

		time.Sleep(100 * time.Millisecond)
	}
}

func (rf *Raft) startElection() {
	rf.mu.Lock()

	rf.state = Candidate
	rf.currentTerm++
	rf.votedFor = rf.me
	rf.electionResetEvent = time.Now()
	termAtStart := rf.currentTerm
	votesReceived := 1
	lastLogIndex := rf.logBaseIndex + len(rf.log) - 1
	lastLogTerm := rf.log[len(rf.log)-1].Term

	rf.mu.Unlock()

	for peer := range rf.peers {
		if peer == rf.me {
			continue
		}
		go func(peer int) {
			args := RequestVoteArgs{
				Term:         termAtStart,
				CandidateId:  rf.me,
				LastLogIndex: lastLogIndex,
				LastLogTerm:  lastLogTerm,
			}
			var reply RequestVoteReply
			if rf.sendRequestVote(peer, &args, &reply) {
				rf.mu.Lock()
				defer rf.mu.Unlock()
				if rf.state != Candidate || rf.currentTerm != termAtStart {
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
					votesReceived++
					if votesReceived > len(rf.peers)/2 {
						rf.state = Leader
						for i := range rf.peers {
							rf.nextIndex[i] = rf.logBaseIndex + len(rf.log)
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
						}(termAtStart)
					}
				}
			}
		}(peer)
	}

	go func() {
		time.Sleep(1500 * time.Millisecond)
		rf.mu.Lock()
		defer rf.mu.Unlock()
		if rf.state != Leader && rf.currentTerm == termAtStart {
			// fmt.Printf("[Node %d] still not a leader after election in term %d\n", rf.me, termAtStart)
		}
	}()
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
	rf.logBaseIndex = 0

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
