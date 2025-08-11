<script>
/*
 Habit Tree logic:
 - localStorage keys:
   - habitTree_leaves => integer number of leaves currently on tree
   - habitTree_last => last completion date string (YYYY-MM-DD)
   - habitTree_history => JSON array of completion dates (optional, for undo)
 - On load:
   - Read last date; compute days difference to today.
   - For each skipped day (difference > 0), remove one leaf (min 0).
 - Mark complete:
   - If already completed today, do nothing (or show small pulse)
   - Otherwise increment leaves and streak, save today's date in history.
 - Undo:
   - Remove last completion from history and adjust leaves & last date.
*/

const STORAGE_LEAVES = "habitTree_leaves";
const STORAGE_LAST = "habitTree_last";
const STORAGE_HISTORY = "habitTree_history";
const STORAGE_FLOWER_EVERY = "habitTree_flower_every";

const treeEl = document.getElementById('trunk');
const leavesCountEl = document.getElementById('leavesCount');
const streakEl = document.getElementById('streakCount');
const lastDateEl = document.getElementById('lastDate');
const completeBtn = document.getElementById('completeBtn');
const undoBtn = document.getElementById('undoBtn');
const flowerEveryEl = document.getElementById('flowerEvery');
const flowerInput = document.getElementById('flowerInput');

