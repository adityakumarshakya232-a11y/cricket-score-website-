/* ============================================
   CRICSCORE — CRICKET SCORER JS
   Full match management, scoring, stats
   ============================================ */

// ============ STATE ============
let state = {
  // Setup
  teamA: { name: 'Team A', players: [] },
  teamB: { name: 'Team B', players: [] },
  totalOvers: 10,
  tossWinner: null,
  tossChoice: null, // 'bat' or 'bowl'

  // Match
  inning: 1,         // 1 or 2
  battingTeam: 'A',  // 'A' or 'B'
  bowlingTeam: 'B',

  // Innings data [0]=1st, [1]=2nd
  innings: [
    createInningsData(),
    createInningsData()
  ],

  matchStarted: false,
  matchOver: false,
};

let pendingModal = null; // 'striker' | 'nonstriker' | 'bowler' | 'newbatter'

function createInningsData() {
  return {
    runs: 0,
    wickets: 0,
    balls: 0,           // legal balls
    extras: { wides: 0, noballs: 0 },
    batting: {},        // playerName -> { runs, balls, fours, sixes, status }
    bowling: {},        // playerName -> { balls, runs, wickets, wides, noballs }
    striker: null,
    nonStriker: null,
    currentBowler: null,
    overLog: [],        // array of overs, each over = array of ball events
    currentOverBalls: [],
    battingOrder: [],   // names in order of appearance
    bowlingOrder: [],
    ballHistory: [],    // for undo
  };
}

// ============ SETUP HELPERS ============
window.addPlayer = function(team) {
  const input = document.getElementById(`team${team}-player-input`);
  const name = input.value.trim();
  if (!name) return;
  const arr = state[`team${team}`].players;
  if (arr.length >= 11) { alert('Maximum 11 players allowed.'); return; }
  if (arr.includes(name)) { alert('Player name already added.'); return; }
  arr.push(name);
  input.value = '';
  renderPlayerList(team);
  input.focus();
};

function renderPlayerList(team) {
  const list = document.getElementById(`team${team}-player-list`);
  const countEl = document.getElementById(`team${team}-count`);
  const arr = state[`team${team}`].players;
  list.innerHTML = arr.map((p, i) =>
    `<span class="player-tag">
      <span>${i + 1}. ${p}</span>
      <button class="remove-btn" onclick="removePlayer('${team}', ${i})">×</button>
    </span>`
  ).join('');
  countEl.textContent = `${arr.length} / 11 players`;
}

window.removePlayer = function(team, idx) {
  state[`team${team}`].players.splice(idx, 1);
  renderPlayerList(team);
};

// Allow Enter key to add players
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('teamA-player-input').addEventListener('keydown', e => { if (e.key === 'Enter') addPlayer('A'); });
  document.getElementById('teamB-player-input').addEventListener('keydown', e => { if (e.key === 'Enter') addPlayer('B'); });
  document.getElementById('teamA-name').addEventListener('input', updateTossDisplay);
  document.getElementById('teamB-name').addEventListener('input', updateTossDisplay);

  // Overs pills
  document.getElementById('overs-pills').addEventListener('click', e => {
    if (e.target.classList.contains('pill')) {
      document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      e.target.classList.add('active');
      state.totalOvers = parseInt(e.target.dataset.overs);
      document.getElementById('custom-overs').value = '';
    }
  });

  document.getElementById('custom-overs').addEventListener('input', e => {
    const val = parseInt(e.target.value);
    if (val >= 1 && val <= 50) {
      document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      state.totalOvers = val;
    }
  });

  document.getElementById('toss-btn').addEventListener('click', doToss);

  loadHistory();
});

function updateTossDisplay() {
  const a = document.getElementById('teamA-name').value.trim() || 'Team A';
  const b = document.getElementById('teamB-name').value.trim() || 'Team B';
  state.teamA.name = a;
  state.teamB.name = b;

  const tossTeams = document.getElementById('toss-teams-display');
  if (state.tossWinner) return;
  tossTeams.innerHTML = `<p class="toss-prompt">Set teams and click "Do Toss"</p>`;
}

