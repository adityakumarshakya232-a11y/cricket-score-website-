/* ============================================
   CRICSCORE — CRICKET SCORER JS
   100% Manual: Toss, Batting/Bowling, Players
   ============================================ */

let state = {
  teamA: { name: 'Team A', players: [] },
  teamB: { name: 'Team B', players: [] },
  totalOvers: 10,
  tossWinner: null,
  tossChoice: null,
  inning: 1,
  battingTeam: 'A',
  bowlingTeam: 'B',
  innings: [createInningsData(), createInningsData()],
  matchStarted: false,
  matchOver: false,
};

let pendingModal = null;
let _afterOverWicket = false;

function createInningsData() {
  return {
    runs: 0, wickets: 0, balls: 0,
    extras: { wides: 0, noballs: 0 },
    batting: {}, bowling: {},
    striker: null, nonStriker: null, currentBowler: null,
    overLog: [], currentOverBalls: [],
    battingOrder: [], bowlingOrder: [],
    ballHistory: [],
    _lastOverBowler: null,
  };
}

// ============ SETUP ============
window.addPlayer = function(team) {
  const input = document.getElementById('team' + team + '-player-input');
  const name = input.value.trim();
  if (!name) return;
  const arr = state['team' + team].players;
  if (arr.length >= 11) { showToast('Maximum 11 players allowed'); return; }
  if (arr.includes(name)) { showToast('Player already added'); return; }
  arr.push(name);
  input.value = '';
  renderPlayerList(team);
  input.focus();
};

function renderPlayerList(team) {
  const list = document.getElementById('team' + team + '-player-list');
  const countEl = document.getElementById('team' + team + '-count');
  const arr = state['team' + team].players;
  list.innerHTML = arr.map((p, i) =>
    '<span class="player-tag">' +
      '<span>' + (i + 1) + '. ' + p + '</span>' +
      '<button class="remove-btn" onclick="removePlayer(\'' + team + '\',' + i + ')">×</button>' +
    '</span>'
  ).join('');
  countEl.textContent = arr.length + ' / 11 players';
}

window.removePlayer = function(team, idx) {
  state['team' + team].players.splice(idx, 1);
  renderPlayerList(team);
};

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('teamA-player-input').addEventListener('keydown', function(e) { if (e.key === 'Enter') addPlayer('A'); });
  document.getElementById('teamB-player-input').addEventListener('keydown', function(e) { if (e.key === 'Enter') addPlayer('B'); });
  document.getElementById('teamA-name').addEventListener('input', syncTeamNames);
  document.getElementById('teamB-name').addEventListener('input', syncTeamNames);

  document.getElementById('overs-pills').addEventListener('click', function(e) {
    if (e.target.classList.contains('pill')) {
      document.querySelectorAll('.pill').forEach(function(p) { p.classList.remove('active'); });
      e.target.classList.add('active');
      state.totalOvers = parseInt(e.target.dataset.overs);
      document.getElementById('custom-overs').value = '';
    }
  });

  document.getElementById('custom-overs').addEventListener('input', function(e) {
    var val = parseInt(e.target.value);
    if (val >= 1 && val <= 99) {
      document.querySelectorAll('.pill').forEach(function(p) { p.classList.remove('active'); });
      state.totalOvers = val;
    }
  });

  loadHistory();
});

function syncTeamNames() {
  state.teamA.name = document.getElementById('teamA-name').value.trim() || 'Team A';
  state.teamB.name = document.getElementById('teamB-name').value.trim() || 'Team B';
}

// ============ TOSS — MANUAL COIN SYSTEM ============

window.openToss = function() {
  syncTeamNames();
  var a = state.teamA.name;
  var b = state.teamB.name;
  showBigModal(
    '<div class="toss-modal-inner">' +
      '<div class="toss-coin-icon">🪙</div>' +
      '<h2 class="toss-modal-title">TOSS</h2>' +
      '<p class="toss-modal-sub">Kaun si team coin call karegi?</p>' +
      '<div class="toss-step-btns">' +
        '<button class="toss-team-btn" onclick="tossStep2(\'A\')">' + a + '</button>' +
        '<button class="toss-team-btn" onclick="tossStep2(\'B\')">' + b + '</button>' +
      '</div>' +
    '</div>'
  );
};

window.tossStep2 = function(callingTeam) {
  var callerName = state['team' + callingTeam].name;
  updateBigModal(
    '<div class="toss-modal-inner">' +
      '<div class="toss-coin-icon">🪙</div>' +
      '<h2 class="toss-modal-title">' + callerName + '</h2>' +
      '<p class="toss-modal-sub">Heads ya Tails chuniye:</p>' +
      '<div class="toss-step-btns">' +
        '<button class="toss-choice-btn heads-btn" onclick="tossStep3(\'' + callingTeam + '\', \'heads\')">' +
          '<span class="coin-face">H</span>HEADS' +
        '</button>' +
        '<button class="toss-choice-btn tails-btn" onclick="tossStep3(\'' + callingTeam + '\', \'tails\')">' +
          '<span class="coin-face">T</span>TAILS' +
        '</button>' +
      '</div>' +
    '</div>'
  );
};

