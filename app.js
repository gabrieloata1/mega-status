// SUPABASE CONFIG
const SUPABASE_URL  = 'https://uwfetpdermpvcdierygv.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3ZmV0cGRlcm1wdmNkaWVyeWd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNzkxODIsImV4cCI6MjA5OTY1NTE4Mn0.QxLquWAQ5KiZFyReNHlWK1FY2qhAMz_G2FuOwlwfrCc';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

function todayDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDatePT(dateStr) {
  const [y, m, day] = dateStr.split('-');
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const weekdays = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab'];
  const d = new Date(y, m-1, day);
  return `${weekdays[d.getDay()]}, ${day} de ${months[m-1]} de ${y}`;
}

function secondsUntilMidnight() {
  const now  = new Date();
  const next = new Date();
  next.setDate(next.getDate()+1);
  next.setHours(0,0,0,0);
  return Math.floor((next - now) / 1000);
}

function formatCountdown(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function setLoading(btnId, loading) {
  const btn    = document.getElementById(btnId);
  const text   = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');
  btn.disabled = loading;
  text.classList.toggle('hidden', loading);
  loader.classList.toggle('hidden', !loading);
}

function showError(id, msg)   { const el = document.getElementById(id); el.textContent = msg; el.classList.remove('hidden'); }
function hideError(id)        { document.getElementById(id).classList.add('hidden'); }
function showSuccess(id, msg) { const el = document.getElementById(id); el.textContent = msg; el.classList.remove('hidden'); }

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  document.getElementById(`${tab}-form`).classList.add('active');
  hideError('login-error');
  hideError('register-error');
  hideError('register-success');
}

function togglePass(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') { input.type = 'text'; btn.textContent = '\uD83D\uDE48'; }
  else { input.type = 'password'; btn.textContent = '\uD83D\uDC41\uFE0F'; }
}

function toFakeEmail(username) {
  const safe = username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '_');
  return `${safe}@dailyquestions.app`;
}

async function handleLogin(e) {
  e.preventDefault();
  hideError('login-error');
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const email    = toFakeEmail(username);
  setLoading('login-btn', true);
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  setLoading('login-btn', false);
  if (error) { showError('login-error', 'Usuario ou senha incorretos.'); return; }
  startApp(data.user, username);
}

async function handleRegister(e) {
  e.preventDefault();
  hideError('register-error');
  hideError('register-success');
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  if (!username) { showError('register-error', 'Por favor, escolha um usuario.'); return; }
  if (username.length < 3) { showError('register-error', 'O usuario deve ter pelo menos 3 caracteres.'); return; }
  const email = toFakeEmail(username);
  setLoading('register-btn', true);
  const { data, error } = await db.auth.signUp({ email, password, options: { data: { full_name: username } } });
  setLoading('register-btn', false);
  if (error) {
    if (error.message.includes('already registered')) {
      showError('register-error', 'Este usuario ja esta cadastrado. Tente outro nome.');
    } else {
      showError('register-error', error.message);
    }
    return;
  }
  if (data.session) { startApp(data.user, username); }
  else { showSuccess('register-success', 'Conta criada! Faca o login agora.'); setTimeout(() => switchTab('login'), 2000); }
}

async function handleLogout() {
  await db.auth.signOut();
  showScreen('auth-screen');
  clearCountdown();
}

let countdownInterval = null;
function clearCountdown() { if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; } }

function startApp(user, usernameOverride) {
  const name = usernameOverride || user.user_metadata?.full_name || user.email.split('@')[0];
  document.getElementById('user-name-display').textContent = name;
  document.getElementById('today-date').textContent = formatDatePT(todayDateStr());
  showScreen('app-screen');
  loadDailyQuestions(user.id);
}

async function loadDailyQuestions(userId) {
  showLoading();
  const today = todayDateStr();
  const { data: assigned, error: assignedErr } = await db.from('daily_questions').select('question_id, questions(id, text)').eq('user_id', userId).eq('assigned_date', today);
  if (assignedErr) { console.error(assignedErr); return; }
  const { data: answered, error: answeredErr } = await db.from('answers').select('question_id, answer').eq('user_id', userId).eq('answered_date', today);
  if (answeredErr) { console.error(answeredErr); return; }
  const answeredMap = {};
  (answered || []).forEach(a => { answeredMap[a.question_id] = a.answer; });
  let questions = [];
  if (assigned && assigned.length > 0) {
    questions = assigned.map(a => a.questions);
  } else {
    const { data: allQ, error: allQErr } = await db.from('questions').select('id, text').eq('active', true);
    if (allQErr || !allQ || allQ.length === 0) { showNoQuestions(); return; }
    const shuffled = allQ.sort(() => Math.random() - 0.5).slice(0, 2);
    questions = shuffled;
    if (shuffled.length > 0) {
      const rows = shuffled.map(q => ({ user_id: userId, question_id: q.id, assigned_date: today }));
      await db.from('daily_questions').insert(rows);
    }
  }
  if (questions.length === 0) { showNoQuestions(); return; }
  renderQuestions(questions, answeredMap, userId);
}