// ============ TOSS ============
function doToss() {
  state.teamA.name = document.getElementById('teamA-name').value.trim() || 'Team A';
  state.teamB.name = document.getElementById('teamB-name').value.trim() || 'Team B';

  const winner = Math.random() < 0.5 ? 'A' : 'B';
  const choice = Math.random() < 0.5 ? 'bat' : 'bowl';
  state.tossWinner = winner;
  state.tossChoice = choice;

  const winnerName = state[`team${winner}`].name;
  const loserName = state[`team${winner === 'A' ? 'B' : 'A'}`].name;

  if (choice === 'bat') {
    state.battingTeam = winner;
    state.bowlingTeam = winner === 'A' ? 'B' : 'A';
  } else {
    state.bowlingTeam = winner;
    state.battingTeam = winner === 'A' ? 'B' : 'A';
  }

  const tossResult = document.getElementById('toss-result');
  tossResult.textContent = `🎲 ${winnerName} won the toss and chose to ${choice} first`;

  const tossTeams = document.getElementById('toss-teams-display');
  tossTeams.innerHTML = `
    <div style="text-align:center; padding:8px 0;">
      <div style="font-size:15px; font-weight:700; color:var(--gold)">
        ${winnerName} won the toss
      </div>
      <div style="font-size:13px; color:var(--text-secondary); margin-top:4px">
        Elected to ${choice} first
      </div>
      <div style="font-size:12px; color:var(--text-dim); margin-top:4px">
        ${state[`team${state.battingTeam}`].name} will bat first
      </div>
    </div>
  `;
}

// ============ START MATCH ============
window.startMatch = function() {
  state.teamA.name = document.getElementById('teamA-name').value.trim() || 'Team A';
  state.teamB.name = document.getElementById('teamB-name').value.trim() || 'Team B';

  const minPlayers = 2; // allow quick park cricket
  if (state.teamA.players.length < minPlayers) {
    alert(`Add at least ${minPlayers} players for ${state.teamA.name}`);
    return;
  }
  if (state.teamB.players.length < minPlayers) {
    alert(`Add at least ${minPlayers} players for ${state.teamB.name}`);
    return;
  }

  // Initialize innings
  state.innings = [createInningsData(), createInningsData()];
  state.inning = 1;
  state.matchStarted = true;
  state.matchOver = false;

  showScreen('screen-match');
  updateInningsBanner();
  updateLabels();

  // Pick initial players
  promptSelectPlayer('striker');
};

function updateInningsBanner() {
  const inningEl = document.getElementById('innings-label');
  const batEl = document.getElementById('batting-team-label');
  const suffix = state.inning === 1 ? '1ST' : '2ND';
  inningEl.textContent = `${suffix} INNINGS`;
  batEl.textContent = `${state[`team${state.battingTeam}`].name} Batting`;
}

function updateLabels() {
  document.getElementById('teamA-card-label').textContent = `${state.teamA.name} — PLAYERS`;
  document.getElementById('teamB-card-label').textContent = `${state.teamB.name} — PLAYERS`;
}

// ============ PLAYER SELECTION MODAL ============
function promptSelectPlayer(type, callback) {
  pendingModal = type;
  const inning = state.innings[state.inning - 1];
  const team = type === 'bowler'
    ? state[`team${state.bowlingTeam}`].players
    : state[`team${state.battingTeam}`].players;

  let available;
  if (type === 'bowler') {
    // exclude current bowler if last 2 overs check
    const currentBowler = inning.currentBowler;
    available = team.filter(p => {
      if (!inning.bowling[p]) return true;
      return true; // allow bowl again (simple rule)
    });
    // last bowler can't bowl consecutive
    const lastOverBowler = getLastOverBowler();
    if (lastOverBowler) {
      available = available.filter(p => p !== lastOverBowler || available.length === 1);
    }
  } else {
    // batting: exclude already out players and current batsmen
    available = team.filter(p => {
      const bat = inning.batting[p];
      if (bat && bat.status && bat.status !== 'batting') return false;
      if (p === inning.striker || p === inning.nonStriker) return false;
      return true;
    });
  }

  if (available.length === 0) {
    available = team; // fallback
  }

  const titles = {
    striker: 'Select Striker',
    nonstriker: 'Select Non-Striker',
    bowler: 'Select Bowler',
    newbatter: 'New Batsman Coming In',
  };

  document.getElementById('modal-title').textContent = titles[type] || 'Select Player';
  const listEl = document.getElementById('modal-player-list');
  listEl.innerHTML = available.map(p =>
    `<button class="modal-player-btn" onclick="selectPlayer('${p.replace(/'/g, "\\'")}')">${p}</button>`
  ).join('');

  document.getElementById('player-select-modal').style.display = 'flex';
}

