# Minato AI Games Testing Checklist

## 🎯 Overview
This checklist will help verify that all the recent fixes to the games system are working correctly.

## ✅ Pre-Testing Setup

### 1. Environment Check
- [ ] Development server running (`npm run dev`)
- [ ] Convex backend connected
- [ ] Supabase authentication working
- [ ] User logged in to the application

### 2. Navigation Check
- [ ] Can access `/games` page
- [ ] Game Library tab loads successfully
- [ ] Active Games tab loads successfully
- [ ] All game icons and descriptions render properly

## 🎮 Core Game Functionality Tests

### A. Solo Game Flow (CRITICAL FIX)
**Expected:** Solo games should start immediately without lobby wait

1. **Create Solo Game**
   - [ ] Go to Games → Game Library
   - [ ] Click any game (e.g., "Classic Academia Quiz")
   - [ ] Select Mode: "Solo"
   - [ ] Set difficulty and other preferences
   - [ ] Click "Create Game"
   - [ ] **Expected:** Toast shows "Solo game started immediately"
   - [ ] **Expected:** Auto-redirects to game play page (`/games/play/[gameId]`)
   - [ ] **Expected:** Game shows "In Progress" status
   - [ ] **Expected:** Questions are loaded and playable

2. **Solo Game Gameplay**
   - [ ] Question displays correctly
   - [ ] Timer countdown works
   - [ ] Can select answers
   - [ ] Answers submit successfully
   - [ ] Score updates properly
   - [ ] Can advance to next question
   - [ ] Game completes successfully

### B. Multiplayer Game Flow (CRITICAL FIX)
**Expected:** Players can join and resume multiplayer games

1. **Create Multiplayer Game**
   - [ ] Go to Games → Game Library
   - [ ] Click any game
   - [ ] Select Mode: "Multiplayer"
   - [ ] Set max players > 1
   - [ ] Click "Create Game"
   - [ ] **Expected:** Toast shows "Game created! Invite friends..."
   - [ ] **Expected:** Redirects to Active Games tab
   - [ ] **Expected:** Game appears in "Your Games" section with "Lobby" status

2. **Join Game (Test with second user/incognito)**
   - [ ] Open incognito/second browser
   - [ ] Log in as different user
   - [ ] Go to Active Games tab
   - [ ] **Expected:** Created game appears in "Public Games" or can be joined via invite
   - [ ] Click "Join Game"
   - [ ] **Expected:** Successfully joins game
   - [ ] **Expected:** Player appears in lobby

3. **Resume Game Feature**
   - [ ] Start a multiplayer game
   - [ ] Leave the game page (navigate away)
   - [ ] Return to Active Games tab
   - [ ] **Expected:** Game shows "Resume" button
   - [ ] Click "Resume"
   - [ ] **Expected:** Returns to game play page
   - [ ] **Expected:** Game state preserved

### C. Game Invitation System
1. **Send Invitations**
   - [ ] Create multiplayer game
   - [ ] Use invite functionality (if available in UI)
   - [ ] **Expected:** Invitations send successfully

2. **Receive Invitations**
   - [ ] Check invitations section
   - [ ] Accept invitation
   - [ ] **Expected:** Successfully joins game

## 🔧 Technical Integration Tests

### D. Convex Backend Integration
1. **Database Operations**
   - [ ] Games created in Convex `live_games` table
   - [ ] Player joins recorded properly
   - [ ] Game state updates in real-time
   - [ ] Questions stored and retrieved correctly

2. **Real-time Updates**
   - [ ] Multiple players see updates simultaneously
   - [ ] Player joins/leaves reflect immediately
   - [ ] Score updates sync across clients

### E. Error Handling
1. **Authentication Errors**
   - [ ] Logged-out users can't create games
   - [ ] Proper error messages shown
   - [ ] Redirects to login if needed

2. **Game State Errors**
   - [ ] Can't join full games
   - [ ] Can't join in-progress games (unless resuming)
   - [ ] Proper error toasts displayed

## 🎯 Specific Bug Fix Verification

### F. Fixed Issues Check
1. **Mock Implementation Removal** ✅
   - [ ] Verify `hooks/useGames.ts` uses real Convex mutations
   - [ ] No console.log messages about "mock implementation"
   - [ ] Actual game data persisted in database

2. **Solo Game Auto-Start** ✅
   - [ ] Solo games bypass lobby completely
   - [ ] Immediate redirect to play page
   - [ ] Game starts with questions loaded

3. **Join/Resume Functionality** ✅
   - [ ] Players can join multiplayer games in lobby
   - [ ] Players can resume in-progress games
   - [ ] Proper permission checks (only participants can resume)

4. **Question System** ✅
   - [ ] Fallback questions load properly
   - [ ] Questions display correctly in game interface
   - [ ] Answer submission works
   - [ ] Progress tracking functional

## 🚨 Known Limitations
- Questions currently use fallback system (not AI-generated)
- Tournament features may not be fully tested
- Advanced game modes may need additional testing

## 📝 Test Results Log

### Solo Games
- [ ] ✅ Pass / ❌ Fail: Creation
- [ ] ✅ Pass / ❌ Fail: Auto-start
- [ ] ✅ Pass / ❌ Fail: Gameplay
- Notes: ____________________

### Multiplayer Games
- [ ] ✅ Pass / ❌ Fail: Creation
- [ ] ✅ Pass / ❌ Fail: Joining
- [ ] ✅ Pass / ❌ Fail: Resuming
- Notes: ____________________

### System Integration
- [ ] ✅ Pass / ❌ Fail: Convex integration
- [ ] ✅ Pass / ❌ Fail: Real-time updates
- [ ] ✅ Pass / ❌ Fail: Error handling
- Notes: ____________________

## 🎯 Next Steps If Issues Found
1. Check browser console for errors
2. Check Convex dashboard for data persistence
3. Verify network requests in dev tools
4. Check authentication status
5. Report specific error messages for debugging

---

**Target URL for Testing:** `http://localhost:3000/games`

**Key Success Criteria:**
- ✅ Solo games start immediately
- ✅ Players can join multiplayer games
- ✅ Players can resume in-progress games  
- ✅ No mock implementation console logs
- ✅ Real-time game state synchronization 