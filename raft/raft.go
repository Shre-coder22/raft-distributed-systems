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

	applyCh chan ApplyMsg
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

// return currentTerm and whether this server
// believes it is the leader.
func (rf *Raft) GetState() (int, bool) {
	rf.mu.Lock()
	defer rf.mu.Unlock()
	return rf.currentTerm, rf.state == Leader
}

// save Raft's persistent state to stable storage,
// where it can later be retrieved after a crash and restart.
// see paper's Figure 2 for a description of what should be persistent.
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
	Term        int
	CandidateId int
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
	index := -1
	term := -1
	isLeader := true
	// Your code here (2B).
	return index, term, isLeader
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
}

func (rf *Raft) AppendEntries(args *AppendEntriesArgs, reply *AppendEntriesReply) {
	rf.mu.Lock()
	defer rf.mu.Unlock()
	defer rf.persist()

	if args.Term < rf.currentTerm {
		reply.Term = rf.currentTerm
		reply.Success = false
		return
	}

	if args.Term > rf.currentTerm {
		rf.currentTerm = args.Term
		rf.state = Follower
		rf.votedFor = -1
	}

	rf.electionResetEvent = time.Now()

	if args.PrevLogIndex >= len(rf.log) {
		reply.ConflictIndex = len(rf.log)
		reply.Success = false
		reply.Term = rf.currentTerm
		return
	} else if args.PrevLogTerm != rf.log[args.PrevLogIndex].Term {
		conflictTerm := rf.log[args.PrevLogIndex].Term
		ci := args.PrevLogIndex

		for ci >= 0 && rf.log[ci].Term == conflictTerm {
			ci--
		}
		reply.ConflictIndex = ci + 1
		reply.Success = false
		reply.Term = rf.currentTerm
		return
	}

	followerIndex := args.PrevLogIndex + 1

	for i := 0; i < len(args.Entries); i++ {
		fi := followerIndex + i

		if fi < len(rf.log) {
			if rf.log[fi].Term != args.Entries[i].Term {
				rf.log = rf.log[:fi]
				rf.log = append(rf.log, args.Entries[i:]...)
				break
			}
		} else {
			rf.log = append(rf.log, args.Entries[i:]...)
			break
		}
	}

	if args.LeaderCommit > rf.commitIndex {
		rf.commitIndex = min(args.LeaderCommit, len(rf.log)-1)
	}

	reply.Success = true
	reply.Term = rf.currentTerm
}

func (rf *Raft) sendAppendEntries(server int, args *AppendEntriesArgs, reply *AppendEntriesReply) bool {
	ok := rf.peers[server].Call("Raft.AppendEntries", args, reply)
	rf.mu.Lock()
	defer rf.mu.Unlock()

	if reply.Success {
		rf.matchIndex[server] = len(args.Entries) + args.PrevLogIndex
		rf.nextIndex[server] = rf.matchIndex[server] + 1

		for N := len(rf.log) - 1; N > rf.commitIndex; N-- {
			count := 0
			for i := 0; i < len(rf.matchIndex); i++ {
				if rf.matchIndex[i] >= N {
					count++
				}
			}
			if count > len(rf.peers)/2 && rf.log[N].Term == rf.currentTerm {
				rf.commitIndex = N
				break
			}
		}

	} else {
		if reply.Term > rf.currentTerm {
			rf.currentTerm = reply.Term
			rf.state = Follower
			rf.votedFor = -1
			rf.persist()
			return ok
		} else {
			rf.nextIndex[server] = reply.ConflictIndex
		}
	}

	return ok
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

		// If we're a follower or candidate and timeout expires, start an election
		if state != Leader && elapsed >= timeout {
			go rf.startElection()
		}

		time.Sleep(10 * time.Millisecond)
	}
}

func (rf *Raft) startElection() {
	rf.mu.Lock()

	// fmt.Printf("[Node %d] starting election: term=%d, votedFor=%d\n", rf.me, rf.currentTerm, rf.votedFor)
	rf.state = Candidate
	rf.currentTerm++
	rf.votedFor = rf.me
	rf.electionResetEvent = time.Now()
	termAtStart := rf.currentTerm
	votesReceived := 1

	rf.mu.Unlock()
	// fmt.Printf("[Node %d] Starting election for term %d\n", rf.me, termAtStart)

	for peer := range rf.peers {
		if peer == rf.me {
			continue
		}
		args := RequestVoteArgs{
			Term:        termAtStart,
			CandidateId: rf.me,
		}
		go func(peer int, args RequestVoteArgs) {
			var reply RequestVoteReply
			if rf.sendRequestVote(peer, &args, &reply) {
				rf.mu.Lock()
				defer rf.mu.Unlock()
				if reply.Term > rf.currentTerm {
					// Step down
					rf.currentTerm = reply.Term
					rf.state = Follower
					rf.votedFor = -1
					rf.electionResetEvent = time.Now()
					return
				}
				if rf.state == Candidate && rf.currentTerm == termAtStart && reply.VoteGranted {
					votesReceived++
					// fmt.Printf("[Node %d] got vote from %d for term %d (votes: %d)\n", rf.me, peer, rf.currentTerm, votesReceived)
					if votesReceived > len(rf.peers)/2 {
						// Becomes leader
						rf.state = Leader
						rf.electionResetEvent = time.Now()
						// fmt.Printf("Node %d becomes leader for term %d\n", rf.me, rf.currentTerm)

						// Start sending heartbeats
						go func(term int) {
							for !rf.killed() {
								rf.mu.Lock()
								if rf.state != Leader || rf.currentTerm != term {
									rf.mu.Unlock()
									return
								}
								rf.mu.Unlock()
								for peer := range rf.peers {
									if peer == rf.me {
										continue
									}
									go func(peer int) {
										args := AppendEntriesArgs{
											Term:     term,
											LeaderId: rf.me,
										}
										var reply AppendEntriesReply
										rf.sendAppendEntries(peer, &args, &reply)
									}(peer)
								}
								time.Sleep(100 * time.Millisecond)
							}
						}(termAtStart)
					}
				}
			}
		}(peer, args)
	}

	// Optional debug print to confirm failure to win election
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

	// Initialzing state for Labs 2A, 2B, 2C
	rf.currentTerm = 0
	rf.votedFor = -1
	rf.state = Follower
	rf.log = make([]LogEntry, 1) // dummy entry at index 0
	rf.commitIndex = 0
	rf.lastApplied = 0
	rf.state = Follower
	rf.applyCh = applyCh
	rf.electionResetEvent = time.Now()

	go func() {
		for {
			rf.mu.Lock()
			for rf.lastApplied < rf.commitIndex {
				rf.lastApplied++

				msg := ApplyMsg{
					CommandValid: true,
					Command:      rf.log[rf.lastApplied].Command,
					CommandIndex: rf.lastApplied,
				}

				rf.mu.Unlock()
				rf.applyCh <- msg
				rf.mu.Lock()
			}
			rf.mu.Unlock()
			time.Sleep(10 * time.Millisecond)
		}
	}()

	// initialize from state persisted before a crash
	rf.readPersist(persister.ReadRaftState())

	go rf.ticker()

	return rf
}
