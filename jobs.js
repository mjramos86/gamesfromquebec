// ===============================
// JOBS SYSTEM — RSS VERSION
// Québec Game Industry Only
// ===============================

let jobsData = [];
let jobsLoading = false;
let visibleJobs = 12;

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
// RSS FETCH
// ===============================

async function fetchRSS(url) {
  const res = await fetch(
    `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`
  );

  const data = await res.json();

  return (data.items || []).map(item => ({
    title: item.title,
    company: item.author || 'Studio',
    location: 'Québec',
    snippet: cleanHTML(item.description).slice(0, 160),
    url: item.link,
    posted: item.pubDate
  }));
}

// ===============================
// MAIN SEARCH (ENTRY POINT)
// ===============================

async function runSearch() {
  if (jobsLoading) return;

  const container = document.getElementById('jobsContainer');

  jobsLoading = true;

  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <div class="loading-text">Scanning Québec game jobs…</div>
    </div>
  `;

  try {
    const feeds = [
      'https://rss.indeed.com/rss?q=video+game&l=Quebec',
      'https://rss.indeed.com/rss?q=unity+developer&l=Montreal',
      'https://rss.indeed.com/rss?q=game+designer&l=Montreal',
      'https://rss.indeed.com/rss?q=unreal+developer&l=Quebec'
    ];

    let allJobs = [];

    for (const feed of feeds) {
      const jobs = await fetchRSS(feed);
      allJobs.push(...jobs);
    }

    let filtered = allJobs.filter(j =>
      isGameJob(j.title, j.snippet)
    );

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
  const jobs = jobsData.slice(0, visibleJobs);

  if (!jobs.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎮</div>
        <div class="empty-title">NO JOBS FOUND</div>
        <p class="empty-sub">Try again later</p>
      </div>
    `;
    return;
  }

  container.innerHTML = jobs.map(job => {
    const isNew = /hour|today/i.test(job.posted);
    const role = detectRole(job.title);
    const studioType = detectStudioType(job.company);

    return `
      <div class="job-card ${studioType === 'AAA' ? 'featured' : ''}">
        <div>
          <div class="job-header">
            <div class="job-studio-logo">
              ${job.company.slice(0,2).toUpperCase()}
            </div>

            <div>
              <div class="job-title">${job.title}</div>
              <div class="job-company">
                ${job.company} — ${job.location}
              </div>
            </div>
          </div>

          <div class="job-tags">
            <span class="job-tag type">${role}</span>
            <span class="job-tag">${studioType}</span>
            ${isNew ? '<span class="job-tag new-tag">New</span>' : ''}
          </div>

          <div class="job-snippet">${job.snippet}</div>
        </div>

        <div class="job-right">
          <div class="job-age">${job.posted || ''}</div>
          <a class="apply-btn" href="${job.url}" target="_blank">
            Apply
          </a>
        </div>
      </div>
    `;
  }).join('');

  renderLoadMore();
}

// ===============================
// LOAD MORE
// ===============================

function renderLoadMore() {
  const btn = document.getElementById('loadMoreJobsBtn');

  if (!btn) return;

  if (visibleJobs >= jobsData.length) {
    btn.style.display = 'none';
    return;
  }

  btn.style.display = 'inline-block';

  btn.onclick = () => {
    visibleJobs += 12;
    renderJobs();
  };
}

// ===============================
// AUTO INIT (OPTIONAL)
// ===============================

// Call this when jobs page loads
// runSearch();