window.tossStep3 = function(callingTeam, call) {
  var callerName = state['team' + callingTeam].name;
  var callLabel = call === 'heads' ? 'HEADS' : 'TAILS';
  updateBigModal(
    '<div class="toss-modal-inner">' +
      '<div class="coin-spin" id="spin-coin">🪙</div>' +
      '<h2 class="toss-modal-title">Coin Uchal Raha Hai...</h2>' +
      '<p class="toss-modal-sub">' + callerName + ' ne <strong>' + callLabel + '</strong> call kiya</p>' +
    '</div>'
  );
  setTimeout(function() {
    updateBigModal(
      '<div class="toss-modal-inner">' +
        '<div class="toss-coin-icon">🪙</div>' +
        '<h2 class="toss-modal-title">Real Coin Dekho</h2>' +
        '<p class="toss-modal-sub">Actual coin mein kya aaya? Aap khud dekh ke batayein:</p>' +
        '<div class="toss-step-btns">' +
          '<button class="toss-choice-btn heads-btn" onclick="tossStep4(\'' + callingTeam + '\', \'' + call + '\', \'heads\')">' +
            '<span class="coin-face">H</span>HEADS AAYA' +
          '</button>' +
          '<button class="toss-choice-btn tails-btn" onclick="tossStep4(\'' + callingTeam + '\', \'' + call + '\', \'tails\')">' +
            '<span class="coin-face">T</span>TAILS AAYA' +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }, 1600);
};

window.tossStep4 = function(callingTeam, call, result) {
  var won = (call === result);
  var winnerTeam = won ? callingTeam : (callingTeam === 'A' ? 'B' : 'A');
  var winnerName = state['team' + winnerTeam].name;
  state.tossWinner = winnerTeam;

  updateBigModal(
    '<div class="toss-modal-inner">' +
      '<div class="toss-coin-icon">' + (result === 'heads' ? '🟡' : '⚫') + '</div>' +
      '<h2 class="toss-modal-title" style="color:var(--gold)">' + winnerName + '</h2>' +
      '<p class="toss-modal-sub" style="color:var(--gold);font-size:16px;font-weight:700;margin-bottom:4px">TOSS JEET GAYE! 🎉</p>' +
      '<p class="toss-modal-sub">' + result.toUpperCase() + ' aaya tha</p>' +
      '<p class="toss-modal-sub" style="margin-top:20px;font-size:15px">Ab match mein kya karenge?</p>' +
      '<div class="toss-step-btns">' +
        '<button class="toss-choice-btn bat-btn" onclick="tossStep5(\'' + winnerTeam + '\', \'bat\')">🏏 BATTING PEHLE</button>' +
        '<button class="toss-choice-btn bowl-btn" onclick="tossStep5(\'' + winnerTeam + '\', \'bowl\')">🎯 BOWLING PEHLE</button>' +
      '</div>' +
    '</div>'
  );
};

window.tossStep5 = function(winnerTeam, choice) {
  state.tossChoice = choice;
  if (choice === 'bat') {
    state.battingTeam = winnerTeam;
    state.bowlingTeam = winnerTeam === 'A' ? 'B' : 'A';
  } else {
    state.bowlingTeam = winnerTeam;
    state.battingTeam = winnerTeam === 'A' ? 'B' : 'A';
  }

  var winnerName = state['team' + winnerTeam].name;
  var batName = state['team' + state.battingTeam].name;
  var bowlName = state['team' + state.bowlingTeam].name;

  updateBigModal(
    '<div class="toss-modal-inner">' +
      '<div class="toss-coin-icon">✅</div>' +
      '<h2 class="toss-modal-title">Toss Complete!</h2>' +
      '<div class="toss-summary-box">' +
        '<div class="toss-sum-row"><span class="toss-sum-label">Toss Winner</span><span class="toss-sum-val gold">' + winnerName + '</span></div>' +
        '<div class="toss-sum-row"><span class="toss-sum-label">Choice</span><span class="toss-sum-val green">' + (choice === 'bat' ? 'Batting First' : 'Bowling First') + '</span></div>' +
        '<div class="toss-sum-row"><span class="toss-sum-label">🏏 Batting</span><span class="toss-sum-val">' + batName + '</span></div>' +
        '<div class="toss-sum-row"><span class="toss-sum-label">🎯 Bowling</span><span class="toss-sum-val">' + bowlName + '</span></div>' +
      '</div>' +
      '<button class="toss-done-btn" onclick="closeBigModal(); showTossResult()">THEEK HAI, SHURU KARO →</button>' +
    '</div>'
  );
};

window.showTossResult = function() {
  var batName = state['team' + state.battingTeam].name;
  var bowlName = state['team' + state.bowlingTeam].name;
  document.getElementById('toss-result-display').innerHTML =
    '<div class="toss-done-card">' +
      '<span class="toss-done-row">🏏 <b>' + batName + '</b> batting karegi</span>' +
      '<span class="toss-done-row">🎯 <b>' + bowlName + '</b> bowling karegi</span>' +
    '</div>';
};

// ============ BIG MODAL ============
function showBigModal(html) {
  var overlay = document.getElementById('big-modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'big-modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = '<div class="modal big-modal" id="big-modal-content"></div>';
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'flex';
  document.getElementById('big-modal-content').innerHTML = html;
}

function updateBigModal(html) {
  var el = document.getElementById('big-modal-content');
  if (el) el.innerHTML = html;
}

window.closeBigModal = function() {
  var overlay = document.getElementById('big-modal-overlay');
  if (overlay) overlay.style.display = 'none';
};

// ============ START MATCH ============
window.startMatch = function() {
  syncTeamNames();
  if (state.teamA.players.length < 2) { showToast(state.teamA.name + ' mein kam se kam 2 players chahiye'); return; }
  if (state.teamB.players.length < 2) { showToast(state.teamB.name + ' mein kam se kam 2 players chahiye'); return; }
  if (!state.tossWinner) { showToast('Pehle Toss karo!'); return; }

  state.innings = [createInningsData(), createInningsData()];
  state.inning = 1;
  state.matchStarted = true;
  state.matchOver = false;

  showScreen('screen-match');
  updateInningsBanner();
  promptSelectPlayer('striker');
};

function updateInningsBanner() {
  document.getElementById('innings-label').textContent = state.inning === 1 ? '1ST INNINGS' : '2ND INNINGS';
  document.getElementById('batting-team-label').textContent = state['team' + state.battingTeam].name + ' Batting';
}

// ============ PLAYER SELECTION MODAL ============
function promptSelectPlayer(type) {
  pendingModal = type;
  var inning = state.innings[state.inning - 1];
  var isBowler = (type === 'bowler');
  var teamKey = isBowler ? state.bowlingTeam : state.battingTeam;
  var teamPlayers = state['team' + teamKey].players;
  var available;

  if (isBowler) {
    available = teamPlayers.slice();
    if (inning._lastOverBowler && available.length > 1) {
      available = available.filter(function(p) { return p !== inning._lastOverBowler; });
    }
  } else {
    available = teamPlayers.filter(function(p) {
      var bat = inning.batting[p];
      if (bat && bat.status === 'out') return false;
      if (p === inning.striker || p === inning.nonStriker) return false;
      return true;
    });
    if (available.length === 0) {
      available = teamPlayers.filter(function(p) { return p !== inning.striker && p !== inning.nonStriker; });
    }
  }

  var titles = {
    striker: '🏏 Striker Chuniye — ' + state['team' + state.battingTeam].name,
    nonstriker: '🏏 Non-Striker Chuniye — ' + state['team' + state.battingTeam].name,
    bowler: '🎯 Bowler Chuniye — ' + state['team' + state.bowlingTeam].name,
    newbatter: '🏏 Naya Batsman — ' + state['team' + state.battingTeam].name,
  };

  document.getElementById('modal-title').textContent = titles[type] || 'Player Chuniye';
  var listEl = document.getElementById('modal-player-list');

  if (available.length === 0) {
    listEl.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:16px">Koi available player nahi</p>';
  } else {
    listEl.innerHTML = available.map(function(p) {
      var stats = '';
      if (isBowler) {
        var bw = inning.bowling[p];
        if (bw) stats = Math.floor(bw.balls/6) + '.' + (bw.balls%6) + ' ov | ' + bw.wickets + 'W ' + bw.runs + 'R';
        else stats = 'Bowl nahi kiya abhi';
      } else {
        var bat = inning.batting[p];
        if (bat) stats = bat.runs + ' runs (' + bat.balls + ' balls)';
        else stats = 'Batting nahi ki abhi';
      }
      var safeName = p.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return '<button class="modal-player-btn" onclick="selectPlayer(\'' + safeName + '\')">' +
        '<span class="modal-p-name">' + p + '</span>' +
        '<span class="modal-p-stats">' + stats + '</span>' +
      '</button>';
    }).join('');
  }

  document.getElementById('player-select-modal').style.display = 'flex';
}

window.selectPlayer = function(name) {
  document.getElementById('player-select-modal').style.display = 'none';
  var inning = state.innings[state.inning - 1];
  var type = pendingModal;
  pendingModal = null;

  if (type === 'striker') {
    inning.striker = name;
    ensureBatter(name);
    if (!inning.nonStriker) { setTimeout(function() { promptSelectPlayer('nonstriker'); }, 100); }
    else if (!inning.currentBowler) { setTimeout(function() { promptSelectPlayer('bowler'); }, 100); }
    else updateUI();

  } else if (type === 'nonstriker') {
    inning.nonStriker = name;
    ensureBatter(name);
    if (!inning.currentBowler) { setTimeout(function() { promptSelectPlayer('bowler'); }, 100); }
    else updateUI();

  } else if (type === 'bowler') {
    inning.currentBowler = name;
    ensureBowler(name);
    if (_afterOverWicket) {
      _afterOverWicket = false;
    }
    updateUI();

  } else if (type === 'newbatter') {
    inning.striker = name;
    ensureBatter(name);
    if (_afterOverWicket) {
      // still need bowler
      setTimeout(function() { promptSelectPlayer('bowler'); }, 100);
    } else {
      updateUI();
    }
  }
};

window.closePlayerModal = function() {
  document.getElementById('player-select-modal').style.display = 'none';
  pendingModal = null;
};

// Manual change buttons
window.changeStriker = function() {
  pendingModal = 'striker';
  var inning = state.innings[state.inning - 1];
  var available = state['team' + state.battingTeam].players.filter(function(p) {
    var bat = inning.batting[p];
    if (bat && bat.status === 'out') return false;
    if (p === inning.nonStriker) return false;
    return true;
  });
  document.getElementById('modal-title').textContent = '🏏 Striker Badlo';
  document.getElementById('modal-player-list').innerHTML = available.map(function(p) {
    var bat = inning.batting[p];
    var st = bat ? bat.runs + '(' + bat.balls + ')' : 'Yet to bat';
    var sp = p.replace(/'/g, "\\'");
    return '<button class="modal-player-btn" onclick="selectPlayer(\'' + sp + '\')">' +
      '<span class="modal-p-name">' + p + '</span><span class="modal-p-stats">' + st + '</span></button>';
  }).join('');
  document.getElementById('player-select-modal').style.display = 'flex';
};

window.changeNonStriker = function() {
  pendingModal = 'nonstriker';
  var inning = state.innings[state.inning - 1];
  var available = state['team' + state.battingTeam].players.filter(function(p) {
    var bat = inning.batting[p];
    if (bat && bat.status === 'out') return false;
    if (p === inning.striker) return false;
    return true;
  });
  document.getElementById('modal-title').textContent = '🏏 Non-Striker Badlo';
  document.getElementById('modal-player-list').innerHTML = available.map(function(p) {
    var bat = inning.batting[p];
    var st = bat ? bat.runs + '(' + bat.balls + ')' : 'Yet to bat';
    var sp = p.replace(/'/g, "\\'");
    return '<button class="modal-player-btn" onclick="selectPlayer(\'' + sp + '\')">' +
      '<span class="modal-p-name">' + p + '</span><span class="modal-p-stats">' + st + '</span></button>';
  }).join('');
  document.getElementById('player-select-modal').style.display = 'flex';
};

window.changeBowler = function() {
  pendingModal = 'bowler';
  var inning = state.innings[state.inning - 1];
  var players = state['team' + state.bowlingTeam].players;
  document.getElementById('modal-title').textContent = '🎯 Bowler Badlo';
  document.getElementById('modal-player-list').innerHTML = players.map(function(p) {
    var bw = inning.bowling[p];
    var st = bw ? Math.floor(bw.balls/6) + '.' + (bw.balls%6) + ' ov | ' + bw.wickets + 'W' : 'Yet to bowl';
    var sp = p.replace(/'/g, "\\'");
    return '<button class="modal-player-btn" onclick="selectPlayer(\'' + sp + '\')">' +
      '<span class="modal-p-name">' + p + '</span><span class="modal-p-stats">' + st + '</span></button>';
  }).join('');
  document.getElementById('player-select-modal').style.display = 'flex';
};

function ensureBatter(name) {
  var inning = state.innings[state.inning - 1];
  if (!inning.batting[name]) {
    inning.batting[name] = { runs: 0, balls: 0, fours: 0, sixes: 0, status: 'batting' };
    inning.battingOrder.push(name);
  } else {
    inning.batting[name].status = 'batting';
  }
}

function ensureBowler(name) {
  var inning = state.innings[state.inning - 1];
  if (!inning.bowling[name]) {
    inning.bowling[name] = { balls: 0, runs: 0, wickets: 0, wides: 0, noballs: 0 };
    inning.bowlingOrder.push(name);
  }
}

// ============ SCORING ============
window.scoreBall = function(runs) {
  var inning = state.innings[state.inning - 1];
  if (!inning.striker || !inning.currentBowler) { showToast('Pehle striker aur bowler select karo'); return; }

  saveForUndo();
  inning.runs += runs;
  inning.batting[inning.striker].runs += runs;
  inning.batting[inning.striker].balls++;
  inning.bowling[inning.currentBowler].runs += runs;
  inning.bowling[inning.currentBowler].balls++;
  inning.balls++;
  if (runs === 4) inning.batting[inning.striker].fours++;
  if (runs === 6) inning.batting[inning.striker].sixes++;

  inning.currentOverBalls.push({ type: runs === 0 ? 'dot' : 'run-' + runs, display: String(runs), runs: runs, legal: true });

  if (runs === 4) { playSound('boundary'); flashScreen('boundary-flash'); }
  if (runs === 6) { playSound('six'); flashScreen('six-flash'); }
  animateScore();
  if (runs % 2 === 1) rotateStrike();

  var legalInOver = inning.currentOverBalls.filter(function(b) { return b.legal; }).length;
  if (legalInOver >= 6) {
    endOver(false);
  } else {
    updateUI();
    if (state.inning === 2) { var t = state.innings[0].runs + 1; if (inning.runs >= t) { endMatch(); return; } }
    checkInningsOver();
  }
};

window.scoreWicket = function() {
  var inning = state.innings[state.inning - 1];
  if (!inning.striker || !inning.currentBowler) { showToast('Pehle striker aur bowler select karo'); return; }

  saveForUndo();
  inning.wickets++;
  inning.batting[inning.striker].status = 'out';
  inning.batting[inning.striker].balls++;
  inning.bowling[inning.currentBowler].wickets++;
  inning.bowling[inning.currentBowler].balls++;
  inning.balls++;

  inning.currentOverBalls.push({ type: 'wicket', display: 'W', runs: 0, legal: true });
  animateScore();

  var maxWickets = state['team' + state.battingTeam].players.length - 1;
  var legalInOver = inning.currentOverBalls.filter(function(b) { return b.legal; }).length;
  var allOut = inning.wickets >= maxWickets;

  if (legalInOver >= 6) {
    if (allOut) {
      endOver(false);
      checkInningsOver(true);
    } else {
      endOver(true); // end of over + need new batter
    }
  } else {
    updateUI();
    if (allOut) { checkInningsOver(true); return; }
    setTimeout(function() { promptSelectPlayer('newbatter'); }, 200);
  }
};

window.scoreExtra = function(type) {
  var inning = state.innings[state.inning - 1];
  if (!inning.currentBowler) { showToast('Pehle bowler select karo'); return; }

  saveForUndo();
  inning.runs++;
  if (type === 'wide') { inning.extras.wides++; inning.bowling[inning.currentBowler].wides++; }
  else { inning.extras.noballs++; inning.bowling[inning.currentBowler].noballs++; }
  inning.bowling[inning.currentBowler].runs++;

  inning.currentOverBalls.push({ type: type, display: type === 'wide' ? 'Wd' : 'Nb', runs: 1, legal: false });
  animateScore();
  updateUI();
  if (state.inning === 2) { var t = state.innings[0].runs + 1; if (inning.runs >= t) { endMatch(); return; } }
  checkInningsOver();
};

window.undoLastBall = function() {
  var inning = state.innings[state.inning - 1];
  if (!inning.ballHistory || inning.ballHistory.length === 0) { showToast('Undo ke liye koi ball nahi'); return; }
  var snap = JSON.parse(inning.ballHistory.pop());
  Object.keys(snap).forEach(function(k) { inning[k] = snap[k]; });
  updateUI();
  showToast('Last ball undo ho gaya ✓');
};

function saveForUndo() {
  var inning = state.innings[state.inning - 1];
  var snap = {
    runs: inning.runs, wickets: inning.wickets, balls: inning.balls,
    extras: JSON.parse(JSON.stringify(inning.extras)),
    batting: JSON.parse(JSON.stringify(inning.batting)),
    bowling: JSON.parse(JSON.stringify(inning.bowling)),
    striker: inning.striker, nonStriker: inning.nonStriker, currentBowler: inning.currentBowler,
    currentOverBalls: JSON.parse(JSON.stringify(inning.currentOverBalls)),
    overLog: JSON.parse(JSON.stringify(inning.overLog)),
    battingOrder: inning.battingOrder.slice(), bowlingOrder: inning.bowlingOrder.slice(),
    _lastOverBowler: inning._lastOverBowler || null,
  };
  inning.ballHistory.push(JSON.stringify(snap));
  if (inning.ballHistory.length > 30) inning.ballHistory.shift();
}

// ============ OVER MANAGEMENT ============
function endOver(needNewBatter) {
  var inning = state.innings[state.inning - 1];
  inning.overLog.push(JSON.parse(JSON.stringify(inning.currentOverBalls)));
  inning._lastOverBowler = inning.currentBowler;
  inning.currentOverBalls = [];
  rotateStrike();
  updateUI();

  var completedOvers = Math.floor(inning.balls / 6);
  if (completedOvers >= state.totalOvers) {
    checkInningsOver(false, true);
    return;
  }

  if (needNewBatter) {
    _afterOverWicket = true;
    setTimeout(function() { promptSelectPlayer('newbatter'); }, 200);
  } else {
    setTimeout(function() { promptSelectPlayer('bowler'); }, 200);
  }
}

function rotateStrike() {
  var inning = state.innings[state.inning - 1];
  var tmp = inning.striker;
  inning.striker = inning.nonStriker;
  inning.nonStriker = tmp;
}

function checkInningsOver(allOut, oversComplete) {
  var inning = state.innings[state.inning - 1];
  var maxW = state['team' + state.battingTeam].players.length - 1;
  var legalOvers = Math.floor(inning.balls / 6);
  var end = allOut || oversComplete || inning.wickets >= maxW || legalOvers >= state.totalOvers;
  if (!end) return;
  if (state.inning === 1) {
    setTimeout(function() { startSecondInnings(); }, 400);
  } else {
    endMatch();
  }
}

function startSecondInnings() {
  state.inning = 2;
  state.battingTeam = state.battingTeam === 'A' ? 'B' : 'A';
  state.bowlingTeam = state.bowlingTeam === 'A' ? 'B' : 'A';
  state.innings[1] = createInningsData();
  updateInningsBanner();

  var target = state.innings[0].runs + 1;
  document.getElementById('target-meta').style.display = 'flex';
  document.getElementById('target-display').textContent = target;
  document.getElementById('req-meta').style.display = 'flex';

  var inn1 = state.innings[0];
  var firstTeamName = state['team' + (state.battingTeam === 'A' ? 'B' : 'A')].name;
  var secondTeamName = state['team' + state.battingTeam].name;

  showBigModal(
    '<div class="toss-modal-inner">' +
      '<div class="toss-coin-icon">🏏</div>' +
      '<h2 class="toss-modal-title">1ST INNINGS KHATAM</h2>' +
      '<div class="toss-summary-box">' +
        '<div class="toss-sum-row"><span class="toss-sum-label">Score</span><span class="toss-sum-val gold">' + firstTeamName + ': ' + inn1.runs + '/' + inn1.wickets + '</span></div>' +
        '<div class="toss-sum-row"><span class="toss-sum-label">Target</span><span class="toss-sum-val green">' + target + ' runs</span></div>' +
        '<div class="toss-sum-row"><span class="toss-sum-label">2nd Innings</span><span class="toss-sum-val">' + secondTeamName + ' batting karegi</span></div>' +
      '</div>' +
      '<button class="toss-done-btn" onclick="closeBigModal(); promptSelectPlayer(\'striker\')">2ND INNINGS SHURU →</button>' +
    '</div>'
  );
}

function endMatch() {
  if (state.matchOver) return;
  state.matchOver = true;
  saveMatchToHistory();
  setTimeout(function() { showSummary(); }, 500);
}

// ============ UI UPDATE ============
function updateUI() {
  var inning = state.innings[state.inning - 1];

  document.getElementById('score-runs').textContent = inning.runs;
  document.getElementById('score-wickets').textContent = inning.wickets;

  var overs = Math.floor(inning.balls / 6);
  var balls = inning.balls % 6;
  document.getElementById('overs-display').textContent = overs + '.' + balls;

  var rr = inning.balls > 0 ? ((inning.runs / inning.balls) * 6).toFixed(2) : '0.00';
  document.getElementById('rr-display').textContent = rr;

  if (state.inning === 2) {
    var target = state.innings[0].runs + 1;
    var rem = target - inning.runs;
    var ballsLeft = (state.totalOvers * 6) - inning.balls;
    document.getElementById('req-display').textContent = (ballsLeft > 0 && rem > 0)
      ? ((rem / ballsLeft) * 6).toFixed(2) : (rem <= 0 ? '0.00' : '—');
  }

  renderOverDots(inning);

  if (inning.striker) {
    document.getElementById('striker-name').textContent = inning.striker;
    var b = inning.batting[inning.striker];
    if (b) { var sr = b.balls > 0 ? ((b.runs/b.balls)*100).toFixed(0) : '0'; document.getElementById('striker-stats').textContent = b.runs + ' (' + b.balls + ') SR:' + sr; }
  } else { document.getElementById('striker-name').textContent = '—'; document.getElementById('striker-stats').textContent = ''; }

  if (inning.nonStriker) {
    document.getElementById('nonstriker-name').textContent = inning.nonStriker;
    var bn = inning.batting[inning.nonStriker];
    if (bn) { var srn = bn.balls > 0 ? ((bn.runs/bn.balls)*100).toFixed(0) : '0'; document.getElementById('nonstriker-stats').textContent = bn.runs + ' (' + bn.balls + ') SR:' + srn; }
  } else { document.getElementById('nonstriker-name').textContent = '—'; document.getElementById('nonstriker-stats').textContent = ''; }

  if (inning.currentBowler) {
    document.getElementById('bowler-name').textContent = inning.currentBowler;
    var bw = inning.bowling[inning.currentBowler];
    if (bw) { var bwO = Math.floor(bw.balls/6) + '.' + (bw.balls%6); var eco = bw.balls > 0 ? ((bw.runs/bw.balls)*6).toFixed(1) : '0.0'; document.getElementById('bowler-stats').textContent = bw.wickets + '/' + bw.runs + ' Eco:' + eco; }
  } else { document.getElementById('bowler-name').textContent = '—'; document.getElementById('bowler-stats').textContent = ''; }

  renderBattingTab(inning);
  renderBowlingTab(inning);
  renderBallLog(inning);
}

function renderOverDots(inning) {
  var legal = inning.currentOverBalls.filter(function(b) { return b.legal; }).length;
  document.getElementById('over-balls-label').textContent = legal + ' / 6 balls';
  document.getElementById('over-dots').innerHTML = inning.currentOverBalls.map(function(b) {
    return '<div class="ball-dot ' + b.type + '">' + b.display + '</div>';
  }).join('');
}

function renderBattingTab(inning) {
  document.getElementById('batting-tbody').innerHTML = inning.battingOrder.length === 0
    ? '<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:12px">Koi batsman nahi aaya abhi</td></tr>'
    : inning.battingOrder.map(function(p) {
        var b = inning.batting[p];
        var sr = b.balls > 0 ? ((b.runs/b.balls)*100).toFixed(0) : '0';
        var isSt = p === inning.striker, isNS = p === inning.nonStriker;
        var cls = b.status === 'out' ? 'out' : (isSt ? 'current-bat' : '');
        var ind = isSt ? ' ⚡' : (isNS ? ' •' : '');
        return '<tr class="' + cls + '"><td>' + p + ind + '</td><td>' + b.runs + '</td><td>' + b.balls + '</td><td>' + b.fours + '</td><td>' + b.sixes + '</td><td>' + sr + '</td></tr>';
      }).join('');
}

function renderBowlingTab(inning) {
  document.getElementById('bowling-tbody').innerHTML = inning.bowlingOrder.length === 0
    ? '<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:12px">Koi bowler nahi aaya abhi</td></tr>'
    : inning.bowlingOrder.map(function(p) {
        var bw = inning.bowling[p];
        var ov = Math.floor(bw.balls/6) + '.' + (bw.balls%6);
        var eco = bw.balls > 0 ? ((bw.runs/bw.balls)*6).toFixed(1) : '0.0';
        var isCur = p === inning.currentBowler;
        return '<tr class="' + (isCur ? 'current-bowl' : '') + '"><td>' + p + (isCur ? ' 🎯' : '') + '</td><td>' + ov + '</td><td>' + bw.runs + '</td><td>' + bw.wickets + '</td><td>' + eco + '</td></tr>';
      }).join('');
}

function renderBallLog(inning) {
  var html = '';
  inning.overLog.forEach(function(over, i) {
    var r = over.reduce(function(s, b) { return s + b.runs; }, 0);
    html += '<div class="ball-log-over"><div class="ball-log-over-header">OVER ' + (i+1) + ' — ' + r + ' runs</div><div class="ball-log-balls">' +
      over.map(function(b) { return '<div class="ball-dot ' + b.type + '">' + b.display + '</div>'; }).join('') +
    '</div></div>';
  });
  if (inning.currentOverBalls.length > 0) {
    var cr = inning.currentOverBalls.reduce(function(s, b) { return s + b.runs; }, 0);
    html += '<div class="ball-log-over"><div class="ball-log-over-header">CURRENT OVER — ' + cr + ' runs</div><div class="ball-log-balls">' +
      inning.currentOverBalls.map(function(b) { return '<div class="ball-dot ' + b.type + '">' + b.display + '</div>'; }).join('') +
    '</div></div>';
  }
  document.getElementById('ball-log').innerHTML = html || '<p style="color:var(--text-dim);font-size:13px;text-align:center;padding:16px">Abhi koi ball nahi hua</p>';
}

// ============ TABS ============
window.switchTab = function(tab) {
  document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
  document.querySelectorAll('.tab-content').forEach(function(t) { t.classList.remove('active'); });
  document.querySelector('[onclick="switchTab(\'' + tab + '\')"]').classList.add('active');
  document.getElementById('tab-' + tab).classList.add('active');
};

// ============ ANIMATIONS ============
function animateScore() {
  var el = document.getElementById('score-runs');
  el.classList.remove('score-pop'); void el.offsetWidth; el.classList.add('score-pop');
}
function flashScreen(cls) {
  var s = document.getElementById('screen-match');
  s.classList.remove('boundary-flash','six-flash'); void s.offsetWidth; s.classList.add(cls);
  setTimeout(function() { s.classList.remove(cls); }, 700);
}

// ============ SOUNDS ============
function playSound(type) {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    if (type === 'boundary') {
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
    } else {
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(698, ctx.currentTime + 0.08);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.16);
      osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.24);
    }
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.7);
  } catch(e) {}
}

// ============ TOAST ============
function showToast(msg) {
  var t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div'); t.id = 'toast';
    t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1e2a3a;border:1px solid var(--green);color:var(--text-primary);padding:10px 20px;border-radius:20px;font-family:var(--font-ui);font-size:14px;font-weight:600;z-index:9999;white-space:nowrap;pointer-events:none;transition:opacity 0.3s;';
    document.body.appendChild(t);
  }
  t.textContent = msg; t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(function() { t.style.opacity = '0'; }, 2500);
}

