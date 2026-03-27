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
// INDEED CANADA RSS FETCH (free, no API key)
// ===============================

function formatAge(date) {
  const days = Math.floor((Date.now() - date) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

async function fetchIndeedJobs(query, location) {
  const q = encodeURIComponent(query || 'game developer');
  const l = encodeURIComponent(location || 'Quebec');
  const indeedUrl = `https://ca.indeed.com/rss?q=${q}&l=${l}&radius=100&limit=50&sort=date`;
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(indeedUrl)}`;

  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const wrapper = await res.json();
  if (!wrapper.contents) throw new Error('No response from job board');

  const parser = new DOMParser();
  const doc = parser.parseFromString(wrapper.contents, 'text/xml');
  const items = [...doc.querySelectorAll('item')];

  if (!items.length) throw new Error('No jobs found for this search. Try different keywords.');

  return items.map(item => {
    // Indeed title format: "Job Title - Company - City, Province"
    const rawTitle = item.querySelector('title')?.textContent || '';
    const parts = rawTitle.split(' - ');
    const title    = parts[0]?.trim() || rawTitle;
    const company  = parts[1]?.trim() || '';
    const jobLoc   = parts.slice(2).join(' – ').trim() || location || 'Quebec';

    const link    = item.querySelector('link')?.textContent?.trim() || '#';
    const pubDate = item.querySelector('pubDate')?.textContent || '';
    const descRaw = item.querySelector('description')?.textContent || '';

    // Strip HTML tags for snippet
    const div = document.createElement('div');
    div.innerHTML = descRaw;
    const snippet = (div.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200);

    const posted = pubDate ? formatAge(new Date(pubDate)) : '';

    return { title, company, location: jobLoc, snippet, url: link, posted, jobType: '', salary: '' };
  });
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
    jobsData = await fetchIndeedJobs(query, location);
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
