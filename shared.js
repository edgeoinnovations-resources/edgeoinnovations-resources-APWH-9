// ═══════════════════════════════════════════════════════════════
// SHARED.JS — Common functionality for all AP World History modules
// Video embed, localStorage persistence, Google Apps Script submission
// ═══════════════════════════════════════════════════════════════

// ── CONFIGURATION ──
// After deploying your Google Apps Script, paste the web app URL here:
const APPS_SCRIPT_URL = 'PASTE_YOUR_APPS_SCRIPT_URL_HERE';

// ── STUDENT NAME (persisted across all chapters) ──
function initStudentName() {
  const input = document.getElementById('studentNameInput');
  if (!input) return;
  const saved = localStorage.getItem('apwh_student_name');
  if (saved) input.value = saved;
  input.addEventListener('input', () => {
    localStorage.setItem('apwh_student_name', input.value);
  });
}

function getStudentName() {
  return (localStorage.getItem('apwh_student_name') || '').trim();
}

// ── VIDEO EMBED ──
function embedVideo(containerId, youtubeId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `
    <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px;border:1px solid rgba(184,134,11,0.3);margin-bottom:1rem;">
      <iframe src="https://www.youtube.com/embed/${youtubeId}?rel=0"
        style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen></iframe>
    </div>`;
}

// ── LOCALSTORAGE AUTO-SAVE FOR TEXTAREAS ──
function initAutoSave(chapterId) {
  // Save student name
  initStudentName();

  // Auto-save all textareas
  const textareas = document.querySelectorAll('textarea, .sa-textarea');
  textareas.forEach((ta, i) => {
    const key = `${chapterId}_textarea_${i}`;
    const saved = localStorage.getItem(key);
    if (saved) ta.value = saved;
    ta.addEventListener('input', () => {
      localStorage.setItem(key, ta.value);
    });
  });

  // Auto-save causal chain inputs
  const causalInputs = document.querySelectorAll('.causal-input');
  causalInputs.forEach((input, i) => {
    const key = `${chapterId}_causal_${i}`;
    const saved = localStorage.getItem(key);
    if (saved) input.value = saved;
    input.addEventListener('input', () => {
      localStorage.setItem(key, input.value);
    });
  });

  // Restore DOK completion state
  for (let dok = 1; dok <= 4; dok++) {
    if (localStorage.getItem(`${chapterId}_dok${dok}_done`) === 'true') {
      const btn = document.querySelector(`[id*="dok${dok}"], [id*="done${dok}"], [id="dok${dok}Btn"], [id="btn-dok${dok}"]`);
      if (btn && !btn.classList.contains('done')) {
        btn.classList.add('done');
        const icon = btn.querySelector('.check-icon');
        if (icon) icon.textContent = '\u2713';
      }
    }
  }

  // Restore progress bar
  const savedProgress = parseInt(localStorage.getItem(`${chapterId}_progress`) || '0');
  if (savedProgress > 0) updateProgressBar(savedProgress);
}

// ── PROGRESS BAR ──
function updateProgressBar(pct) {
  const fill = document.getElementById('progressFill') || document.getElementById('progress-fill');
  const pctEl = document.getElementById('progressPct');
  if (fill) fill.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';
}

// ── ENHANCED MARK DONE (wraps existing function) ──
function markDoneShared(chapterId, btnId, pct) {
  localStorage.setItem(`${chapterId}_dok_pct`, pct);
  localStorage.setItem(`${chapterId}_progress`, pct);

  // Figure out which DOK was completed based on percentage
  const dokMap = { 25: 1, 50: 2, 75: 3, 100: 4 };
  const dok = dokMap[pct];
  if (dok) localStorage.setItem(`${chapterId}_dok${dok}_done`, 'true');

  // Show completion section when all DOKs done
  if (pct >= 100) {
    const completionSection = document.getElementById('completionSection');
    if (completionSection) completionSection.style.display = 'block';
  }
}