window.selectPlayer = function(name) {
  document.getElementById('player-select-modal').style.display = 'none';
  const inning = state.innings[state.inning - 1];

  if (pendingModal === 'striker') {
    inning.striker = name;
    ensureBatter(name);
    if (!inning.nonStriker) {
      promptSelectPlayer('nonstriker');
    } else if (!inning.currentBowler) {
      promptSelectPlayer('bowler');
    } else {
      updateUI();
    }
  } else if (pendingModal === 'nonstriker') {
    inning.nonStriker = name;
    ensureBatter(name);
    if (!inning.currentBowler) {
      promptSelectPlayer('bowler');
    } else {
      updateUI();
    }
  } else if (pendingModal === 'bowler') {
    inning.currentBowler = name;
    ensureBowler(name);
    updateUI();
  } else if (pendingModal === 'newbatter') {
    inning.striker = name;
    ensureBatter(name);
    updateUI();
  }
  pendingModal = null;
};

function ensureBatter(name) {
  const inning = state.innings[state.inning - 1];
  if (!inning.batting[name]) {
    inning.batting[name] = { runs: 0, balls: 0, fours: 0, sixes: 0, status: 'batting' };
    inning.battingOrder.push(name);
  }
}

function ensureBowler(name) {
  const inning = state.innings[state.inning - 1];
  if (!inning.bowling[name]) {
    inning.bowling[name] = { balls: 0, runs: 0, wickets: 0, wides: 0, noballs: 0 };
    inning.bowlingOrder.push(name);
  }
}

// ============ SCORING ============
window.scoreBall = function(runs) {
  const inning = state.innings[state.inning - 1];
  if (!inning.striker || !inning.currentBowler) {
    alert('Please select all players first.');
    return;
  }

  // Save for undo
  saveForUndo();

  // Add to runs
  inning.runs += runs;
  inning.batting[inning.striker].runs += runs;
  inning.batting[inning.striker].balls++;
  inning.bowling[inning.currentBowler].runs += runs;
  inning.bowling[inning.currentBowler].balls++;
  inning.balls++;

  if (runs === 4) inning.batting[inning.striker].fours++;
  if (runs === 6) inning.batting[inning.striker].sixes++;

  // Over ball log
  const ballEvent = { type: runs === 0 ? 'dot' : `run-${runs}`, display: String(runs), runs, legal: true };
  inning.currentOverBalls.push(ballEvent);

  // Sound effects
  if (runs === 4) playSound('boundary');
  if (runs === 6) playSound('six');

  // Flash
  if (runs === 4) flashScreen('boundary-flash');
  if (runs === 6) flashScreen('six-flash');

  // Animate score
  animateScore();

  // Rotate strike on odd runs
  if (runs % 2 === 1) rotateStrike();

  // Check over complete
  if (inning.currentOverBalls.length === 6) {
    endOver();
  } else {
    updateUI();
  }

  // Check innings over
  checkInningsOver();
};

window.scoreWicket = function() {
  const inning = state.innings[state.inning - 1];
  if (!inning.striker) return;

  saveForUndo();

  inning.wickets++;
  inning.batting[inning.striker].status = 'out';
  inning.batting[inning.striker].balls++;
  inning.bowling[inning.currentBowler].wickets++;
  inning.bowling[inning.currentBowler].balls++;
  inning.balls++;

  const ballEvent = { type: 'wicket', display: 'W', runs: 0, legal: true };
  inning.currentOverBalls.push(ballEvent);

  animateScore();

  const maxWickets = state[`team${state.battingTeam}`].players.length - 1;
  if (inning.wickets >= maxWickets) {
    // All out
    if (inning.currentOverBalls.length === 6) endOver();
    else updateUI();
    checkInningsOver(true);
    return;
  }

  if (inning.currentOverBalls.length === 6) {
    endOver();
  } else {
    updateUI();
  }

  // New batsman
  promptSelectPlayer('newbatter');
};

window.scoreExtra = function(type) {
  const inning = state.innings[state.inning - 1];
  if (!inning.currentBowler) return;

  saveForUndo();

  inning.runs++;
  inning.extras[type === 'wide' ? 'wides' : 'noballs']++;
  inning.bowling[inning.currentBowler].runs++;
  if (type === 'wide') inning.bowling[inning.currentBowler].wides++;
  else inning.bowling[inning.currentBowler].noballs++;

  // Extras do NOT count as legal ball
  const ballEvent = { type, display: type === 'wide' ? 'Wd' : 'Nb', runs: 1, legal: false };
  inning.currentOverBalls.push(ballEvent);

  animateScore();
  updateUI();
  checkInningsOver();
};