// ============ SUMMARY ============
function showSummary() {
  showScreen('screen-summary');
  var inn1 = state.innings[0], inn2 = state.innings[1];
  var firstBat = (state.battingTeam === 'A' ? 'B' : 'A'); // who batted first in inn1
  // Actually track who batted first properly:
  // battingTeam is now the team that batted 2nd (since we swapped for 2nd innings)
  // firstBat = opposite of current battingTeam
  var secondBat = state.battingTeam;
  var s1 = inn1.runs, s2 = inn2.runs;
  var winnerText, winnerMargin;

  if (s2 > s1) {
    var rem = (state['team' + secondBat].players.length - 1) - inn2.wickets;
    winnerText = state['team' + secondBat].name + ' Jeet Gaye! 🎉';
    winnerMargin = rem + ' wicket' + (rem !== 1 ? 's' : '') + ' se';
  } else if (s1 > s2) {
    var diff = s1 - s2;
    winnerText = state['team' + firstBat].name + ' Jeet Gaye! 🎉';
    winnerMargin = diff + ' run' + (diff !== 1 ? 's' : '') + ' se';
  } else {
    winnerText = 'Match Tie Hua!';
    winnerMargin = 'Dono teams barabar';
  }

  document.getElementById('winner-text').textContent = winnerText;
  document.getElementById('winner-margin').textContent = winnerMargin;

  function oF(b) { return Math.floor(b/6) + '.' + (b%6) + ' ov'; }

  document.getElementById('summary-team1').innerHTML =
    '<div class="summary-team-name">' + state['team' + firstBat].name + '</div>' +
    '<div class="summary-team-runs">' + inn1.runs + '/' + inn1.wickets + '</div>' +
    '<div class="summary-team-overs">' + oF(inn1.balls) + '</div>';

  document.getElementById('summary-team2').innerHTML =
    '<div class="summary-team-name">' + state['team' + secondBat].name + '</div>' +
    '<div class="summary-team-runs">' + inn2.runs + '/' + inn2.wickets + '</div>' +
    '<div class="summary-team-overs">' + oF(inn2.balls) + '</div>';

  var bestBat = null, bestBatR = -1;
  [inn1, inn2].forEach(function(inn) {
    Object.keys(inn.batting).forEach(function(p) { if (inn.batting[p].runs > bestBatR) { bestBatR = inn.batting[p].runs; bestBat = p; } });
  });

  var bestBowl = null, bestBowlW = -1, bestBowlEco = 999;
  [inn1, inn2].forEach(function(inn) {
    Object.keys(inn.bowling).forEach(function(p) {
      var bw = inn.bowling[p], eco = bw.balls > 0 ? bw.runs/bw.balls : 999;
      if (bw.wickets > bestBowlW || (bw.wickets === bestBowlW && eco < bestBowlEco)) { bestBowlW = bw.wickets; bestBowlEco = eco; bestBowl = p; }
    });
  });

  document.getElementById('best-bat-name').textContent = bestBat || '—';
  if (bestBat) {
    var b1 = inn1.batting[bestBat]||{}, b2 = inn2.batting[bestBat]||{};
    document.getElementById('best-bat-detail').textContent = ((b1.runs||0)+(b2.runs||0)) + ' runs (' + ((b1.balls||0)+(b2.balls||0)) + ' balls)';
  }
  document.getElementById('best-bowl-name').textContent = bestBowl || '—';
  if (bestBowl) {
    var bw1 = inn1.bowling[bestBowl]||{}, bw2 = inn2.bowling[bestBowl]||{};
    var tB = (bw1.balls||0)+(bw2.balls||0), tR = (bw1.runs||0)+(bw2.runs||0);
    document.getElementById('best-bowl-detail').textContent = ((bw1.wickets||0)+(bw2.wickets||0)) + ' wkts • Eco ' + (tB > 0 ? ((tR/tB)*6).toFixed(1) : '0.0');
  }

  var motm = bestBat || bestBowl;
  document.getElementById('motm-name').textContent = motm || '—';
  if (motm === bestBat && bestBat) {
    var bm1=inn1.batting[bestBat]||{}, bm2=inn2.batting[bestBat]||{};
    document.getElementById('motm-detail').textContent = ((bm1.runs||0)+(bm2.runs||0)) + ' runs';
  } else if (bestBowl) {
    document.getElementById('motm-detail').textContent = bestBowlW + ' wickets';
  }

  document.getElementById('fs-title-1').textContent = state['team'+firstBat].name + ' — ' + inn1.runs + '/' + inn1.wickets + ' (' + oF(inn1.balls) + ')';
  document.getElementById('fs-title-2').textContent = state['team'+secondBat].name + ' — ' + inn2.runs + '/' + inn2.wickets + ' (' + oF(inn2.balls) + ')';

  function batRows(inn, id) {
    document.getElementById(id).innerHTML = inn.battingOrder.map(function(p) {
      var b = inn.batting[p], sr = b.balls > 0 ? ((b.runs/b.balls)*100).toFixed(0) : '0';
      return '<tr class="' + (b.status==='out'?'out':'') + '"><td>' + p + '</td><td>' + b.runs + '</td><td>' + b.balls + '</td><td>' + b.fours + '</td><td>' + b.sixes + '</td><td>' + sr + '</td><td>' + (b.status==='out'?'Out':'Not Out') + '</td></tr>';
    }).join('');
  }
  function bowlRows(inn, id) {
    document.getElementById(id).innerHTML = inn.bowlingOrder.map(function(p) {
      var bw = inn.bowling[p], ov = Math.floor(bw.balls/6) + '.' + (bw.balls%6), eco = bw.balls > 0 ? ((bw.runs/bw.balls)*6).toFixed(1) : '0.0';
      return '<tr><td>' + p + '</td><td>' + ov + '</td><td>' + bw.runs + '</td><td>' + bw.wickets + '</td><td>' + eco + '</td></tr>';
    }).join('');
  }
  batRows(inn1,'fs-bat1'); bowlRows(inn1,'fs-bowl1');
  batRows(inn2,'fs-bat2'); bowlRows(inn2,'fs-bowl2');
}

