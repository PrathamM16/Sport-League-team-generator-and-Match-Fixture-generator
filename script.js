let employeeData = [];
let teamsData = [];
let fixturesData = null;
let currentTournamentType = null;
let fixtures8Data = null;
let fixtures16Data = null;

const fileInput = document.getElementById('fileInput');
const uploadSection = document.getElementById('uploadSection');

/* ===========================
   File Upload Event Listeners
   =========================== */
if (fileInput) {
  fileInput.addEventListener('change', handleFileSelect);
}

if (uploadSection) {
  uploadSection.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadSection.classList.add('dragover');
  });

  uploadSection.addEventListener('dragleave', () => {
    uploadSection.classList.remove('dragover');
  });

  uploadSection.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadSection.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFile(files[0]);
  });
}

/* ===========================
   File Handling Functions
   =========================== */
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) handleFile(file);
}

function handleFile(file) {
  if (!file.name.match(/\.(xlsx|xls)$/)) {
    showError('Please select a valid Excel file (.xlsx or .xls)');
    return;
  }
  showLoading();

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);

      processExcelData(jsonData);
    } catch (error) {
      showError('Error reading Excel file: ' + error.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

function processExcelData(data) {
  if (data.length === 0) {
    showError('Excel file is empty');
    return;
  }

  // Validate columns
  const firstRow = data[0];
  const hasRequiredColumns = Object.keys(firstRow).some((key) => {
    const k = key.toLowerCase();
    return k.includes('male') || k.includes('female') || k.includes('intern');
  });

  if (!hasRequiredColumns) {
    showError('Excel must contain Male and/or Female and/or Interns columns');
    return;
  }

  // Parse rows
  employeeData = [];
  let maleCount = 0,
    femaleCount = 0,
    internCount = 0;

  data.forEach((row, index) => {
    const keys = Object.keys(row);
    let maleName = '',
      femaleName = '',
      internName = '';

    keys.forEach((key) => {
      const k = key.toLowerCase();
      if (k.includes('male') && !k.includes('female')) maleName = row[key];
      else if (k.includes('female')) femaleName = row[key];
      else if (k.includes('intern')) internName = row[key];
    });

    if (maleName && maleName.toString().trim() !== '') {
      employeeData.push({
        name: maleName.toString().trim(),
        gender: 'male',
        originalIndex: index,
      });
      maleCount++;
    }
    if (femaleName && femaleName.toString().trim() !== '') {
      employeeData.push({
        name: femaleName.toString().trim(),
        gender: 'female',
        originalIndex: index,
      });
      femaleCount++;
    }
    if (internName && internName.toString().trim() !== '') {
      employeeData.push({
        name: internName.toString().trim(),
        gender: 'intern',
        originalIndex: index,
      });
      internCount++;
    }
  });

  if (employeeData.length === 0) {
    showError('No valid data found in the Excel file');
    return;
  }

  // Start team creation with animation
  hideLoading();
  startTeamCreationAnimation(maleCount, femaleCount, internCount);
}

/* =========================================
   Team Creation Animation (unchanged logic)
   ========================================= */
function startTeamCreationAnimation(maleCount, femaleCount, internCount) {
  const animationContainer = document.getElementById('animationContainer');
  if (animationContainer) {
    animationContainer.style.display = 'flex';
  }

  // Generate teams first
  generateTeams();

  // Update animation header to show progress
  const animationHeader = document.querySelector('.animation-header');
  if (animationHeader) {
    const totalMembers = employeeData.length;
    animationHeader.innerHTML = `
      <div class="processing-spinner"></div>
      <div>🎯 Creating Balanced Teams...</div>
      <div style="font-size: 0.7em; margin-top: 10px; opacity: 0.9;">
        Assigning ${totalMembers} people to teams (${maleCount} males, ${femaleCount} females, ${internCount} interns)
      </div>
    `;
  }

  // Start the animation sequence
  setTimeout(() => {
    animateTeamCreation().then(() => {
      if (animationContainer) {
        animationContainer.style.display = 'none';
      }
      updateStatistics(employeeData.length, maleCount, femaleCount, internCount);
      displayTeams();
      showSuccess(
        `Successfully processed ${employeeData.length} people and created 4 balanced teams!`
      );

      const fixtureSection = document.getElementById('fixtureSection');
      if (fixtureSection) {
        fixtureSection.classList.remove('hidden');
      }
    });
  }, 2000);
}

async function animateTeamCreation() {
  const teamColumns = ['animAlpha', 'animBeta', 'animGamma', 'animDelta'];
  const teamNames = ['Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta'];
  const teamSpinners = document.querySelectorAll('.team-spinner');

  setTimeout(() => {
    teamSpinners.forEach((spinner) => (spinner.style.display = 'none'));
  }, 1000);

  const animationElement = document.querySelector('.team-creation-animation');
  if (!animationElement) {
    return Promise.resolve();
  }

  const centerDisplay = document.createElement('div');
  centerDisplay.className = 'center-name-display';
  centerDisplay.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    padding: 30px 50px;
    border-radius: 20px;
    font-size: 2em;
    font-weight: bold;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    z-index: 200;
    display: none;
    text-align: center;
    min-width: 300px;
    border: 3px solid white;
  `;
  animationElement.appendChild(centerDisplay);

  const allMembers = [];
  teamsData.forEach((team, teamIndex) => {
    team.members.forEach((member) => {
      allMembers.push({
        ...member,
        targetTeam: teamIndex,
        targetTeamName: teamNames[teamIndex],
      });
    });
  });

  shuffleArray(allMembers);

  for (let i = 0; i < allMembers.length; i++) {
    const member = allMembers[i];
    const targetColumn = document.getElementById(teamColumns[member.targetTeam]);
    if (!targetColumn) continue;

    centerDisplay.innerHTML = `
      <div style="margin-bottom: 15px; font-size: 1.2em;">
        ${member.name}
      </div>
      <div style="font-size: 0.6em; opacity: 0.9;">
        ${
          member.gender === 'female'
            ? '👩‍💼 Female'
            : member.gender === 'male'
            ? '👨‍💼 Male'
            : '🧑‍💻 Intern'
        }
      </div>
    `;

    centerDisplay.style.display = 'block';
    centerDisplay.style.animation = 'nameAppear 0.5s ease-out';
    await new Promise((resolve) => setTimeout(resolve, 3000));

    centerDisplay.innerHTML = `
      <div style="margin-bottom: 15px; font-size: 1.2em;">
        ${member.name}
      </div>
      <div style="font-size: 0.7em; opacity: 0.9; margin-bottom: 10px;">
        ${
          member.gender === 'female'
            ? '👩‍💼 Female'
            : member.gender === 'male'
            ? '👨‍💼 Male'
            : '🧑‍💻 Intern'
        }
      </div>
      <div style="font-size: 0.8em; background: rgba(255,255,255,0.2); padding: 10px; border-radius: 10px;">
        → Going to ${member.targetTeamName}
      </div>
    `;
    await new Promise((resolve) => setTimeout(resolve, 1000));

    centerDisplay.style.display = 'none';

    const flyingName = document.createElement('div');
    flyingName.className = 'flying-name-slow';
    flyingName.innerHTML = `
      <div style="font-weight: bold;">${member.name}</div>
      <div style="font-size: 0.8em; opacity: 0.9;">
        ${
          member.gender === 'female'
            ? '👩‍💼'
            : member.gender === 'male'
            ? '👨‍💼'
            : '🧑‍💻'
        }
      </div>
    `;
    flyingName.style.cssText = `
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #ffd700, #ff6b6b);
      color: white;
      padding: 15px 20px;
      border-radius: 15px;
      font-weight: 600;
      font-size: 1em;
      box-shadow: 0 5px 20px rgba(0,0,0,0.3);
      z-index: 100;
      text-align: center;
      min-width: 120px;
      border: 2px solid white;
    `;
    animationElement.appendChild(flyingName);

    const targetRect = targetColumn.getBoundingClientRect();
    const containerRect = animationElement.getBoundingClientRect();
    const targetX = targetRect.left - containerRect.left + targetRect.width / 2;
    const targetY = targetRect.top - containerRect.top + targetRect.height / 2;

    setTimeout(() => {
      flyingName.style.transition =
        'all 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      flyingName.style.left = targetX + 'px';
      flyingName.style.top = targetY + 'px';
      flyingName.style.transform = 'translate(-50%, -50%) scale(0.7)';
      flyingName.style.opacity = '0.8';

      setTimeout(() => {
        const memberDiv = document.createElement('div');
        memberDiv.className = `member-item ${member.gender} member-item-animated`;
        memberDiv.innerHTML = `${member.name} ${
          member.gender === 'female'
            ? '👩‍💼'
            : member.gender === 'male'
            ? '👨‍💼'
            : '🧑‍💻'
        }`;
        memberDiv.style.animationDelay = '0.1s';
        memberDiv.style.animation = 'memberLand 0.8s ease-out';

        targetColumn.appendChild(memberDiv);
        flyingName.remove();
      }, 1500);
    }, 100);

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  centerDisplay.remove();

  return new Promise((resolve) => {
    setTimeout(resolve, 1000);
  });
}

/* ===========================
   Team Generation
   =========================== */
function generateTeams() {
  const maleEmployees = employeeData.filter((e) => e.gender === 'male');
  const femaleEmployees = employeeData.filter((e) => e.gender === 'female');
  const internEmployees = employeeData.filter((e) => e.gender === 'intern');

  shuffleArray(maleEmployees);
  shuffleArray(femaleEmployees);
  shuffleArray(internEmployees);

  teamsData = [
    { name: 'Team Alpha', members: [], maleCount: 0, femaleCount: 0, internCount: 0 },
    { name: 'Team Beta', members: [], maleCount: 0, femaleCount: 0, internCount: 0 },
    { name: 'Team Gamma', members: [], maleCount: 0, femaleCount: 0, internCount: 0 },
    { name: 'Team Delta', members: [], maleCount: 0, femaleCount: 0, internCount: 0 },
  ];

  // 1) Females – balanced with slight randomness, then rebalanced
  femaleEmployees.forEach((employee, index) => {
    const baseTeamIndex = index % 4;
    const randomOffset = Math.floor(Math.random() * 4);
    const teamIndex = (baseTeamIndex + randomOffset) % 4;
    teamsData[teamIndex].members.push(employee);
    teamsData[teamIndex].femaleCount++;
  });
  rebalanceFemaleEmployees();

  // 2) Interns – round-robin
  internEmployees.forEach((employee, i) => {
    const teamIndex = i % 4;
    teamsData[teamIndex].members.push(employee);
    teamsData[teamIndex].internCount++;
  });

  // 3) Males – fill to balance totals (least members first with a little randomness)
  maleEmployees.forEach((employee) => {
    const teamSizes = teamsData.map((t, idx) => ({ index: idx, size: t.members.length }));
    teamSizes.sort((a, b) => (a.size === b.size ? Math.random() - 0.5 : a.size - b.size));
    const target = Math.random() < 0.7 ? teamSizes[0].index : teamSizes[1].index;
    teamsData[target].members.push(employee);
    teamsData[target].maleCount++;
  });

  teamsData.forEach((team) => team.members.sort((a, b) => a.name.localeCompare(b.name)));
}

function rebalanceFemaleEmployees() {
  const femaleCounts = teamsData.map((team) => team.femaleCount);
  const totalFemales = femaleCounts.reduce((s, c) => s + c, 0);
  const targetPerTeam = Math.floor(totalFemales / 4);
  const remainder = totalFemales % 4;

  const allFemales = [];
  teamsData.forEach((team, teamIndex) => {
    team.members
      .filter((m) => m.gender === 'female')
      .forEach((member) => allFemales.push({ member, originalTeam: teamIndex }));
  });

  teamsData.forEach((team) => {
    team.members = team.members.filter((m) => m.gender !== 'female');
    team.femaleCount = 0;
  });

  shuffleArray(allFemales);

  let f = 0;
  for (let t = 0; t < 4; t++) {
    for (let i = 0; i < targetPerTeam; i++) {
      if (f < allFemales.length) {
        teamsData[t].members.push(allFemales[f].member);
        teamsData[t].femaleCount++;
        f++;
      }
    }
  }

  const remainingTeams = [...Array(4).keys()];
  shuffleArray(remainingTeams);
  for (let i = 0; i < remainder; i++) {
    if (f < allFemales.length) {
      const t = remainingTeams[i];
      teamsData[t].members.push(allFemales[f].member);
      teamsData[t].femaleCount++;
      f++;
    }
  }
}

/* ===========================
   Stats + Teams UI
   =========================== */
function updateStatistics(total, male, female, interns = 0) {
  const totalEmployeesEl = document.getElementById('totalEmployees');
  const totalMaleEl = document.getElementById('totalMale');
  const totalFemaleEl = document.getElementById('totalFemale');
  const totalInternsEl = document.getElementById('totalInterns');
  const statsSectionEl = document.getElementById('statsSection');

  if (totalEmployeesEl) totalEmployeesEl.textContent = total;
  if (totalMaleEl) totalMaleEl.textContent = male;
  if (totalFemaleEl) totalFemaleEl.textContent = female;
  if (totalInternsEl) totalInternsEl.textContent = interns;
  if (statsSectionEl) statsSectionEl.classList.remove('hidden');
}

function displayTeams() {
  const container = document.getElementById('teamsContainer');
  if (!container) return;

  container.innerHTML = '';

  const teamColors = ['team-1', 'team-2', 'team-3', 'team-4'];

  teamsData.forEach((team, index) => {
    const teamCard = document.createElement('div');
    teamCard.className = 'team-card';

    teamCard.innerHTML = `
      <div class="team-header ${teamColors[index]}">${team.name}</div>
      <div class="team-body">
        <div class="team-stats">
          <div class="team-stat">
            <div class="team-stat-number">${team.members.length}</div>
            <div class="team-stat-label">Total</div>
          </div>
          <div class="team-stat">
            <div class="team-stat-number">${team.maleCount}</div>
            <div class="team-stat-label">Male</div>
          </div>
          <div class="team-stat">
            <div class="team-stat-number">${team.femaleCount}</div>
            <div class="team-stat-label">Female</div>
          </div>
          <div class="team-stat">
            <div class="team-stat-number">${team.internCount}</div>
            <div class="team-stat-label">Interns</div>
          </div>
        </div>
        <div class="member-list">
          ${team.members
            .map(
              (m) => `
            <div class="member-item ${m.gender}">
              ${m.name} ${m.gender === 'female' ? '👩‍💼' : m.gender === 'male' ? '👨‍💼' : '🧑‍💻'}
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;

    container.appendChild(teamCard);
  });

  container.classList.remove('hidden');
}

/* ===========================
   Tournament Type Selection
   =========================== */
function selectTournamentType(type) {
  currentTournamentType = type;

  const option8team = document.getElementById('option8team');
  const option16team = document.getElementById('option16team');
  const fixture8Section = document.getElementById('fixture8Section');
  const fixture16Section = document.getElementById('fixture16Section');

  if (option8team) option8team.classList.remove('selected');
  if (option16team) option16team.classList.remove('selected');
  if (fixture8Section) fixture8Section.classList.add('hidden');
  if (fixture16Section) fixture16Section.classList.add('hidden');

  const selectedOption = document.getElementById('option' + type);
  if (selectedOption) selectedOption.classList.add('selected');

  if (type === '8team' && fixture8Section) {
    fixture8Section.classList.remove('hidden');
  } else if (type === '16team' && fixture16Section) {
    fixture16Section.classList.remove('hidden');
  }
}

/* ===========================
   8-Team Tournament
   =========================== */
function autoFill8Teams() {
  if (teamsData.length === 0) {
    showFixtureError('fixture8Error', 'Please generate main teams first by uploading an Excel file.');
    return;
  }

  const subTeamIds = [
    'alpha1_8',
    'alpha2_8',
    'beta1_8',
    'beta2_8',
    'gamma1_8',
    'gamma2_8',
    'delta1_8',
    'delta2_8',
  ];

  teamsData.forEach((mainTeam, mainIndex) => {
    const members = [...mainTeam.members];
    shuffleArray(members);

    const halfPoint = Math.ceil(members.length / 2);
    const subTeam1Members = members.slice(0, halfPoint);
    const subTeam2Members = members.slice(halfPoint);

    const subTeam1Id = subTeamIds[mainIndex * 2];
    const subTeam2Id = subTeamIds[mainIndex * 2 + 1];

    const subTeam1El = document.getElementById(subTeam1Id);
    const subTeam2El = document.getElementById(subTeam2Id);

    if (subTeam1El) subTeam1El.value = subTeam1Members.map((m) => m.name).join('\n');
    if (subTeam2El) subTeam2El.value = subTeam2Members.map((m) => m.name).join('\n');
  });

  showFixtureSuccess('8-team setup auto-filled successfully!');
}

function create8TeamFixtures() {
  const subTeamIds = [
    'alpha1_8',
    'alpha2_8',
    'beta1_8',
    'beta2_8',
    'gamma1_8',
    'gamma2_8',
    'delta1_8',
    'delta2_8',
  ];
  const subTeamNames = ['Alpha-1', 'Alpha-2', 'Beta-1', 'Beta-2', 'Gamma-1', 'Gamma-2', 'Delta-1', 'Delta-2'];

  const subTeams = [];
  let hasError = false;

  subTeamIds.forEach((id, index) => {
    const element = document.getElementById(id);
    if (!element) return;

    const players = element.value.trim().split('\n').filter((name) => name.trim() !== '');

    if (players.length === 0) {
      showFixtureError('fixture8Error', `${subTeamNames[index]} cannot be empty. Please enter at least one player.`);
      hasError = true;
      return;
    }

    subTeams.push({
      name: subTeamNames[index],
      players: players.map((p) => p.trim()),
      parentTeam: Math.floor(index / 2),
    });
  });

  if (hasError || subTeams.length !== 8) return;

  fixtures8Data = generate8TeamFixtures(subTeams);
  display8TeamFixtures();
  hideFixtureMessages('fixture8Error');
}

function generate8TeamFixtures(subTeams) {
  const possibleMatchups = [];

  for (let i = 0; i < subTeams.length; i++) {
    for (let j = i + 1; j < subTeams.length; j++) {
      if (subTeams[i].parentTeam !== subTeams[j].parentTeam) {
        possibleMatchups.push({
          team1: subTeams[i],
          team2: subTeams[j],
          winner: null,
        });
      }
    }
  }

  shuffleArray(possibleMatchups);

  const qfPairings = [];
  const usedTeams = new Set();

  for (const matchup of possibleMatchups) {
    if (qfPairings.length >= 4) break;

    if (!usedTeams.has(matchup.team1.name) && !usedTeams.has(matchup.team2.name)) {
      qfPairings.push(matchup);
      usedTeams.add(matchup.team1.name);
      usedTeams.add(matchup.team2.name);
    }
  }

  return {
    quarterfinals: qfPairings,
    semifinals: [
      { team1: null, team2: null, winner: null, note: 'Winner of QF1 vs Winner of QF2' },
      { team1: null, team2: null, winner: null, note: 'Winner of QF3 vs Winner of QF4' },
    ],
    final: { team1: null, team2: null, winner: null, note: 'Winner of SF1 vs Winner of SF2' },
  };
}

function display8TeamFixtures() {
  const container = document.getElementById('fixtures8Result');
  if (!container) return;

  let html = '<div class="fixture-bracket">';
  html += '<h2 style="text-align: center; color: #2c3e50; margin-bottom: 30px;">🏆 8-Team Tournament Bracket</h2>';

  // Quarterfinals
  html += '<div class="bracket-round">';
  html += '<h3>🏆 Quarterfinals</h3>';
  html += '<div class="matches">';

  fixtures8Data.quarterfinals.forEach((match) => {
    html += `
      <div class="match" style="background: white; border-radius: 12px; padding: 20px; margin: 15px 0; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
        <div class="match-teams" style="text-align: center; margin-bottom: 15px;">
          <span class="team-name" style="background: #667eea; color: white; padding: 8px 15px; border-radius: 20px; margin: 0 10px;">${match.team1.name}</span>
          <span class="vs" style="font-weight: bold; color: #2c3e50;">VS</span>
          <span class="team-name" style="background: #28a745; color: white; padding: 8px 15px; border-radius: 20px; margin: 0 10px;">${match.team2.name}</span>
        </div>
        <div class="match-players">
          <div class="team-players" style="background: #f8f9fa; padding: 10px; border-radius: 8px; margin: 5px 0;"><strong>${match.team1.name}:</strong> ${match.team1.players.join(', ')}</div>
          <div class="team-players" style="background: #f8f9fa; padding: 10px; border-radius: 8px; margin: 5px 0;"><strong>${match.team2.name}:</strong> ${match.team2.players.join(', ')}</div>
        </div>
      </div>
    `;
  });

  html += '</div></div>';

  // Semifinals and Final
  html += '<div class="bracket-round">';
  html += '<h3>🥈 Semifinals</h3>';
  html += `<div class="match" style="background: #e3f2fd; border-radius: 12px; padding: 20px; margin: 15px 0;"><div class="match-players"><strong>SF1:</strong> ${fixtures8Data.semifinals[0].note}</div></div>`;
  html += `<div class="match" style="background: #e3f2fd; border-radius: 12px; padding: 20px; margin: 15px 0;"><div class="match-players"><strong>SF2:</strong> ${fixtures8Data.semifinals[1].note}</div></div>`;
  html += '</div>';

  html += '<div class="bracket-round">';
  html += '<h3>🥇 Final</h3>';
  html += `<div class="match final-match" style="background: linear-gradient(135deg, #ffd700, #ffed4e); border-radius: 12px; padding: 25px; margin: 15px 0; text-align: center;"><div class="match-players"><strong>FINAL:</strong> ${fixtures8Data.final.note}</div></div>`;
  html += '</div>';

  html += '<div style="text-align: center; margin-top: 30px;">';
  html += '<button onclick="download8TeamFixtures()" class="download-btn">📥 Download 8-Team Tournament Fixtures</button>';
  html += '</div>';

  html += '</div>';

  container.innerHTML = html;
  container.classList.remove('hidden');
}

/* ===========================
   16-Team Tournament
   =========================== */

// ---- Helpers to build no-same-group QFs from winners ----
function buildQuarterfinalsNoSameGroup(winners) {
  // winners: [{ team:Object, fromIndex:Number }]
  const n = winners.length; // should be 8
  const used = Array(n).fill(false);
  const pairs = [];

  function dfs() {
    if (pairs.length === n / 2) return true;
    let i = 0;
    while (i < n && used[i]) i++;
    used[i] = true;

    for (let j = i + 1; j < n; j++) {
      if (used[j]) continue;
      if (winners[i].team.parentTeam === winners[j].team.parentTeam) continue; // no same group

      used[j] = true;
      pairs.push([winners[i], winners[j]]);
      if (dfs()) return true;
      pairs.pop();
      used[j] = false;
    }

    used[i] = false;
    return false;
  }

  if (!dfs()) return null;

  pairs.sort((a, b) => {
    const aMin = Math.min(a[0].fromIndex, a[1].fromIndex);
    const bMin = Math.min(b[0].fromIndex, b[1].fromIndex);
    return aMin - bMin;
  });

  return pairs.map((p, k) => ({
    id: `QF${k + 1}`,
    team1: p[0].team,
    from1: `R16-${p[0].fromIndex}`,
    team2: p[1].team,
    from2: `R16-${p[1].fromIndex}`,
    winner: null,
  }));
}

function updateQuarterfinalsFromWinners() {
  if (!fixtures16Data || !fixtures16Data.round16) return;

  const winners = [];
  fixtures16Data.round16.forEach((m, i) => {
    if (m.winner) winners.push({ team: m.winner, fromIndex: i + 1 });
  });

  if (winners.length === 8) {
    const qf = buildQuarterfinalsNoSameGroup(winners);
    if (qf) {
      fixtures16Data.quarterfinals = qf;
    } else {
      // Fallback: keep default mapping notes if no valid perfect matching (very unlikely)
      fixtures16Data.quarterfinals = [];
    }
  }
}

/** UI hook: choose R16 winner (adds tiny buttons in display) */
function setR16Winner(matchIndex, who) {
  if (!fixtures16Data || !fixtures16Data.round16 || !fixtures16Data.round16[matchIndex]) return;
  const match = fixtures16Data.round16[matchIndex];
  let winTeam = null;

  if (who === 'team1') winTeam = match.team1;
  else if (who === 'team2') winTeam = match.team2;
  else if (typeof who === 'string') {
    if (match.team1.name === who) winTeam = match.team1;
    if (match.team2.name === who) winTeam = match.team2;
  }

  if (!winTeam) return;
  match.winner = winTeam;

  updateQuarterfinalsFromWinners();
  display16TeamFixtures();
}

function autoFill16Teams() {
  if (teamsData.length === 0) {
    showFixtureError('fixture16Error', 'Please generate main teams first by uploading an Excel file.');
    return;
  }

  const subTeamIds = [
    'alpha1_16',
    'alpha2_16',
    'alpha3_16',
    'alpha4_16',
    'beta1_16',
    'beta2_16',
    'beta3_16',
    'beta4_16',
    'gamma1_16',
    'gamma2_16',
    'gamma3_16',
    'gamma4_16',
    'delta1_16',
    'delta2_16',
    'delta3_16',
    'delta4_16',
  ];

  teamsData.forEach((mainTeam, mainIndex) => {
    const members = [...mainTeam.members];
    shuffleArray(members);

    const quarterPoint = Math.ceil(members.length / 4);
    const subTeam1Members = members.slice(0, quarterPoint);
    const subTeam2Members = members.slice(quarterPoint, quarterPoint * 2);
    const subTeam3Members = members.slice(quarterPoint * 2, quarterPoint * 3);
    const subTeam4Members = members.slice(quarterPoint * 3);

    const baseIndex = mainIndex * 4;
    const subTeam1El = document.getElementById(subTeamIds[baseIndex]);
    const subTeam2El = document.getElementById(subTeamIds[baseIndex + 1]);
    const subTeam3El = document.getElementById(subTeamIds[baseIndex + 2]);
    const subTeam4El = document.getElementById(subTeamIds[baseIndex + 3]);

    if (subTeam1El) subTeam1El.value = subTeam1Members.map((m) => m.name).join('\n');
    if (subTeam2El) subTeam2El.value = subTeam2Members.map((m) => m.name).join('\n');
    if (subTeam3El) subTeam3El.value = subTeam3Members.map((m) => m.name).join('\n');
    if (subTeam4El) subTeam4El.value = subTeam4Members.map((m) => m.name).join('\n');
  });

  showFixtureSuccess('16-team setup auto-filled successfully!');
}

function create16TeamFixtures() {
  const subTeamIds = [
    'alpha1_16',
    'alpha2_16',
    'alpha3_16',
    'alpha4_16',
    'beta1_16',
    'beta2_16',
    'beta3_16',
    'beta4_16',
    'gamma1_16',
    'gamma2_16',
    'gamma3_16',
    'gamma4_16',
    'delta1_16',
    'delta2_16',
    'delta3_16',
    'delta4_16',
  ];

  const subTeamNames = [
    'Alpha-1',
    'Alpha-2',
    'Alpha-3',
    'Alpha-4',
    'Beta-1',
    'Beta-2',
    'Beta-3',
    'Beta-4',
    'Gamma-1',
    'Gamma-2',
    'Gamma-3',
    'Gamma-4',
    'Delta-1',
    'Delta-2',
    'Delta-3',
    'Delta-4',
  ];

  const subTeams = [];
  let hasError = false;

  subTeamIds.forEach((id, index) => {
    const element = document.getElementById(id);
    if (!element) return;

    const players = element.value.trim().split('\n').filter((name) => name.trim() !== '');

    if (players.length === 0) {
      showFixtureError('fixture16Error', `${subTeamNames[index]} cannot be empty. Please enter at least one player.`);
      hasError = true;
      return;
    }

    subTeams.push({
      name: subTeamNames[index],
      players: players.map((p) => p.trim()),
      parentTeam: Math.floor(index / 4),
    });
  });

  if (hasError || subTeams.length !== 16) return;

  fixtures16Data = generate16TeamFixtures(subTeams);
  display16TeamFixtures();
  hideFixtureMessages('fixture16Error');
}

function generate16TeamFixtures(subTeams) {
  const possibleMatchups = [];

  for (let i = 0; i < subTeams.length; i++) {
    for (let j = i + 1; j < subTeams.length; j++) {
      if (subTeams[i].parentTeam !== subTeams[j].parentTeam) {
        possibleMatchups.push({
          team1: subTeams[i],
          team2: subTeams[j],
          winner: null,
        });
      }
    }
  }

  shuffleArray(possibleMatchups);

  const r16Pairings = [];
  const usedTeams = new Set();

  for (const matchup of possibleMatchups) {
    if (r16Pairings.length >= 8) break;

    if (!usedTeams.has(matchup.team1.name) && !usedTeams.has(matchup.team2.name)) {
      r16Pairings.push(matchup);
      usedTeams.add(matchup.team1.name);
      usedTeams.add(matchup.team2.name);
    }
  }

  // Start with empty QFs; we will compute them from winners
  return {
    round16: r16Pairings,
    quarterfinals: [], // will be populated once winners are set
    semifinals: [
      { team1: null, team2: null, winner: null, note: 'Winner of QF1 vs Winner of QF2' },
      { team1: null, team2: null, winner: null, note: 'Winner of QF3 vs Winner of QF4' },
    ],
    final: { team1: null, team2: null, winner: null, note: 'Winner of SF1 vs Winner of SF2' },
  };
}

function display16TeamFixtures() {
  const container = document.getElementById('fixtures16Result');
  if (!container) return;

  let html = '<div class="fixture-bracket">';
  html += '<h2 style="text-align: center; color: #2c3e50; margin-bottom: 30px;">🏆 16-Team Tournament Bracket</h2>';

  // Round of 16
  html += '<div class="bracket-round">';
  html += '<h3>🎯 Round of 16</h3>';
  html += '<div class="matches" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 15px;">';

  fixtures16Data.round16.forEach((match, index) => {
    const winnerLabel = match.winner ? `<div style="margin-top:6px;"><strong>Winner:</strong> ${match.winner.name}</div>` : '';
    html += `
      <div class="match" style="background: white; border-radius: 12px; padding: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
        <div class="match-teams" style="text-align: center; margin-bottom: 10px;">
          <div style="font-weight: bold; color: #2c3e50; margin-bottom: 8px;">R16-${index + 1}</div>
          <span class="team-name" style="background: #667eea; color: white; padding: 6px 12px; border-radius: 15px; margin: 0 5px; font-size: 0.9em;">${match.team1.name}</span>
          <span class="vs" style="font-weight: bold; color: #2c3e50;">VS</span>
          <span class="team-name" style="background: #28a745; color: white; padding: 6px 12px; border-radius: 15px; margin: 0 5px; font-size: 0.9em;">${match.team2.name}</span>
        </div>
        <div class="match-players" style="font-size: 0.85em;">
          <div class="team-players" style="background: #f8f9fa; padding: 8px; border-radius: 6px; margin: 3px 0;"><strong>${match.team1.name}:</strong> ${match.team1.players.join(', ')}</div>
          <div class="team-players" style="background: #f8f9fa; padding: 8px; border-radius: 6px; margin: 3px 0;"><strong>${match.team2.name}:</strong> ${match.team2.players.join(', ')}</div>
        </div>
        <div style="display:flex; gap:8px; justify-content:center; margin-top:10px;">
          <button onclick="setR16Winner(${index}, 'team1')" style="padding:6px 10px; border-radius:6px; border:1px solid #d1d5db;">${match.team1.name} Wins</button>
          <button onclick="setR16Winner(${index}, 'team2')" style="padding:6px 10px; border-radius:6px; border:1px solid #d1d5db;">${match.team2.name} Wins</button>
        </div>
        ${winnerLabel}
      </div>
    `;
  });

  html += '</div></div>';

  // Quarterfinals
  html += '<div class="bracket-round">';
  html += '<h3>🏆 Quarterfinals</h3>';
  html += '<div class="matches" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px;">';

  if (fixtures16Data.quarterfinals && fixtures16Data.quarterfinals.length && fixtures16Data.quarterfinals[0].team1) {
    // Actual computed pairings (no same-group)
    fixtures16Data.quarterfinals.forEach((m, index) => {
      html += `
        <div class="match" style="background: #e3f2fd; border-radius: 12px; padding: 15px;">
          <div class="match-teams" style="text-align: center; margin-bottom: 10px;">
            <span style="background: #2196f3; color: white; padding: 6px 12px; border-radius: 15px; font-weight: bold;">QF${index + 1}</span>
          </div>
          <div class="match-players" style="font-size: 0.9em;">
            <div><strong>${m.from1}:</strong> ${m.team1.name}</div>
            <div style="margin:4px 0; font-weight:600; text-align:center;">VS</div>
            <div><strong>${m.from2}:</strong> ${m.team2.name}</div>
          </div>
        </div>
      `;
    });
  } else {
    // Placeholder notes until winners selected
    const defaultNotes = [
      'Winner of R16-1 vs Winner of R16-2',
      'Winner of R16-3 vs Winner of R16-4',
      'Winner of R16-5 vs Winner of R16-6',
      'Winner of R16-7 vs Winner of R16-8',
    ];
    defaultNotes.forEach((note, index) => {
      html += `
        <div class="match" style="background: #e3f2fd; border-radius: 12px; padding: 15px;">
          <div class="match-teams" style="text-align: center; margin-bottom: 10px;">
            <span style="background: #2196f3; color: white; padding: 6px 12px; border-radius: 15px; font-weight: bold;">QF${index + 1}</span>
          </div>
          <div class="match-players" style="font-size: 0.9em;"><strong>${note}</strong></div>
        </div>
      `;
    });
  }
  html += '</div></div>';

  // Semifinals
  html += '<div class="bracket-round">';
  html += '<h3>🥈 Semifinals</h3>';
  html += '<div class="matches" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px;">';

  fixtures16Data.semifinals.forEach((match, index) => {
    html += `
      <div class="match" style="background: #fff3e0; border-radius: 12px; padding: 15px;">
        <div class="match-teams" style="text-align: center; margin-bottom: 10px;">
          <span style="background: #ff9800; color: white; padding: 6px 12px; border-radius: 15px; font-weight: bold;">SF${index + 1}</span>
        </div>
        <div class="match-players" style="font-size: 0.9em;"><strong>${match.note}</strong></div>
      </div>
    `;
  });

  html += '</div></div>';

  // Final
  html += '<div class="bracket-round">';
  html += '<h3>🥇 Final</h3>';
  html += `<div class="match final-match" style="background: linear-gradient(135deg, #ffd700, #ffed4e); border-radius: 12px; padding: 25px; margin: 15px 0; text-align: center;"><div class="match-players" style="font-size: 1.1em;"><strong>FINAL:</strong> ${fixtures16Data.final.note}</div></div>`;
  html += '</div>';

  // Architecture section (unchanged text)
  html += '<div style="margin-top: 50px; border-top: 3px solid #667eea; padding-top: 40px;">';
  html += '<h2 style="text-align: center; color: #2c3e50; margin-bottom: 30px; font-weight: 600;">🏗️ 16-Team Tournament Architecture</h2>';

  html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 25px; margin-bottom: 40px;">';

  html += '<div style="text-align: center;">';
  html += '<h3 style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 15px; border-radius: 10px; margin-bottom: 20px;">ROUND OF 16</h3>';
  html += '<div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border: 2px solid #e9ecef;">';
  html += '<div style="font-size: 2em; margin-bottom: 10px; font-weight: 700; color: #2c3e50;">16 → 8</div>';
  html += '<div style="margin-bottom: 15px; font-weight: 600;"><strong>8 Random Matches</strong></div>';
  html += '<div style="font-size: 0.9em; color: #6c757d;">No same-parent team matchups</div>';
  html += '</div></div>';

  html += '<div style="text-align: center;">';
  html += '<h3 style="background: linear-gradient(135deg, #2196f3, #1976d2); color: white; padding: 15px; border-radius: 10px; margin-bottom: 20px;">QUARTERFINALS</h3>';
  html += '<div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border: 2px solid #e9ecef;">';
  html += '<div style="font-size: 2em; margin-bottom: 10px; font-weight: 700; color: #2c3e50;">8 → 4</div>';
  html += '<div style="margin-bottom: 15px; font-weight: 600;"><strong>4 Matches</strong></div>';
  html += '<div style="font-size: 0.9em; color: #6c757d;">Winners from R16 (auto-arranged to avoid same-parent clashes)</div>';
  html += '</div></div>';

  html += '<div style="text-align: center;">';
  html += '<h3 style="background: linear-gradient(135deg, #ff9800, #f57c00); color: white; padding: 15px; border-radius: 10px; margin-bottom: 20px;">SEMIFINALS</h3>';
  html += '<div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border: 2px solid #e9ecef;">';
  html += '<div style="font-size: 2em; margin-bottom: 10px; font-weight: 700; color: #2c3e50;">4 → 2</div>';
  html += '<div style="margin-bottom: 15px; font-weight: 600;"><strong>2 Matches</strong></div>';
  html += '<div style="font-size: 0.9em; color: #6c757d;">Winners from QF</div>';
  html += '</div></div>';

  html += '<div style="text-align: center;">';
  html += '<h3 style="background: linear-gradient(135deg, #ffd700, #ffed4e); color: #333; padding: 15px; border-radius: 10px; margin-bottom: 20px; font-weight: 600;">FINAL</h3>';
  html += '<div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border: 2px solid #e9ecef;">';
  html += '<div style="font-size: 2em; margin-bottom: 10px; font-weight: 700; color: #2c3e50;">2 → 1</div>';
  html += '<div style="margin-bottom: 15px; font-weight: 600;"><strong>Championship</strong></div>';
  html += '<div style="font-size: 0.9em; color: #6c757d;">Winners from SF</div>';
  html += '</div></div>';

  html += '</div>';

  html += '<div style="background: linear-gradient(135deg, #2c3e50, #3498db); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-top: 30px;">';
  html += '<h3 style="margin-bottom: 20px; font-weight: 600;">📊 16-Team Tournament Flow</h3>';
  html += '<div style="display: flex; justify-content: center; align-items: center; gap: 15px; flex-wrap: wrap; font-size: 1em; font-weight: bold;">';
  html += '<span style="background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px;">16 Teams</span>';
  html += '<span style="font-size: 1.2em;">→</span>';
  html += '<span style="background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px;">R16 (8 matches)</span>';
  html += '<span style="font-size: 1.2em;">→</span>';
  html += '<span style="background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px;">QF (4 matches)</span>';
  html += '<span style="font-size: 1.2em;">→</span>';
  html += '<span style="background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px;">SF (2 matches)</span>';
  html += '<span style="font-size: 1.2em;">→</span>';
  html += '<span style="background: #ffd700; color: #333; padding: 8px 16px; border-radius: 20px;">🏆 CHAMPION</span>';
  html += '</div></div>';

  html += '<div style="text-align: center; margin-top: 30px;">';
  html += '<button onclick="download16TeamFixtures()" class="download-btn">📥 Download 16-Team Tournament Fixtures</button>';
  html += '</div>';

  html += '</div>';

  container.innerHTML = html;
  container.classList.remove('hidden');
}

/* ===========================
   Original 8-Team (legacy)
   =========================== */
function autoFillFromMainTeams() {
  if (teamsData.length === 0) {
    showFixtureError('Please generate main teams first by uploading an Excel file.');
    return;
  }

  const subTeamIds = ['alpha1', 'alpha2', 'beta1', 'beta2', 'gamma1', 'gamma2', 'delta1', 'delta2'];

  teamsData.forEach((mainTeam, mainIndex) => {
    const members = [...mainTeam.members];
    shuffleArray(members);

    const halfPoint = Math.ceil(members.length / 2);
    const subTeam1Members = members.slice(0, halfPoint);
    const subTeam2Members = members.slice(halfPoint);

    const subTeam1Id = subTeamIds[mainIndex * 2];
    const subTeam1Names = subTeam1Members.map((m) => m.name);
    const subTeam1El = document.getElementById(subTeam1Id);
    if (subTeam1El) subTeam1El.value = subTeam1Names.join('\n');

    const subTeam2Id = subTeamIds[mainIndex * 2 + 1];
    const subTeam2Names = subTeam2Members.map((m) => m.name);
    const subTeam2El = document.getElementById(subTeam2Id);
    if (subTeam2El) subTeam2El.value = subTeam2Names.join('\n');
  });

  showFixtureSuccess('Teams auto-filled successfully! You can modify them if needed.');
}

function createFixtures() {
  const subTeamIds = ['alpha1', 'alpha2', 'beta1', 'beta2', 'gamma1', 'gamma2', 'delta1', 'delta2'];
  const subTeamNames = ['Alpha-1', 'Alpha-2', 'Beta-1', 'Beta-2', 'Gamma-1', 'Gamma-2', 'Delta-1', 'Delta-2'];

  const subTeams = [];
  let hasError = false;

  subTeamIds.forEach((id, index) => {
    const element = document.getElementById(id);
    if (!element) return;

    const players = element.value.trim().split('\n').filter((name) => name.trim() !== '');

    if (players.length === 0) {
      showFixtureError(`${subTeamNames[index]} cannot be empty. Please enter at least one player.`);
      hasError = true;
      return;
    }

    subTeams.push({
      name: subTeamNames[index],
      players: players.map((p) => p.trim()),
      parentTeam: Math.floor(index / 2),
    });
  });

  if (hasError || subTeams.length !== 8) return;

  fixturesData = generateTournamentFixtures(subTeams);
  displayFixtures();
  hideFixtureMessages();
}

function generateTournamentFixtures(subTeams) {
  const parentGroups = [[], [], [], []];
  subTeams.forEach((team) => parentGroups[team.parentTeam].push(team));

  const possibleMatchups = [];

  for (let i = 0; i < subTeams.length; i++) {
    for (let j = i + 1; j < subTeams.length; j++) {
      if (subTeams[i].parentTeam !== subTeams[j].parentTeam) {
        possibleMatchups.push({
          team1: subTeams[i],
          team2: subTeams[j],
          winner: null,
        });
      }
    }
  }

  shuffleArray(possibleMatchups);

  const qfPairings = [];
  const usedTeams = new Set();

  for (const matchup of possibleMatchups) {
    if (qfPairings.length >= 4) break;

    if (!usedTeams.has(matchup.team1.name) && !usedTeams.has(matchup.team2.name)) {
      qfPairings.push(matchup);
      usedTeams.add(matchup.team1.name);
      usedTeams.add(matchup.team2.name);
    }
  }

  if (qfPairings.length < 4) {
    const fallbackPairings = [
      { team1: parentGroups[0][0], team2: parentGroups[2][0], winner: null },
      { team1: parentGroups[0][1], team2: parentGroups[2][1], winner: null },
      { team1: parentGroups[1][0], team2: parentGroups[3][0], winner: null },
      { team1: parentGroups[1][1], team2: parentGroups[3][1], winner: null },
    ];
    shuffleArray(fallbackPairings);
    return {
      quarterfinals: fallbackPairings,
      semifinals: [
        { team1: null, team2: null, winner: null, note: 'Winner of QF1 vs Winner of QF2' },
        { team1: null, team2: null, winner: null, note: 'Winner of QF3 vs Winner of QF4' },
      ],
      final: { team1: null, team2: null, winner: null, note: 'Winner of SF1 vs Winner of SF2' },
    };
  }

  return {
    quarterfinals: qfPairings,
    semifinals: [
      { team1: null, team2: null, winner: null, note: 'Winner of QF1 vs Winner of QF2' },
      { team1: null, team2: null, winner: null, note: 'Winner of QF3 vs Winner of QF4' },
    ],
    final: { team1: null, team2: null, winner: null, note: 'Winner of SF1 vs Winner of SF2' },
  };
}

function displayFixtures() {
  const container = document.getElementById('fixturesResult');
  if (!container) return;

  let html = '<div class="fixture-bracket">';

  html += '<div class="bracket-round">';
  html += '<h3>🏆 Quarterfinals</h3>';
  html += '<div class="matches qf-matches">';

  fixturesData.quarterfinals.forEach((match, index) => {
    html += `
      <div class="match">
        <div class="match-teams">
          <span class="team-name">${match.team1.name}</span>
          <span class="vs">VS</span>
          <span class="team-name">${match.team2.name}</span>
        </div>
        <div class="match-players">
          <div class="team-players"><strong>${match.team1.name}:</strong> ${match.team1.players.join(', ')}</div>
          <div class="team-players"><strong>${match.team2.name}:</strong> ${match.team2.players.join(', ')}</div>
        </div>
      </div>
    `;
  });

  html += '</div></div>';

  html += '<div class="bracket-round">';
  html += '<h3>🥈 Semifinals</h3>';
  html += '<div class="matches sf-matches">';

  fixturesData.semifinals.forEach((match, index) => {
    html += `
      <div class="match">
        <div class="match-teams">
          <span class="team-name" style="background: #28a745; color: white; padding: 5px 10px; border-radius: 5px;">SF${index + 1}</span>
        </div>
        <div class="match-players">
          <div class="team-players"><strong>${match.note}</strong></div>
        </div>
      </div>
    `;
  });

  html += '</div></div>';

  html += '<div class="bracket-round">';
  html += '<h3>🥇 Final</h3>';
  html += '<div class="matches">';
  html += `
    <div class="match final-match">
      <div class="match-teams">
        <span class="team-name" style="background: #ffd700; color: #333; padding: 5px 15px; border-radius: 5px; font-weight: bold;">FINAL</span>
      </div>
      <div class="match-players">
        <div class="team-players"><strong>${fixturesData.final.note}</strong></div>
      </div>
    </div>
  `;
  html += '</div></div>';

  html += '<div style="text-align: center; margin-top: 30px;">';
  html += '<button onclick="downloadFixtures()" class="download-btn">📥 Download Tournament Fixtures</button>';
  html += '</div>';

  html += '</div>';

  // Architecture (unchanged)
  html += '<div style="margin-top: 50px; border-top: 3px solid #667eea; padding-top: 40px;">';
  html += '<h2 style="text-align: center; color: #2c3e50; margin-bottom: 30px; font-weight: 600;">🏗️ Tournament Architecture</h2>';

  html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 30px; margin-bottom: 40px;">';

  html += '<div style="text-align: center;">';
  html += '<h3 style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 15px; border-radius: 10px; margin-bottom: 20px;">QUARTERFINALS</h3>';
  html += '<div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border: 2px solid #e9ecef;">';
  html += '<div style="font-size: 2em; margin-bottom: 10px; font-weight: 700; color: #2c3e50;">8 → 4</div>';
  html += '<div style="margin-bottom: 15px; font-weight: 600;"><strong>4 Random Matches</strong></div>';
  fixturesData.quarterfinals.forEach((match, index) => {
    html += `<div style="margin: 8px 0; padding: 8px; background: white; border-radius: 5px; font-size: 0.9em; border: 1px solid #e9ecef;"><strong>QF${index + 1}:</strong> ${match.team1.name} vs ${match.team2.name}</div>`;
  });
  html += '</div></div>';

  html += '<div style="text-align: center;">';
  html += '<h3 style="background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 15px; border-radius: 10px; margin-bottom: 20px;">SEMIFINALS</h3>';
  html += '<div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border: 2px solid #e9ecef;">';
  html += '<div style="font-size: 2em; margin-bottom: 10px; font-weight: 700; color: #2c3e50;">4 → 2</div>';
  html += '<div style="margin-bottom: 15px; font-weight: 600;"><strong>2 Matches</strong></div>';
  html += `<div style="margin: 8px 0; padding: 8px; background: white; border-radius: 5px; font-size: 0.9em; border: 1px solid #e9ecef;"><strong>SF1:</strong> Winner QF1 vs Winner QF2</div>`;
  html += `<div style="margin: 8px 0; padding: 8px; background: white; border-radius: 5px; font-size: 0.9em; border: 1px solid #e9ecef;"><strong>SF2:</strong> Winner QF3 vs Winner QF4</div>`;
  html += '</div></div>';

  html += '<div style="text-align: center;">';
  html += '<h3 style="background: linear-gradient(135deg, #ffd700, #ffed4e); color: #333; padding: 15px; border-radius: 10px; margin-bottom: 20px; font-weight: 600;">FINAL</h3>';
  html += '<div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border: 2px solid #e9ecef;">';
  html += '<div style="font-size: 2em; margin-bottom: 10px; font-weight: 700; color: #2c3e50;">2 → 1</div>';
  html += '<div style="margin-bottom: 15px; font-weight: 600;"><strong>Championship Match</strong></div>';
  html += `<div style="margin: 8px 0; padding: 15px; background: linear-gradient(135deg, #ffd700, #ffed4e); border-radius: 5px; font-size: 0.9em; font-weight: bold; color: #333; border: 2px solid #ffc107;"><strong>FINAL:</strong> Winner SF1 vs Winner SF2</strong></div>`;
  html += '</div></div>';

  html += '</div>';

  html += '<div style="background: linear-gradient(135deg, #2c3e50, #3498db); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-top: 30px;">';
  html += '<h3 style="margin-bottom: 20px; font-weight: 600;">📊 Tournament Flow</h3>';
  html += '<div style="display: flex; justify-content: center; align-items: center; gap: 20px; flex-wrap: wrap; font-size: 1.1em; font-weight: bold;">';
  html += '<span style="background: rgba(255,255,255,0.2); padding: 10px 20px; border-radius: 25px;">8 Teams</span>';
  html += '<span style="font-size: 1.5em;">→</span>';
  html += '<span style="background: rgba(255,255,255,0.2); padding: 10px 20px; border-radius: 25px;">QF (4 matches)</span>';
  html += '<span style="font-size: 1.5em;">→</span>';
  html += '<span style="background: rgba(255,255,255,0.2); padding: 10px 20px; border-radius: 25px;">SF (2 matches)</span>';
  html += '<span style="font-size: 1.5em;">→</span>';
  html += '<span style="background: #ffd700; color: #333; padding: 10px 20px; border-radius: 25px;">🏆 CHAMPION</span>';
  html += '</div>';

  html += '<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.3);">';
  html += '<h4 style="margin-bottom: 15px; font-weight: 600;">🎲 Randomization Strategy</h4>';
  html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; font-size: 0.9em;">';
  html += '<div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px;">✨ Completely randomized matchups</div>';
  html += '<div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px;">🚫 No same-parent team matchups</div>';
  html += '<div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px;">⚖️ Each team plays exactly once in QF</div>';
  html += '<div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px;">🏟️ Single elimination format</div>';
  html += '</div></div>';

  html += '</div>';
}

function downloadResults() {
  const wb = XLSX.utils.book_new();

  const summaryData = [
    ['Team Summary'],
    ['Team Name', 'Total Members', 'Male', 'Female', 'Interns'],
    ...teamsData.map((t) => [t.name, t.members.length, t.maleCount, t.femaleCount, t.internCount]),
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  const teamListData = [];
  teamsData.forEach((team, teamIndex) => {
    teamListData.push([team.name]);
    team.members.forEach((member) => {
      const typeIndicator = member.gender === 'female' ? '♀' : member.gender === 'male' ? '♂' : '🧑‍💻';
      teamListData.push([`${member.name} ${typeIndicator}`]);
    });
    if (teamIndex < teamsData.length - 1) {
      teamListData.push(['']);
    }
  });

  const teamListWs = XLSX.utils.aoa_to_sheet(teamListData);
  XLSX.utils.book_append_sheet(wb, teamListWs, 'Full Team List');

  const maxTeamSize = Math.max(...teamsData.map((t) => t.members.length));
  const headerRow = teamsData.map((t) => t.name);
  const sideByListData = [headerRow];

  for (let i = 0; i < maxTeamSize; i++) {
    const row = teamsData.map((t) => {
      if (t.members[i]) {
        const typeIndicator = t.members[i].gender === 'female' ? '♀' : t.members[i].gender === 'male' ? '♂' : '🧑‍💻';
        return `${t.members[i].name} ${typeIndicator}`;
      }
      return '';
    });
    sideByListData.push(row);
  }

  const sideByWs = XLSX.utils.aoa_to_sheet(sideByListData);
  XLSX.utils.book_append_sheet(wb, sideByWs, 'Teams Side-by-Side');

  XLSX.writeFile(wb, 'sport_teams_results.xlsx');
}

function download8TeamFixtures() {
  if (!fixtures8Data) return;

  const wb = XLSX.utils.book_new();

  const overviewData = [
    ['8-Team Tournament Fixtures - Single Elimination (Randomized)'],
    [''],
    ['QUARTERFINALS'],
    ['Match', 'Team 1', 'Players 1', 'VS', 'Team 2', 'Players 2'],
    ...fixtures8Data.quarterfinals.map((match, index) => [
      `QF${index + 1}`,
      match.team1.name,
      match.team1.players.join(', '),
      'VS',
      match.team2.name,
      match.team2.players.join(', '),
    ]),
    [''],
    ['SEMIFINALS'],
    ['Match', 'Description'],
    ['SF1', fixtures8Data.semifinals[0].note],
    ['SF2', fixtures8Data.semifinals[1].note],
    [''],
    ['FINAL'],
    ['Match', 'Description'],
    ['Final', fixtures8Data.final.note],
  ];

  const overviewWs = XLSX.utils.aoa_to_sheet(overviewData);
  XLSX.utils.book_append_sheet(wb, overviewWs, '8-Team Tournament');

  XLSX.writeFile(wb, '8_team_tournament_fixtures.xlsx');
}

function download16TeamFixtures() {
  if (!fixtures16Data) return;

  const wb = XLSX.utils.book_new();

  const qfRows =
    fixtures16Data.quarterfinals && fixtures16Data.quarterfinals.length && fixtures16Data.quarterfinals[0].team1
      ? fixtures16Data.quarterfinals.map((m, index) => [
          `QF${index + 1}`,
          `${m.from1} ${m.team1.name} vs ${m.from2} ${m.team2.name}`,
        ])
      : [
          ['QF1', 'Winner of R16-1 vs Winner of R16-2'],
          ['QF2', 'Winner of R16-3 vs Winner of R16-4'],
          ['QF3', 'Winner of R16-5 vs Winner of R16-6'],
          ['QF4', 'Winner of R16-7 vs Winner of R16-8'],
        ];

  const overviewData = [
    ['16-Team Tournament Fixtures - Single Elimination (Randomized)'],
    [''],
    ['ROUND OF 16'],
    ['Match', 'Team 1', 'Players 1', 'VS', 'Team 2', 'Players 2'],
    ...fixtures16Data.round16.map((match, index) => [
      `R16-${index + 1}`,
      match.team1.name,
      match.team1.players.join(', '),
      'VS',
      match.team2.name,
      match.team2.players.join(', '),
    ]),
    [''],
    ['QUARTERFINALS'],
    ['Match', 'Description'],
    ...qfRows,
    [''],
    ['SEMIFINALS'],
    ['Match', 'Description'],
    ...fixtures16Data.semifinals.map((match, index) => [`SF${index + 1}`, match.note]),
    [''],
    ['FINAL'],
    ['Match', 'Description'],
    ['Final', fixtures16Data.final.note],
  ];

  const overviewWs = XLSX.utils.aoa_to_sheet(overviewData);
  XLSX.utils.book_append_sheet(wb, overviewWs, '16-Team Tournament');

  const teamData = [['Team Roster Details'], ['Team Name', 'Players']];
  fixtures16Data.round16.forEach((match) => {
    teamData.push([match.team1.name, match.team1.players.join(', ')]);
    teamData.push([match.team2.name, match.team2.players.join(', ')]);
  });

  const teamWs = XLSX.utils.aoa_to_sheet(teamData);
  XLSX.utils.book_append_sheet(wb, teamWs, 'Team Rosters');

  XLSX.writeFile(wb, '16_team_tournament_fixtures.xlsx');
}

function downloadFixtures() {
  if (!fixturesData) return;

  const wb = XLSX.utils.book_new();

  const overviewData = [
    ['Tournament Fixtures - Single Elimination (Randomized)'],
    [''],
    ['QUARTERFINALS'],
    ['Match', 'Team 1', 'Players 1', 'VS', 'Team 2', 'Players 2'],
    ...fixturesData.quarterfinals.map((match, index) => [
      `QF${index + 1}`,
      match.team1.name,
      match.team1.players.join(', '),
      'VS',
      match.team2.name,
      match.team2.players.join(', '),
    ]),
    [''],
    ['SEMIFINALS'],
    ['Match', 'Description'],
    ['SF1', fixturesData.semifinals[0].note],
    ['SF2', fixturesData.semifinals[1].note],
    [''],
    ['FINAL'],
    ['Match', 'Description'],
    ['Final', fixturesData.final.note],
  ];

  const overviewWs = XLSX.utils.aoa_to_sheet(overviewData);
  XLSX.utils.book_append_sheet(wb, overviewWs, 'Tournament Fixtures');

  const teamData = [['Team Roster Details'], ['Team Name', 'Players']];

  fixturesData.quarterfinals.forEach((match) => {
    teamData.push([match.team1.name, match.team1.players.join(', ')]);
    teamData.push([match.team2.name, match.team2.players.join(', ')]);
  });

  const teamWs = XLSX.utils.aoa_to_sheet(teamData);
  XLSX.utils.book_append_sheet(wb, teamWs, 'Team Rosters');

  XLSX.writeFile(wb, 'tournament_fixtures_randomized.xlsx');
}

/* ===========================
   Utilities + Messages
   =========================== */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function showFixtureError(elementId, message) {
  if (arguments.length === 1) {
    message = elementId;
    elementId = 'fixtureError';
  }

  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = message;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 2500);
  }
}

function showFixtureSuccess(message) {
  const successDiv = document.createElement('div');
  successDiv.className = 'success-message';
  successDiv.textContent = message;
  successDiv.style.position = 'fixed';
  successDiv.style.top = '20px';
  successDiv.style.right = '20px';
  successDiv.style.zIndex = '1000';
  successDiv.style.maxWidth = '300px';
  successDiv.style.background = '#d4edda';
  successDiv.style.color = '#155724';
  successDiv.style.padding = '12px 20px';
  successDiv.style.borderRadius = '8px';
  successDiv.style.border = '1px solid #c3e6cb';
  successDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  successDiv.style.fontSize = '14px';
  successDiv.style.fontWeight = '500';

  document.body.appendChild(successDiv);
  setTimeout(() => {
    if (document.body.contains(successDiv)) {
      document.body.removeChild(successDiv);
    }
  }, 3000);
}

function hideFixtureMessages(elementId) {
  if (elementId) {
    const el = document.getElementById(elementId);
    if (el) el.classList.add('hidden');
  } else {
    // Hide all fixture error messages
    const fixtureError = document.getElementById('fixtureError');
    const fixture8Error = document.getElementById('fixture8Error');
    const fixture16Error = document.getElementById('fixture16Error');
    
    if (fixtureError) fixtureError.classList.add('hidden');
    if (fixture8Error) fixture8Error.classList.add('hidden');
    if (fixture16Error) fixture16Error.classList.add('hidden');
  }
}

function showLoading() { 
  const loadingEl = document.getElementById('loading');
  if (loadingEl) loadingEl.classList.remove('hidden'); 
  hideMessages(); 
}

function hideLoading() { 
  const loadingEl = document.getElementById('loading');
  if (loadingEl) loadingEl.classList.add('hidden'); 
}

function showError(message) {
  const el = document.getElementById('errorMessage');
  if (el) {
    el.textContent = message;
    el.classList.remove('hidden'); 
  }
  hideLoading();
}

function showSuccess(message) {
  const el = document.getElementById('successMessage');
  if (el) {
    el.textContent = message;
    el.classList.remove('hidden');
  }
}

function hideMessages() {
  const errorEl = document.getElementById('errorMessage');
  const successEl = document.getElementById('successMessage');
  
  if (errorEl) errorEl.classList.add('hidden');
  if (successEl) successEl.classList.add('hidden');
}
// Footer JavaScript functionality

// Smooth scroll to top when footer links are clicked
document.addEventListener('DOMContentLoaded', function() {
    
  // Add current year to footer
  const currentYear = new Date().getFullYear();
  const copyrightText = document.querySelector('.footer-bottom p');
  if (copyrightText) {
      copyrightText.innerHTML = `&copy; ${currentYear} Trivium Sports League. All rights reserved.`;
  }

  // Social media link functionality
  const socialLinks = document.querySelectorAll('.social-links a');
  socialLinks.forEach(link => {
      link.addEventListener('click', function(e) {
          e.preventDefault();
          const platform = this.getAttribute('title');
          
          // You can replace these with actual social media URLs
          const socialUrls = {
              'Facebook': 'https://facebook.com/triviumsportsleague',
              'Twitter': 'https://twitter.com/triviumsports',
              'Instagram': 'https://instagram.com/triviumsportsleague',
              'LinkedIn': 'https://linkedin.com/company/trivium-sports'
          };
          
          if (socialUrls[platform]) {
              // Open in new tab
              window.open(socialUrls[platform], '_blank');
          } else {
              console.log(`${platform} link clicked - Add your ${platform} URL`);
          }
      });

      // Add hover animation
      link.addEventListener('mouseenter', function() {
          this.style.transform = 'translateY(-3px) scale(1.1)';
      });
      
      link.addEventListener('mouseleave', function() {
          this.style.transform = 'translateY(0) scale(1)';
      });
  });

  // Quick links functionality
  const quickLinks = document.querySelectorAll('.footer-section a[href="#"]');
  quickLinks.forEach(link => {
      link.addEventListener('click', function(e) {
          e.preventDefault();
          const linkText = this.textContent.trim();
          
          // Handle different quick links
          switch(linkText) {
              case '🏠 Home':
                  scrollToTop();
                  break;
              case '📋 User Guide':
                  showUserGuide();
                  break;
              case '❓ FAQ':
                  showFAQ();
                  break;
              case '🔧 Technical Support':
                  openSupportChat();
                  break;
              default:
                  console.log(`${linkText} clicked - Add functionality`);
          }
      });
  });

  // Footer policy links
  const policyLinks = document.querySelectorAll('.footer-links a');
  policyLinks.forEach(link => {
      link.addEventListener('click', function(e) {
          e.preventDefault();
          const linkText = this.textContent.trim();
          showPolicyModal(linkText);
      });
  });

  // Add fade-in animation when footer comes into view
  const footer = document.querySelector('.footer');
  if (footer) {
      const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
              if (entry.isIntersecting) {
                  entry.target.style.opacity = '1';
                  entry.target.style.transform = 'translateY(0)';
              }
          });
      });

      footer.style.opacity = '0';
      footer.style.transform = 'translateY(50px)';
      footer.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      
      observer.observe(footer);
  }
});

// Utility functions
function scrollToTop() {
  window.scrollTo({
      top: 0,
      behavior: 'smooth'
  });
}

function showUserGuide() {
  alert('User Guide:\n\n1. Upload your Excel file with columns: Sl No, Male, Female, Interns\n2. Select your tournament format (8-team or 16-team)\n3. Click Generate Teams\n4. Download your balanced teams!');
}

function showFAQ() {
  const faqContent = `
  Frequently Asked Questions:

  Q: What Excel format do I need?
  A: Your Excel file should have columns: Sl No, Male, Female, Interns

  Q: How are teams balanced?
  A: Our algorithm ensures equal distribution of males, females, and interns across all teams.

  Q: Can I export the results?
  A: Yes! You can download the generated teams as PDF or Excel file.

  Q: What tournament formats are supported?
  A: Currently supports 8-team and 16-team tournament formats.
  `;
  alert(faqContent);
}

function openSupportChat() {
  // Simulate opening a support chat
  const supportMessage = 'Support chat would open here.\n\nFor real implementation, integrate with your support system like:\n- Intercom\n- Zendesk Chat\n- Custom chat widget';
  alert(supportMessage);
}

function showPolicyModal(policyType) {
  const policies = {
      'Privacy Policy': 'Our Privacy Policy ensures your data is protected and used responsibly...',
      'Terms of Service': 'By using TSL Team Generator, you agree to our terms...',
      'Cookie Policy': 'We use cookies to enhance your experience...',
      'Accessibility': 'We are committed to making our platform accessible to all users...'
  };
  
  alert(`${policyType}\n\n${policies[policyType] || 'Policy content would be displayed here.'}`);
}

// Optional: Add footer animation on scroll
window.addEventListener('scroll', function() {
  const footer = document.querySelector('.footer');
  const scrolled = window.pageYOffset;
  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;
  
  // Add subtle parallax effect to footer
  if (scrolled + windowHeight >= documentHeight - 100) {
      footer.style.transform = `translateY(${(scrolled - (documentHeight - windowHeight)) * 0.1}px)`;
  }
});