// helper: format dates YYYY-MM-DD (use UTC midnight to avoid timezone shifts)
function dateKey(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth()+1).padStart(2,'0');
  const day = String(d.getUTCDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function todayKey() { return dateKey(new Date()); }

function daysBetween(dateAKey, dateBKey) {
  // parse YYYY-MM-DD -> treat as UTC midnight
  const a = new Date(dateAKey + "T00:00:00Z");
  const b = new Date(dateBKey + "T00:00:00Z");
  const ms = b - a;
  return Math.floor(ms / (1000*60*60*24));
}

function readLeaves() {
  return Math.max(0, parseInt(localStorage.getItem(STORAGE_LEAVES) || "0", 10));
}
function writeLeaves(n){
  localStorage.setItem(STORAGE_LEAVES, String(Math.max(0, Math.floor(n))));
}

function readHistory(){
  try {
    return JSON.parse(localStorage.getItem(STORAGE_HISTORY) || "[]");
  } catch(e){ return []; }
}
function writeHistory(arr){
  localStorage.setItem(STORAGE_HISTORY, JSON.stringify(arr));
}

function readLast(){
  return localStorage.getItem(STORAGE_LAST) || null;
}
function writeLast(key){
  if (key) localStorage.setItem(STORAGE_LAST, key);
  else localStorage.removeItem(STORAGE_LAST);
}

function readFlowerEvery(){
  const v = parseInt(localStorage.getItem(STORAGE_FLOWER_EVERY) || flowerInput.value, 10);
  return Math.max(1, v);
}
function writeFlowerEvery(n){
  localStorage.setItem(STORAGE_FLOWER_EVERY, String(Math.max(1, Math.floor(n))));
}

// UI updates
function refreshUI(){
  const leaves = readLeaves();
  leavesCountEl.textContent = leaves;
  const hist = readHistory();
  // compute streak: count consecutive days from today backwards found in history
  let streak = 0;
  const today = todayKey();
  for (let i=0;i<hist.length;i++){
    // ensure sorted descending
  }
  const sorted = [...new Set(readHistory())].sort().reverse(); // newest first
  let cursor = today;
  while (sorted.length>0) {
    if (sorted[0] === cursor) {
      streak++; sorted.shift();
      // move cursor previous day
      const d = new Date(cursor + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() - 1);
      cursor = dateKey(d);
    } else break;
  }
  streakEl.textContent = streak;
  const last = readLast();
  lastDateEl.textContent = last || "—";
  flowerEveryEl.textContent = readFlowerEvery();
  flowerInput.value = readFlowerEvery();
  renderTree();
}

// Rendering leaves & flowers in tree area
function clearDecor() {
  const existing = treeEl.querySelectorAll('.leaf, .flower');
  existing.forEach(n=>n.remove());
}
function renderTree(){
  clearDecor();
  const leaves = readLeaves();
  const flowerEvery = readFlowerEvery();

  // We'll position leaves at many hard-coded slots across the trunk/branches area for a pleasing look.
  const slots = [
    {left: -42, top: 40, rot: -30, alt:false},
    {left: 30, top: 20, rot: 20, alt:true},
    {left: -70, top: 120, rot: -48, alt:true},
    {left: 48, top: 90, rot: 36, alt:false},
    {left: -30, top: 170, rot: -18, alt:false},
    {left: 18, top: 150, rot: 10, alt:true},
    {left: -56, top: 230, rot: -12, alt:false},
    {left: 56, top: 200, rot: 14, alt:true},
    {left: -18, top: 280, rot: -6, alt:false},
    {left: 36, top: 260, rot: 6, alt:true},
    {left: -14, top: 70, rot: -6, alt:false},
    {left: 8, top: 320, rot: 10, alt:true},
    {left: -88, top: 60, rot: -60, alt:false},
    {left: 88, top: 70, rot: 60, alt:true},
    {left: 0, top: 10, rot: 0, alt:false},
  ];
  // Repeat pattern if there's more leaves than slots
  for (let i=0;i<leaves;i++){
    const s = slots[i % slots.length];
    const leaf = document.createElement('div');
    leaf.className = 'leaf' + ((i%2===0)?' alt':'');
    // position relative to trunk center
    leaf.style.left = `calc(50% + ${s.left}px)`;
    leaf.style.bottom = `${s.top}px`;
    leaf.style.transform = `rotate(${s.rot}deg)`;
    // small delay to animate grow
    treeEl.appendChild(leaf);
    requestAnimationFrame(()=>{ // next frame
      setTimeout(()=> leaf.classList.add('grown'), 40 + (i%6)*90 );
    });
  }

  // Flowers: create one flower for each multiple of flowerEvery achieved (visual counts up to 3)
  const flowers = Math.min(3, Math.floor(leaves / flowerEvery));
  const flowerSlots = [
    {left:-10, bottom:320}, {left:36, bottom:210}, {left:-52, bottom:190}
  ];
  for (let f=0; f<flowers; f++){
    const ft = document.createElement('div');
    ft.className = 'flower';
    const s = flowerSlots[f%flowerSlots.length];
    ft.style.left = `calc(50% + ${s.left}px)`;
    ft.style.bottom = `${s.bottom}px`;
    treeEl.appendChild(ft);
    setTimeout(()=> ft.classList.add('bloom'), 200 + f*180);
  }
}

// growth/decay logic
function applyMissedDaysDecay() {
  const last = readLast();
  if (!last) return; // no previous completions
  const today = todayKey();
  const daysMissed = daysBetween(last, today);
  if (daysMissed <= 0) return; // last is today or future (ignore)
  // If daysMissed >= 1, then we treat each missed day as -1 leaf (but do not go below 0)
  let leaves = readLeaves();
  const remove = Math.min(leaves, daysMissed); // can't remove more than existing
  if (remove > 0) {
    leaves -= remove;
    writeLeaves(leaves);
    // optionally remove the last N dates from history that would correspond to skipping
    // For simplicity we will not mark those days as explicit misses in history.
  }
}

function markComplete() {
  const today = todayKey();
  const last = readLast();
  if (last === today) {
    // already done today — small pulse animation
    completeBtn.animate([{transform:'scale(1)'},{transform:'scale(1.06)'},{transform:'scale(1)'}], {duration:360});
    return;
  }
  // if last is earlier than today but exactly yesterday -> streak continues
  // add a leaf
  let leaves = readLeaves();
  leaves += 1;
  writeLeaves(leaves);

  // record history
  const hist = readHistory();
  hist.push(today);
  writeHistory(hist);
  writeLast(today);

  refreshUI();
}

function undoLast() {
  const hist = readHistory();
  if (hist.length === 0) {
    alert("No actions to undo.");
    return;
  }
  // remove last completed date
  const last = hist.pop();
  writeHistory(hist);
  // reduce leaves by 1 (if >0)
  let leaves = readLeaves();
  if (leaves > 0) {
    // animate a falling leaf if possible
    const leavesOnScreen = [...treeEl.querySelectorAll('.leaf.grown')];
    const leafToFall = leavesOnScreen[leavesOnScreen.length-1] || null;
    if (leafToFall) {
      leafToFall.classList.remove('grown');
      leafToFall.classList.add('fall');
      setTimeout(()=> leafToFall.remove(), 2200);
    }
    leaves -= 1;
    writeLeaves(leaves);
  }
  // update last date to previous history item or null
  const newLast = hist.length ? hist[hist.length - 1] : null;
  writeLast(newLast);
  refreshUI();
}

// initialize
function init(){
  // set flowerEvery value from storage if present
  const storedFE = localStorage.getItem(STORAGE_FLOWER_EVERY);
  if (storedFE) flowerInput.value = storedFE;

  // Apply decay based on missed days (only once per load)
  applyMissedDaysDecay();

  // Ensure history stays consistent with leaves count: if leaves > history length, pad history with last date(s)
  // (Simplified approach: keep as-is.)

  refreshUI();
}

// event handlers
completeBtn.addEventListener('click', ()=> {
  markComplete();
});
undoBtn.addEventListener('click', ()=> {
  undoLast();
});
flowerInput.addEventListener('change', ()=>{
  const n = Math.max(1, parseInt(flowerInput.value || "7", 10));
  writeFlowerEvery(n);
  refreshUI();
});

// Run on load
init();
</script>
</body>
</html>