// ── GATHER SCORES ──
function gatherMCQScore() {
  let correct = 0;
  let total = 0;
  document.querySelectorAll('.mcq-item, .mcq-block').forEach(item => {
    if (!item.dataset.answered && !item.querySelector('.mcq-choice.correct, .mcq-choice.incorrect, .mcq-btn.correct, .mcq-btn.incorrect, .correct, .incorrect')) return;
    total++;
    const hasIncorrect = item.querySelector('.mcq-choice.incorrect, .mcq-btn.incorrect, .incorrect');
    if (!hasIncorrect) correct++;
  });
  return { correct, total };
}

function gatherSelfAssessment() {
  const skills = [];
  document.querySelectorAll('.skill-row').forEach(row => {
    const label = row.querySelector('.skill-label, .skill-name')?.textContent?.trim() || '';
    const filled = row.querySelectorAll('.skill-dot.filled, .skill-dot.lit').length;
    if (label && filled > 0) skills.push({ skill: label, rating: filled });
  });
  return skills;
}

function gatherTextareaResponses(chapterId) {
  const responses = [];
  document.querySelectorAll('textarea, .sa-textarea').forEach((ta, i) => {
    const val = ta.value?.trim();
    if (val) {
      const card = ta.closest('.card, .dok-section, .dok1-section, .dok2-section, .dok3-section, .dok4-section');
      const label = card?.querySelector('.card-label, h3, h4, .section-h')?.textContent?.trim() || `Response ${i + 1}`;
      responses.push({ activity: label, response: val });
    }
  });
  return responses;
}

// ── SUBMIT COMPLETION REPORT ──
async function submitCompletionReport(chapterId, chapterTitle) {
  const name = getStudentName();
  if (!name) {
    alert('Please enter your name at the top of the page before submitting.');
    const nameInput = document.getElementById('studentNameInput');
    if (nameInput) nameInput.focus();
    return;
  }

  if (APPS_SCRIPT_URL === 'PASTE_YOUR_APPS_SCRIPT_URL_HERE') {
    alert('Submission endpoint not configured yet. Please ask your teacher to set up the Google Apps Script.');
    return;
  }

  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
  }

  const data = {
    studentName: name,
    chapterId: chapterId,
    chapterTitle: chapterTitle,
    completedAt: new Date().toISOString(),
    mcqScore: gatherMCQScore(),
    selfAssessment: gatherSelfAssessment(),
    responses: gatherTextareaResponses(chapterId)
  };

  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(data)
    });

    localStorage.setItem(`${chapterId}_submitted`, 'true');
    localStorage.setItem(`${chapterId}_submittedAt`, new Date().toISOString());

    if (submitBtn) {
      submitBtn.textContent = '\u2713 Report Submitted!';
      submitBtn.style.borderColor = '#4a9e3f';
      submitBtn.style.color = '#a8e0a0';
      submitBtn.style.background = 'rgba(74,158,63,0.15)';
    }

    alert(`Completion report for "${chapterTitle}" submitted successfully! Nice work, ${name}.`);
  } catch (e) {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Completion Report';
    }
    alert('There was an issue submitting. Your work is saved locally \u2014 try again in a moment.');
  }
}