function renderQuestions(questions, answeredMap, userId) {
  const answeredCount = Object.keys(answeredMap).length;
  updateProgress(answeredCount);
  if (answeredCount >= 2) { showDone(); return; }
  const container = document.getElementById('questions-container');
  container.innerHTML = '';
  questions.forEach((q, idx) => {
    const isAnswered = q.id in answeredMap;
    const answer     = answeredMap[q.id];
    const card = document.createElement('div');
    card.className = 'question-card' + (isAnswered ? ' answered' : '');
    card.id = `card-${q.id}`;
    card.innerHTML = `
      <div class="question-number">Pergunta ${idx + 1}</div>
      <div class="question-text">${q.text}</div>
      <div class="answer-btns">
        <button id="yes-${q.id}" class="btn-yes${isAnswered && answer === true ? ' selected' : ''}" ${isAnswered ? 'disabled' : ''} onclick="submitAnswer('${q.id}', true, '${userId}')">&#9989; Sim</button>
        <button id="no-${q.id}" class="btn-no${isAnswered && answer === false ? ' selected' : ''}" ${isAnswered ? 'disabled' : ''} onclick="submitAnswer('${q.id}', false, '${userId}')">&#10060; Nao</button>
      </div>
      ${isAnswered ? `<div class="answer-feedback">Voce respondeu: <strong>${answer ? 'Sim' : 'Nao'}</strong></div>` : ''}
    `;
    container.appendChild(card);
  });
  hideLoading();
  container.classList.remove('hidden');
}

async function submitAnswer(questionId, answer, userId) {
  const yBtn = document.getElementById(`yes-${questionId}`);
  const nBtn = document.getElementById(`no-${questionId}`);
  yBtn.disabled = true;
  nBtn.disabled = true;
  const today = todayDateStr();
  const { error } = await db.from('answers').insert({ user_id: userId, question_id: questionId, answer, answered_date: today });
  if (error) { console.error(error); yBtn.disabled = false; nBtn.disabled = false; return; }
  if (answer) { yBtn.classList.add('selected'); } else { nBtn.classList.add('selected'); }
  const card = document.getElementById(`card-${questionId}`);
  card.classList.add('answered');
  const existing = card.querySelector('.answer-feedback');
  if (!existing) {
    const fb = document.createElement('div');
    fb.className = 'answer-feedback';
    fb.innerHTML = `Voce respondeu: <strong>${answer ? 'Sim' : 'Nao'}</strong>`;
    card.appendChild(fb);
  }
  const { data: answered } = await db.from('answers').select('question_id, answer').eq('user_id', userId).eq('answered_date', today);
  const count = answered ? answered.length : 0;
  updateProgress(count);
  if (count >= 2) setTimeout(showDone, 800);
}

function updateProgress(count) {
  const clamped = Math.min(count, 2);
  document.getElementById('progress-count').textContent = `${clamped} / 2`;
  document.getElementById('progress-bar').style.width = `${(clamped / 2) * 100}%`;
}

function showLoading() {
  document.getElementById('loading-state').classList.remove('hidden');
  document.getElementById('done-state').classList.add('hidden');
  document.getElementById('no-questions-state').classList.add('hidden');
  document.getElementById('questions-container').classList.add('hidden');
}

function hideLoading() { document.getElementById('loading-state').classList.add('hidden'); }

function showDone() {
  document.getElementById('loading-state').classList.add('hidden');
  document.getElementById('questions-container').classList.add('hidden');
  document.getElementById('no-questions-state').classList.add('hidden');
  document.getElementById('done-state').classList.remove('hidden');
  updateProgress(2);
  startCountdown();
}

function showNoQuestions() {
  document.getElementById('loading-state').classList.add('hidden');
  document.getElementById('done-state').classList.add('hidden');
  document.getElementById('questions-container').classList.add('hidden');
  document.getElementById('no-questions-state').classList.remove('hidden');
}

function startCountdown() {
  clearCountdown();
  const el = document.getElementById('next-reset');
  function tick() {
    const secs = secondsUntilMidnight();
    el.textContent = `Proximas perguntas em ${formatCountdown(secs)}`;
    if (secs <= 0) { clearCountdown(); location.reload(); }
  }
  tick();
  countdownInterval = setInterval(tick, 1000);
}

(async function init() {
  const { data: { session } } = await db.auth.getSession();
  if (session?.user) { startApp(session.user); }
  else { showScreen('auth-screen'); }
  db.auth.onAuthStateChange((_event, session) => { if (!session) showScreen('auth-screen'); });
})();