// ============ HISTORY ============
function saveMatchToHistory() {
  var history = JSON.parse(localStorage.getItem('cricscore_history') || '[]');
  var firstBat = state.battingTeam === 'A' ? 'B' : 'A';
  var secondBat = state.battingTeam;
  history.unshift({
    id: Date.now(),
    date: new Date().toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}),
    teamA: state.teamA.name, teamB: state.teamB.name,
    score1: state.innings[0].runs + '/' + state.innings[0].wickets,
    score2: state.innings[1].runs + '/' + state.innings[1].wickets,
    overs: state.totalOvers,
    firstBattingTeam: state['team'+firstBat].name,
    secondBattingTeam: state['team'+secondBat].name,
  });
  if (history.length > 10) history.pop();
  localStorage.setItem('cricscore_history', JSON.stringify(history));
}

function loadHistory() {
  var history = JSON.parse(localStorage.getItem('cricscore_history') || '[]');
  var container = document.getElementById('history-list');
  if (!history.length) { container.innerHTML = '<p class="empty-msg">Abhi koi match record nahi</p>'; return; }
  container.innerHTML = history.map(function(m) {
    return '<div class="history-item"><div class="history-item-title">' + m.teamA + ' vs ' + m.teamB + '</div>' +
      '<div class="history-item-meta">' + m.firstBattingTeam + ': ' + m.score1 + ' | ' + m.secondBattingTeam + ': ' + m.score2 + ' | ' + m.overs + ' ov | ' + m.date + '</div></div>';
  }).join('');
}