window.undoLastBall = function() {
  const inning = state.innings[state.inning - 1];
  if (!inning.ballHistory || inning.ballHistory.length === 0) return;

  const snap = inning.ballHistory.pop();
  // Restore snapshot
  Object.assign(state.innings[state.inning - 1], JSON.parse(snap));
  updateUI();
};

function saveForUndo() {
  const inning = state.innings[state.inning - 1];
  if (!inning.ballHistory) inning.ballHistory = [];
  // Deep clone
  const snap = JSON.stringify({
    runs: inning.runs, wickets: inning.wickets, balls: inning.balls,
    extras: { ...inning.extras },
    batting: JSON.parse(JSON.stringify(inning.batting)),
    bowling: JSON.parse(JSON.stringify(inning.bowling)),
    striker: inning.striker, nonStriker: inning.nonStriker,
    currentBowler: inning.currentBowler,
    currentOverBalls: [...inning.currentOverBalls],
    overLog: JSON.parse(JSON.stringify(inning.overLog)),
    battingOrder: [...inning.battingOrder],
    bowlingOrder: [...inning.bowlingOrder],
  });
  inning.ballHistory.push(snap);
  if (inning.ballHistory.length > 20) inning.ballHistory.shift();
}

// ============ OVER MANAGEMENT ============
function endOver() {
  const inning = state.innings[state.inning - 1];
  inning.overLog.push([...inning.currentOverBalls]);
  inning.currentOverBalls = [];

  // Rotate strike at end of over
  rotateStrike();

  updateUI();

  const completedOvers = Math.floor(inning.balls / 6);
  if (completedOvers >= state.totalOvers) {
    checkInningsOver(false, true);
    return;
  }

  // New bowler
  promptSelectPlayer('bowler');
}

function getLastOverBowler() {
  const inning = state.innings[state.inning - 1];
  if (inning.overLog.length === 0) return null;
  // We track by bowlingOrder last used
  return inning._lastOverBowler || null;
}

function rotateStrike() {
  const inning = state.innings[state.inning - 1];
  const temp = inning.striker;
  inning.striker = inning.nonStriker;
  inning.nonStriker = temp;
}

// ============ INNINGS / MATCH CONTROL ============
function checkInningsOver(allOut = false, oversComplete = false) {
  const inning = state.innings[state.inning - 1];
  const maxWickets = state[`team${state.battingTeam}`].players.length - 1;
  const legalOvers = Math.floor(inning.balls / 6);

  let end = allOut || oversComplete || (inning.wickets >= maxWickets) || (legalOvers >= state.totalOvers);

  if (!end) return;

  if (state.inning === 1) {
    // Check if 2nd innings team can win (already past target)
    // Just start 2nd innings
    startSecondInnings();
  } else {
    // Match over
    endMatch();
  }
}

function startSecondInnings() {
  state.inning = 2;
  state.battingTeam = state.battingTeam === 'A' ? 'B' : 'A';
  state.bowlingTeam = state.bowlingTeam === 'A' ? 'B' : 'A';
  state.innings[1] = createInningsData();
  updateInningsBanner();

  const target = state.innings[0].runs + 1;
  document.getElementById('target-meta').style.display = 'flex';
  document.getElementById('target-display').textContent = target;
  document.getElementById('req-meta').style.display = 'flex';

  // Brief banner
  showInningsBannerMsg(`${state[`team${state.battingTeam}`].name} needs ${target} to win`);

  promptSelectPlayer('striker');
}

