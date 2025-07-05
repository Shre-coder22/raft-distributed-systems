package raft

import (
	"fmt"
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

	state string // Follower, Candidate, Leader

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
	if data == nil || len(data) < 1 { // bootstrap without any state?
		return
	}
	// Your code here (2C).
}

// field names must start with capital letters!
type RequestVoteArgs struct {
	// Figure 2 raft paper
	Term        int
	CandidateId int
}

// field names must start with capital letters!
type RequestVoteReply struct {
	// Figure 2 raft paper
	Term        int
	VoteGranted bool
}

// RequestVote RPC handler.

func (rf *Raft) RequestVote(args RequestVoteArgs, reply *RequestVoteReply) {

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
		fmt.Printf("[Node %d] voted for %d in term %d\n", rf.me, args.CandidateId, args.Term)
	}

	return
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

func (rf *Raft) Kill() {
	atomic.StoreInt32(&rf.dead, 1)
	// Your code here, if desired.
}

func (rf *Raft) killed() bool {
	z := atomic.LoadInt32(&rf.dead)
	return z == 1
}

func (rf *Raft) ticker() {
	for rf.killed() == false {
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
	fmt.Printf("[Node %d] starting election: term=%d, votedFor=%d\n", rf.me, rf.currentTerm, rf.votedFor)
	rf.state = Candidate
	rf.currentTerm++
	rf.votedFor = rf.me
	rf.electionResetEvent = time.Now()
	termAtStart := rf.currentTerm
	votesReceived := 1
	rf.mu.Unlock()
	fmt.Printf("[Node %d] Starting election for term %d\n", rf.me, termAtStart)
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
					fmt.Printf("[Node %d] got vote from %d for term %d (votes: %d)\n", rf.me, peer, rf.currentTerm, votesReceived)
					if votesReceived > len(rf.peers)/2 {
						// Becomes leader
						rf.state = Leader
						rf.electionResetEvent = time.Now()

						fmt.Printf("Node %d becomes leader for term %d\n", rf.me, rf.currentTerm)
						// Start sending heartbeats

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
			fmt.Printf("[Node %d] still not a leader after election in term %d\n", rf.me, termAtStart)
		}
	}()
}

func Make(peers []*labrpc.ClientEnd, me int, persister *Persister, applyCh chan ApplyMsg) *Raft {

	rf := &Raft{}
	rf.peers = peers
	rf.persister = persister
	rf.me = me

	rf.currentTerm = 0
	rf.votedFor = -1
	rf.state = Follower
	rf.log = make([]LogEntry, 1) // dummy entry at index 0

	rf.commitIndex = 0
	rf.lastApplied = 0

	rf.state = Follower

	rf.applyCh = applyCh
	rf.electionResetEvent = time.Now()

	// initialize from state persisted before a crash
	rf.readPersist(persister.ReadRaftState())

	go rf.ticker()
	return rf
}