// ── BUILD COMPLETION SECTION HTML ──
function buildCompletionSection(chapterId, chapterTitle) {
  const alreadySubmitted = localStorage.getItem(`${chapterId}_submitted`) === 'true';

  const section = document.createElement('div');
  section.id = 'completionSection';
  section.style.display = 'none';
  section.innerHTML = `
    <hr style="border:none;border-top:2px solid var(--gold);margin:2.5rem 0;">
    <div style="background:rgba(184,134,11,0.08);border:1px solid rgba(184,134,11,0.3);border-radius:8px;padding:1.5rem;text-align:center;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:0.7rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--gold);margin-bottom:0.75rem;">Module Complete</div>
      <h3 style="font-family:'Playfair Display',serif;font-size:1.3rem;color:var(--parchment);margin-bottom:0.5rem;">${chapterTitle}</h3>
      <p style="font-size:0.88rem;color:#c8b898;margin-bottom:1.25rem;">You've completed all four DOK levels. Submit your completion report to Mr. Strootman.</p>
      <button id="submitBtn" onclick="submitCompletionReport('${chapterId}', '${chapterTitle}')"
        style="display:inline-flex;align-items:center;gap:0.5rem;padding:0.75rem 2rem;background:rgba(184,134,11,0.15);border:1.5px solid var(--gold);color:var(--gold);font-family:'JetBrains Mono',monospace;font-size:0.75rem;letter-spacing:0.12em;text-transform:uppercase;border-radius:4px;cursor:pointer;transition:all 0.15s;"
        ${alreadySubmitted ? 'disabled' : ''}>
        ${alreadySubmitted ? '\u2713 Already Submitted' : 'Submit Completion Report'}
      </button>
      <div style="margin-top:1rem;">
        <a href="index.html" style="font-family:'JetBrains Mono',monospace;font-size:0.68rem;color:var(--smoke);letter-spacing:0.1em;text-transform:uppercase;text-decoration:none;border-bottom:1px solid var(--smoke);padding-bottom:2px;">\u2190 Back to Chapter List</a>
      </div>
    </div>
  `;

  const main = document.querySelector('.main') || document.querySelector('.container') || document.body;
  main.appendChild(section);

  const savedProgress = parseInt(localStorage.getItem(`${chapterId}_progress`) || '0');
  if (savedProgress >= 100) section.style.display = 'block';

  if (alreadySubmitted) {
    const btn = document.getElementById('submitBtn');
    if (btn) {
      btn.style.borderColor = '#4a9e3f';
      btn.style.color = '#a8e0a0';
      btn.style.background = 'rgba(74,158,63,0.15)';
    }
  }
}

// ── BUILD STUDENT NAME BAR ──
function buildStudentNameBar() {
  const saved = getStudentName();
  const bar = document.createElement('div');
  bar.id = 'studentNameBar';
  bar.style.cssText = 'background:rgba(26,16,6,0.95);backdrop-filter:blur(8px);padding:0.5rem 1rem;border-bottom:1px solid rgba(184,134,11,0.15);';
  bar.innerHTML = `
    <div style="max-width:860px;margin:0 auto;display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">
      <label for="studentNameInput" style="font-family:'JetBrains Mono',monospace;font-size:0.62rem;color:var(--smoke);text-transform:uppercase;letter-spacing:0.1em;white-space:nowrap;">Student Name</label>
      <input type="text" id="studentNameInput" value="${saved}" placeholder="Enter your full name"
        style="flex:1;min-width:180px;max-width:300px;background:rgba(255,255,255,0.06);border:1px solid rgba(184,134,11,0.2);border-radius:4px;color:var(--parchment);font-family:'Source Serif 4',serif;font-size:0.85rem;padding:0.35rem 0.75rem;outline:none;transition:border-color 0.2s;"
        onfocus="this.style.borderColor='var(--gold)'" onblur="this.style.borderColor='rgba(184,134,11,0.2)'">
      <a href="index.html" style="font-family:'JetBrains Mono',monospace;font-size:0.6rem;color:var(--gold);letter-spacing:0.1em;text-transform:uppercase;text-decoration:none;margin-left:auto;white-space:nowrap;">\u2190 Chapters</a>
    </div>
  `;

  const progressBar = document.querySelector('.progress-bar-wrap, #progress-bar-container');
  if (progressBar) {
    progressBar.insertAdjacentElement('afterend', bar);
  } else {
    document.body.insertAdjacentElement('afterbegin', bar);
  }

  initStudentName();
}

// ── HOME PAGE: Update chapter list with completion status ──
function updateHomePageStatus() {
  const chapters = ['9_0', '9_1', '9_2', '9_3', '9_4', '9_5', '9_6', '9_7', '9_8', '9_9'];
  chapters.forEach(ch => {
    const el = document.getElementById(`status-${ch}`);
    if (!el) return;
    const submitted = localStorage.getItem(`${ch}_submitted`) === 'true';
    const progress = parseInt(localStorage.getItem(`${ch}_progress`) || '0');
    if (submitted) {
      el.textContent = '\u2713 Submitted';
      el.className = 'chapter-status submitted';
    } else if (progress > 0) {
      el.textContent = `${progress}% complete`;
      el.className = 'chapter-status in-progress';
    }
  });
}