function showInningsBannerMsg(msg) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.8);
    display:flex;align-items:center;justify-content:center;
    z-index:2000;flex-direction:column;gap:12px;
  `;
  overlay.innerHTML = `
    <div style="font-family:var(--font-display);font-size:clamp(18px,5vw,28px);font-weight:800;color:var(--gold);letter-spacing:2px;text-align:center;padding:0 20px">${msg}</div>
    <button onclick="this.parentNode.remove()" style="background:rgba(0,210,120,0.15);border:1px solid var(--green);color:var(--green);font-family:var(--font-display);font-size:14px;font-weight:700;letter-spacing:2px;padding:10px 24px;border-radius:8px;cursor:pointer">CONTINUE →</button>
  `;
  document.body.appendChild(overlay);
}

// In 2nd innings check if target reached after each ball
function checkTargetReached() {
  if (state.inning !== 2) return false;
  const target = state.innings[0].runs + 1;
  const current = state.innings[1].runs;
  if (current >= target) {
    endMatch();
    return true;
  }
  return false;
}

function endMatch() {
  state.matchOver = true;
  // Save to history
  saveMatchToHistory();
  // Show summary
  setTimeout(() => showSummary(), 400);
}

// ============ UI UPDATES ============
function updateUI() {
  const inning = state.innings[state.inning - 1];

  // Score
  document.getElementById('score-runs').textContent = inning.runs;
  document.getElementById('score-wickets').textContent = inning.wickets;

  // Overs
  const legalBalls = inning.balls;
  const overs = Math.floor(legalBalls / 6);
  const balls = legalBalls % 6;
  document.getElementById('overs-display').textContent = `${overs}.${balls}`;

  // Run rate
  const rr = legalBalls > 0 ? ((inning.runs / legalBalls) * 6).toFixed(2) : '0.00';
  document.getElementById('rr-display').textContent = rr;

  // Required rate
  if (state.inning === 2) {
    const target = state.innings[0].runs + 1;
    const remaining = target - inning.runs;
    const ballsLeft = (state.totalOvers * 6) - legalBalls;
    const reqRR = ballsLeft > 0 ? ((remaining / ballsLeft) * 6).toFixed(2) : '—';
    document.getElementById('req-display').textContent = reqRR;
  }

  // Over dots
  renderOverDots(inning);

  // Players
  if (inning.striker) {
    document.getElementById('striker-name').textContent = inning.striker;
    const b = inning.batting[inning.striker];
    if (b) {
      const sr = b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(0) : '0';
      document.getElementById('striker-stats').textContent = `${b.runs} (${b.balls}) • SR: ${sr}`;
    }
  }
  if (inning.nonStriker) {
    document.getElementById('nonstriker-name').textContent = inning.nonStriker;
    const b = inning.batting[inning.nonStriker];
    if (b) {
      const sr = b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(0) : '0';
      document.getElementById('nonstriker-stats').textContent = `${b.runs} (${b.balls}) • SR: ${sr}`;
    }
  }
  if (inning.currentBowler) {
    document.getElementById('bowler-name').textContent = inning.currentBowler;
    const bw = inning.bowling[inning.currentBowler];
    if (bw) {
      const bwOvers = `${Math.floor(bw.balls / 6)}.${bw.balls % 6}`;
      const eco = bw.balls > 0 ? ((bw.runs / bw.balls) * 6).toFixed(1) : '0.0';
      document.getElementById('bowler-stats').textContent = `${bw.wickets}/${bw.runs} • Eco: ${eco}`;
    }
  }

  renderBattingTab(inning);
  renderBowlingTab(inning);
  renderBallLog(inning);

  // Check target reached in 2nd innings
  if (state.inning === 2) {
    checkTargetReached();
  }
}

function renderOverDots(inning) {
  const container = document.getElementById('over-dots');
  const legalCount = inning.currentOverBalls.filter(b => b.legal).length;
  document.getElementById('over-balls-label').textContent = `${legalCount} / 6 balls`;

  container.innerHTML = inning.currentOverBalls.map(ball =>
    `<div class="ball-dot ${ball.type}">${ball.display}</div>`
  ).join('');
}

function renderBattingTab(inning) {
  const tbody = document.getElementById('batting-tbody');
  tbody.innerHTML = inning.battingOrder.map(p => {
    const b = inning.batting[p];
    const sr = b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(0) : '0';
    const isStriker = p === inning.striker;
    const isNS = p === inning.nonStriker;
    const isOut = b.status === 'out';
    let cls = '';
    if (isStriker) cls = 'current-bat';
    if (isOut) cls = 'out';
    const indicator = isStriker ? ' ⚡' : (isNS ? ' •' : '');
    return `<tr class="${cls}">
      <td>${p}${indicator}</td>
      <td>${b.runs}</td>
      <td>${b.balls}</td>
      <td>${b.fours}</td>
      <td>${b.sixes}</td>
      <td>${sr}</td>
    </tr>`;
  }).join('');
}

function renderBowlingTab(inning) {
  const tbody = document.getElementById('bowling-tbody');
  tbody.innerHTML = inning.bowlingOrder.map(p => {
    const bw = inning.bowling[p];
    const overs = `${Math.floor(bw.balls / 6)}.${bw.balls % 6}`;
    const eco = bw.balls > 0 ? ((bw.runs / bw.balls) * 6).toFixed(1) : '0.0';
    const isCurrent = p === inning.currentBowler;
    return `<tr class="${isCurrent ? 'current-bowl' : ''}">
      <td>${p}${isCurrent ? ' 🎯' : ''}</td>
      <td>${overs}</td>
      <td>${bw.runs}</td>
      <td>${bw.wickets}</td>
      <td>${eco}</td>
    </tr>`;
  }).join('');
}

function renderBallLog(inning) {
  const container = document.getElementById('ball-log');
  let html = '';
  // Past overs
  inning.overLog.forEach((over, i) => {
    const runs = over.reduce((sum, b) => sum + b.runs, 0);
    html += `<div class="ball-log-over">
      <div class="ball-log-over-header">OVER ${i + 1} — ${runs} runs</div>
      <div class="ball-log-balls">
        ${over.map(b => `<div class="ball-dot ${b.type}">${b.display}</div>`).join('')}
      </div>
    </div>`;
  });
  // Current over
  if (inning.currentOverBalls.length > 0) {
    const curRuns = inning.currentOverBalls.reduce((sum, b) => sum + b.runs, 0);
    html += `<div class="ball-log-over">
      <div class="ball-log-over-header">CURRENT OVER — ${curRuns} runs</div>
      <div class="ball-log-balls">
        ${inning.currentOverBalls.map(b => `<div class="ball-dot ${b.type}">${b.display}</div>`).join('')}
      </div>
    </div>`;
  }
  container.innerHTML = html || '<p style="color:var(--text-dim);font-size:13px;text-align:center;padding:16px">No balls bowled yet</p>';
}

// ============ TABS ============
window.switchTab = function(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelector(`[onclick="switchTab('${tab}')"]`).classList.add('active');
  document.getElementById(`tab-${tab}`).classList.add('active');
};

// ============ ANIMATIONS ============
function animateScore() {
  const el = document.getElementById('score-runs');
  el.classList.remove('score-pop');
  void el.offsetWidth;
  el.classList.add('score-pop');
}

function flashScreen(cls) {
  const body = document.querySelector('#screen-match');
  body.classList.remove('boundary-flash', 'six-flash');
  void body.offsetWidth;
  body.classList.add(cls);
  setTimeout(() => body.classList.remove(cls), 700);
}

// ============ SOUNDS ============
function playSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'boundary') {
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } else if (type === 'six') {
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(698, ctx.currentTime + 0.08);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.16);
      osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.24);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.7);
    }
  } catch (e) { /* silent fail */ }
}

// ============ MATCH SUMMARY ============
function showSummary() {
  showScreen('screen-summary');

  const inn1 = state.innings[0];
  const inn2 = state.innings[1];
  const bat1Team = state.inning === 1 ? state.battingTeam : (state.battingTeam === 'A' ? 'B' : 'A');

  // First innings team
  const firstTeamKey = inn1._battingTeam || state.battingTeam;

  // Determine winner
  let winnerText, winnerMargin;
  const score1 = inn1.runs;
  const score2 = inn2.runs;
  const maxWickets2 = state[`team${state.battingTeam}`].players.length - 1;

  if (score2 > score1) {
    const remaining = maxWickets2 - inn2.wickets;
    winnerText = `${state[`team${state.battingTeam}`].name} won!`;
    winnerMargin = `by ${remaining} wicket${remaining !== 1 ? 's' : ''}`;
  } else if (score1 > score2) {
    const diff = score1 - score2;
    const firstBatTeam = state.battingTeam === 'A' ? 'B' : 'A';
    winnerText = `${state[`team${firstBatTeam}`].name} won!`;
    winnerMargin = `by ${diff} run${diff !== 1 ? 's' : ''}`;
  } else {
    winnerText = 'Match Tied!';
    winnerMargin = 'Both teams scored equally';
  }

  document.getElementById('winner-text').textContent = winnerText;
  document.getElementById('winner-margin').textContent = winnerMargin;

  // Scores display
  const firstBattingTeam = state.inning === 2 ? (state.battingTeam === 'A' ? 'B' : 'A') : state.battingTeam;
  const secondBattingTeam = state.battingTeam;

  function overs(balls) {
    return `${Math.floor(balls / 6)}.${balls % 6} ov`;
  }

  document.getElementById('summary-team1').innerHTML = `
    <div class="summary-team-name">${state[`team${firstBattingTeam}`].name}</div>
    <div class="summary-team-runs">${inn1.runs}/${inn1.wickets}</div>
    <div class="summary-team-overs">${overs(inn1.balls)}</div>
  `;
  document.getElementById('summary-team2').innerHTML = `
    <div class="summary-team-name">${state[`team${secondBattingTeam}`].name}</div>
    <div class="summary-team-runs">${inn2.runs}/${inn2.wickets}</div>
    <div class="summary-team-overs">${overs(inn2.balls)}</div>
  `;

  // Best batsman (across both innings)
  let bestBat = null, bestBatRuns = -1, bestBatTeam = '';
  [inn1, inn2].forEach((inn, i) => {
    Object.entries(inn.batting).forEach(([p, b]) => {
      if (b.runs > bestBatRuns) {
        bestBatRuns = b.runs;
        bestBat = p;
        bestBatTeam = state[`team${i === 0 ? firstBattingTeam : secondBattingTeam}`].name;
      }
    });
  });

  // Best bowler
  let bestBowl = null, bestBowlWkts = -1, bestBowlEco = 999;
  [inn1, inn2].forEach(inn => {
    Object.entries(inn.bowling).forEach(([p, bw]) => {
      if (bw.wickets > bestBowlWkts || (bw.wickets === bestBowlWkts && (bw.balls > 0 ? bw.runs / bw.balls : 0) < bestBowlEco)) {
        bestBowlWkts = bw.wickets;
        bestBowlEco = bw.balls > 0 ? bw.runs / bw.balls : 0;
        bestBowl = p;
      }
    });
  });

  document.getElementById('best-bat-name').textContent = bestBat || '—';
  if (bestBat) {
    const b1 = inn1.batting[bestBat] || {};
    const b2 = inn2.batting[bestBat] || {};
    const totalR = (b1.runs || 0) + (b2.runs || 0);
    const totalB = (b1.balls || 0) + (b2.balls || 0);
    document.getElementById('best-bat-detail').textContent = `${totalR} runs (${totalB} balls)`;
  }

  document.getElementById('best-bowl-name').textContent = bestBowl || '—';
  if (bestBowl) {
    const bw1 = inn1.bowling[bestBowl] || {};
    const bw2 = inn2.bowling[bestBowl] || {};
    const totalW = (bw1.wickets || 0) + (bw2.wickets || 0);
    const totalR = (bw1.runs || 0) + (bw2.runs || 0);
    const totalB = (bw1.balls || 0) + (bw2.balls || 0);
    const eco = totalB > 0 ? ((totalR / totalB) * 6).toFixed(1) : '0.0';
    document.getElementById('best-bowl-detail').textContent = `${totalW} wkts • Eco ${eco}`;
  }

  // Man of the Match (best batsman by default, else best bowler)
  const motm = bestBat || bestBowl;
  document.getElementById('motm-name').textContent = motm || '—';
  if (motm === bestBat && bestBat) {
    const b1 = inn1.batting[bestBat] || {};
    const b2 = inn2.batting[bestBat] || {};
    const totalR = (b1.runs || 0) + (b2.runs || 0);
    document.getElementById('motm-detail').textContent = `${totalR} runs`;
  } else if (motm === bestBowl && bestBowl) {
    document.getElementById('motm-detail').textContent = `${bestBowlWkts} wickets`;
  }

  // Full scorecards
  document.getElementById('fs-title-1').textContent =
    `${state[`team${firstBattingTeam}`].name} — ${inn1.runs}/${inn1.wickets} (${overs(inn1.balls)})`;
  document.getElementById('fs-title-2').textContent =
    `${state[`team${secondBattingTeam}`].name} — ${inn2.runs}/${inn2.wickets} (${overs(inn2.balls)})`;

  function buildBatRows(inn, tbody) {
    document.getElementById(tbody).innerHTML = inn.battingOrder.map(p => {
      const b = inn.batting[p];
      const sr = b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(0) : '0';
      const status = b.status === 'out' ? 'Out' : b.status === 'batting' ? 'Not Out' : 'DNB';
      return `<tr class="${b.status === 'out' ? 'out' : ''}">
        <td>${p}</td><td>${b.runs}</td><td>${b.balls}</td>
        <td>${b.fours}</td><td>${b.sixes}</td><td>${sr}</td><td>${status}</td>
      </tr>`;
    }).join('');
  }

  function buildBowlRows(inn, tbody) {
    document.getElementById(tbody).innerHTML = inn.bowlingOrder.map(p => {
      const bw = inn.bowling[p];
      const ov = `${Math.floor(bw.balls / 6)}.${bw.balls % 6}`;
      const eco = bw.balls > 0 ? ((bw.runs / bw.balls) * 6).toFixed(1) : '0.0';
      return `<tr>
        <td>${p}</td><td>${ov}</td><td>${bw.runs}</td><td>${bw.wickets}</td><td>${eco}</td>
      </tr>`;
    }).join('');
  }

  buildBatRows(inn1, 'fs-bat1');
  buildBowlRows(inn1, 'fs-bowl1');
  buildBatRows(inn2, 'fs-bat2');
  buildBowlRows(inn2, 'fs-bowl2');
}

// ============ LOCAL STORAGE / HISTORY ============
function saveMatchToHistory() {
  const history = JSON.parse(localStorage.getItem('cricscore_history') || '[]');
  const inn1 = state.innings[0];
  const inn2 = state.innings[1];
  const firstBattingTeam = state.inning === 2 ? (state.battingTeam === 'A' ? 'B' : 'A') : state.battingTeam;
  const secondBattingTeam = state.battingTeam;

  const entry = {
    id: Date.now(),
    date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    teamA: state.teamA.name,
    teamB: state.teamB.name,
    score1: `${inn1.runs}/${inn1.wickets}`,
    score2: `${inn2.runs}/${inn2.wickets}`,
    overs: state.totalOvers,
    firstBattingTeam: state[`team${firstBattingTeam}`].name,
    secondBattingTeam: state[`team${secondBattingTeam}`].name,
  };

  history.unshift(entry);
  if (history.length > 10) history.pop();
  localStorage.setItem('cricscore_history', JSON.stringify(history));
}

function loadHistory() {
  const history = JSON.parse(localStorage.getItem('cricscore_history') || '[]');
  const container = document.getElementById('history-list');
  if (history.length === 0) {
    container.innerHTML = '<p class="empty-msg">No matches recorded yet</p>';
    return;
  }
  container.innerHTML = history.map(m =>
    `<div class="history-item">
      <div class="history-item-title">${m.teamA} vs ${m.teamB}</div>
      <div class="history-item-meta">${m.firstBattingTeam}: ${m.score1} &nbsp;|&nbsp; ${m.secondBattingTeam}: ${m.score2} &nbsp;|&nbsp; ${m.overs} overs &nbsp;|&nbsp; ${m.date}</div>
    </div>`
  ).join('');
}

// ============ RESET ============
window.confirmReset = function() {
  document.getElementById('confirm-dialog').style.display = 'flex';
};

window.closeConfirm = function() {
  document.getElementById('confirm-dialog').style.display = 'none';
};

window.doReset = function() {
  closeConfirm();
  location.reload();
};

window.newMatch = function() {
  // Reset state but keep team names
  const a = state.teamA.name;
  const b = state.teamB.name;

  state = {
    teamA: { name: a, players: [] },
    teamB: { name: b, players: [] },
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

  // Reset form
  document.getElementById('teamA-name').value = a;
  document.getElementById('teamB-name').value = b;
  renderPlayerList('A');
  renderPlayerList('B');
  document.getElementById('toss-result').textContent = '';
  document.getElementById('toss-teams-display').innerHTML = '<p class="toss-prompt">Set teams first to do the toss</p>';
  document.getElementById('target-meta').style.display = 'none';
  document.getElementById('req-meta').style.display = 'none';

  showScreen('screen-setup');
  loadHistory();
};

// ============ SCREEN MANAGEMENT ============
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

// ============ KEYBOARD SHORTCUTS ============
document.addEventListener('keydown', e => {
  if (document.getElementById('screen-match').classList.contains('active')) {
    const map = { '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '6': 6 };
    if (map[e.key] !== undefined && !e.ctrlKey && !e.metaKey) {
      scoreBall(map[e.key]);
    }
    if (e.key === 'w' || e.key === 'W') scoreWicket();
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) undoLastBall();
  }
});