// ============ RESET ============
window.confirmReset = function() { document.getElementById('confirm-dialog').style.display = 'flex'; };
window.closeConfirm = function() { document.getElementById('confirm-dialog').style.display = 'none'; };
window.doReset = function() { closeConfirm(); location.reload(); };

window.newMatch = function() {
  var a = state.teamA.name, b = state.teamB.name;
  state = { teamA:{name:a,players:[]}, teamB:{name:b,players:[]}, totalOvers:10, tossWinner:null, tossChoice:null, inning:1, battingTeam:'A', bowlingTeam:'B', innings:[createInningsData(),createInningsData()], matchStarted:false, matchOver:false };
  document.getElementById('teamA-name').value = a;
  document.getElementById('teamB-name').value = b;
  renderPlayerList('A'); renderPlayerList('B');
  document.getElementById('toss-result-display').innerHTML = '';
  document.getElementById('target-meta').style.display = 'none';
  document.getElementById('req-meta').style.display = 'none';
  showScreen('screen-setup');
  loadHistory();
};

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

document.addEventListener('keydown', function(e) {
  if (document.getElementById('screen-match').classList.contains('active')) {
    var modal = document.getElementById('player-select-modal');
    if (modal && modal.style.display !== 'none') return;
    if (['0','1','2','3','4','6'].includes(e.key) && !e.ctrlKey && !e.metaKey) scoreBall(parseInt(e.key));
    if ((e.key==='w'||e.key==='W') && !e.ctrlKey) scoreWicket();
    if (e.key==='z' && (e.ctrlKey||e.metaKey)) { e.preventDefault(); undoLastBall(); }
  }
});
