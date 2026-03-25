// ===============================
// JOBS SYSTEM — Remotive API
// Game Dev Jobs
// ===============================

let jobsData = [];
let jobsLoading = false;
let visibleJobs = 12;
let currentTypeFilter = 'all';
let currentKeywordFilter = '';

// ===============================
// CONFIG
// ===============================

const GAME_KEYWORDS = [
  'game','gaming','video game','unity','unreal','level design',
  'gameplay','3d artist','game designer','game programmer',
  'qa tester','engine','technical artist'
];

const ROLE_TAGS = [
  { key: 'artist', label: '🎨 Artist' },
  { key: 'animator', label: '🎨 Animator' },
  { key: 'programmer', label: '💻 Programmer' },
  { key: 'developer', label: '💻 Developer' },
  { key: 'designer', label: '🎮 Designer' },
  { key: 'qa', label: '🔍 QA' },
  { key: 'producer', label: '📋 Producer' },
  { key: 'audio', label: '🎵 Audio' }
];

const AAA_STUDIOS = [
  'ubisoft','warner','eidos','behaviour','ea','gameloft'
];

// ===============================
// HELPERS
// ===============================

function isGameJob(title, snippet) {
  const text = `${title} ${snippet}`.toLowerCase();
  return GAME_KEYWORDS.some(k => text.includes(k));
}

function detectRole(title) {
  const t = title.toLowerCase();
  const found = ROLE_TAGS.find(r => t.includes(r.key));
  return found ? found.label : '🎮 Game Dev';
}

function detectStudioType(company) {
  const c = company.toLowerCase();
  return AAA_STUDIOS.some(s => c.includes(s)) ? 'AAA' : 'Indie';
}

function cleanHTML(html) {
  return html.replace(/<[^>]+>/g, '');
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function dedupeJobs(jobs) {
  const seen = new Set();
  return jobs.filter(j => {
    const key = j.title + j.company;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ===============================
// FILTERS
// ===============================

function setTypeFilter(btn, type) {
  currentTypeFilter = type;
  document.querySelectorAll('#typeFilters .filter-chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  visibleJobs = 12;
  renderJobs();
}

function quickSearch(q) {
  currentKeywordFilter = q.toLowerCase();
  const input = document.getElementById('keywordsInput');
  if (input) input.value = q;
  visibleJobs = 12;
  if (jobsData.length === 0) {
    runSearch();
  } else {
    renderJobs();
  }
}

function getFilteredJobs() {
  let jobs = jobsData;

  if (currentKeywordFilter) {
    jobs = jobs.filter(j =>
      (j.title + ' ' + j.snippet).toLowerCase().includes(currentKeywordFilter)
    );
  }

  if (currentTypeFilter !== 'all') {
    if (currentTypeFilter === 'internship') {
      jobs = jobs.filter(j =>
        (j.title + ' ' + j.snippet).toLowerCase().includes('intern')
      );
    } else {
      jobs = jobs.filter(j => j.jobType === currentTypeFilter);
    }
  }

  return jobs;
}

// ===============================
// REMOTIVE API FETCH
// ===============================

async function fetchRemotive(category) {
  const res = await fetch(
    `https://remotive.com/api/remote-jobs?category=${encodeURIComponent(category)}&limit=100`
  );
  const data = await res.json();

  return (data.jobs || []).map(item => ({
    title: item.title,
    company: item.company_name,
    location: item.candidate_required_location || 'Remote',
    snippet: cleanHTML(item.description).slice(0, 160),
    url: item.url,
    posted: item.publication_date,
    jobType: item.job_type
  }));
}

// ===============================
// MAIN SEARCH (ENTRY POINT)
// ===============================

async function runSearch() {
  if (jobsLoading) return;

  const container = document.getElementById('jobsContainer');
  const keywordsInput = document.getElementById('keywordsInput');
  if (keywordsInput && keywordsInput.value.trim()) {
    currentKeywordFilter = keywordsInput.value.trim().toLowerCase();
  } else {
    currentKeywordFilter = '';
  }

  jobsLoading = true;

  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <div class="loading-text">Loading game dev jobs…</div>
    </div>
  `;

  try {
    const [gameJobs, devJobs] = await Promise.all([
      fetchRemotive('game-development'),
      fetchRemotive('software-dev')
    ]);

    let allJobs = [...gameJobs, ...devJobs];

    let filtered = allJobs.filter(j => isGameJob(j.title, j.snippet));
    filtered = dedupeJobs(filtered);

    jobsData = filtered;
    visibleJobs = 12;

    renderJobs();

  } catch (err) {
    container.innerHTML = `
      <div class="error-state">
        Connection error: ${err.message}
      </div>
    `;
  }

  jobsLoading = false;
}

// ===============================
// RENDER
// ===============================

function renderJobs() {
  const container = document.getElementById('jobsContainer');
  const info = document.getElementById('resultsInfo');
  const filtered = getFilteredJobs();
  const jobs = filtered.slice(0, visibleJobs);

  if (info) {
    info.textContent = filtered.length
      ? `${filtered.length} position${filtered.length !== 1 ? 's' : ''} found`
      : 'No positions found';
  }

  if (!jobs.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎮</div>
        <div class="empty-title">NO JOBS FOUND</div>
        <p class="empty-sub">Try again later</p>
      </div>
    `;
    renderLoadMore(filtered);
    return;
  }

  container.innerHTML = jobs.map(job => {
    const isNew = /hour|today|\d{4}-\d{2}-\d{2}/i.test(job.posted);
    const role = detectRole(job.title);
    const studioType = detectStudioType(job.company);

    return `
      <div class="job-card ${studioType === 'AAA' ? 'featured' : ''}">
        <div>
          <div class="job-header">
            <div class="job-studio-logo">
              ${esc(job.company.slice(0, 2).toUpperCase())}
            </div>

            <div>
              <div class="job-title">${esc(job.title)}</div>
              <div class="job-company">
                ${esc(job.company)} — ${esc(job.location)}
              </div>
            </div>
          </div>

          <div class="job-tags">
            <span class="job-tag type">${role}</span>
            <span class="job-tag">${studioType}</span>
            ${isNew ? '<span class="job-tag new-tag">New</span>' : ''}
          </div>

          <div class="job-snippet">${esc(job.snippet)}</div>
        </div>

        <div class="job-right">
          <div class="job-age">${esc(job.posted ? job.posted.slice(0, 10) : '')}</div>
          <a class="apply-btn" href="${esc(job.url)}" target="_blank" rel="noopener noreferrer">
            Apply
          </a>
        </div>
      </div>
    `;
  }).join('');

  renderLoadMore(filtered);
}

// ===============================
// LOAD MORE
// ===============================

function renderLoadMore(filtered) {
  const btn = document.getElementById('loadMoreJobsBtn');
  const wrap = document.getElementById('loadMoreJobsWrap');

  if (!btn) return;

  const jobs = filtered || getFilteredJobs();

  if (visibleJobs >= jobs.length) {
    if (wrap) wrap.style.display = 'none';
    btn.style.display = 'none';
    return;
  }

  if (wrap) wrap.style.display = 'block';
  btn.style.display = 'inline-block';

  btn.onclick = () => {
    visibleJobs += 12;
    renderJobs();
  };
}
