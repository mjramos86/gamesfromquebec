// ===============================
// JOBS SYSTEM — SerpApi Google Jobs
// Québec Game Industry
// ===============================

const SERPAPI_KEY = '2064428fbfcef11c8812ffee6019cf7ca311119dc304c2d4854106da25e65a47';

let jobsData = [];
let jobsLoading = false;
let visibleJobs = 12;
let currentTypeFilter = 'all';
let currentKeywordFilter = '';

// ===============================
// CONFIG
// ===============================

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
  'ubisoft', 'warner', 'eidos', 'behaviour', 'ea', 'gameloft'
];

// ===============================
// HELPERS
// ===============================

function detectRole(title) {
  const t = title.toLowerCase();
  const found = ROLE_TAGS.find(r => t.includes(r.key));
  return found ? found.label : '🎮 Game Dev';
}

function detectStudioType(company) {
  const c = company.toLowerCase();
  return AAA_STUDIOS.some(s => c.includes(s)) ? 'AAA' : 'Indie';
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
  const input = document.getElementById('keywordsInput');
  if (input) input.value = q;
  runSearch();
}

function getFilteredJobs() {
  let jobs = jobsData;

  if (currentTypeFilter !== 'all') {
    const typeMap = {
      full_time: 'full-time',
      part_time: 'part-time',
      contract: 'contractor',
      internship: 'internship'
    };
    const match = typeMap[currentTypeFilter];
    if (match) {
      jobs = jobs.filter(j => j.jobType.toLowerCase().includes(match));
    }
  }

  return jobs;
}

// ===============================
// GOOGLE JOBS FETCH (SerpApi)
// ===============================

async function fetchGoogleJobs(query, location) {
  const params = new URLSearchParams({
    engine: 'google_jobs',
    q: query,
    location: location || 'Quebec, Canada',
    hl: 'en',
    api_key: SERPAPI_KEY
  });

  const serpUrl = `https://serpapi.com/search.json?${params}`;
  const res = await fetch(`https://corsproxy.io/?url=${encodeURIComponent(serpUrl)}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  const data = await res.json();

  if (data.error) throw new Error(data.error);

  return (data.jobs_results || []).map(item => ({
    title: item.title,
    company: item.company_name,
    location: item.location,
    snippet: (item.description || '').slice(0, 160),
    url: item.apply_options?.[0]?.link || item.related_links?.[0]?.link || '#',
    posted: item.detected_extensions?.posted_at || '',
    jobType: item.detected_extensions?.schedule_type || '',
    salary: item.detected_extensions?.salary || ''
  }));
}

// ===============================
// MAIN SEARCH (ENTRY POINT)
// ===============================

async function runSearch() {
  if (jobsLoading) return;

  const container = document.getElementById('jobsContainer');
  const keywordsInput = document.getElementById('keywordsInput');
  const locationInput = document.getElementById('locationInput');

  const query = keywordsInput?.value.trim() || 'video game';
  const location = locationInput?.value.trim() || 'Quebec, Canada';

  jobsLoading = true;
  currentTypeFilter = 'all';
  document.querySelectorAll('#typeFilters .filter-chip').forEach((b, i) => {
    b.classList.toggle('active', i === 0);
  });

  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <div class="loading-text">Scanning Québec game jobs…</div>
    </div>
  `;

  try {
    jobsData = await fetchGoogleJobs(query, location);
    visibleJobs = 12;
    renderJobs();
  } catch (err) {
    container.innerHTML = `
      <div class="error-state">
        Connection error: ${esc(err.message)}
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
        <p class="empty-sub">Try a different search or check back later</p>
      </div>
    `;
    renderLoadMore(filtered);
    return;
  }

  container.innerHTML = jobs.map(job => {
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
            ${job.jobType ? `<span class="job-tag">${esc(job.jobType)}</span>` : ''}
            ${job.salary ? `<span class="job-tag">💰 ${esc(job.salary)}</span>` : ''}
          </div>

          <div class="job-snippet">${esc(job.snippet)}</div>
        </div>

        <div class="job-right">
          <div class="job-age">${esc(job.posted)}</div>
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
