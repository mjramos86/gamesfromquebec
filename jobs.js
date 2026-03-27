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
// STATIC JOB DATA — sourced from Indeed Canada, Montréal QC
// Last updated: March 27, 2026
// ===============================

const STATIC_JOBS = [
  {title:"Game Design Team Lead – For Honor",company:"Ubisoft",location:"Montréal, QC",snippet:"Lead the game design team on For Honor, driving design direction, mentoring designers, and collaborating with cross-functional teams to deliver exceptional gameplay experiences.",url:"https://to.indeed.com/aa7xrwlmby8b",posted:"Mar 26, 2026",jobType:"full-time",salary:"$57,500–$88,500 a year"},
  {title:"Animateur·rice jouabilité sénior (première personne) — Far Cry",company:"Ubisoft",location:"Montréal, QC",snippet:"Senior gameplay animator for Ubisoft's Far Cry franchise, specializing in first-person animation systems and working closely with design and engineering teams.",url:"https://to.indeed.com/aahy4kjjqgg6",posted:"Mar 26, 2026",jobType:"full-time",salary:"$66,250–$104,000 a year"},
  {title:"Senior Sound Designer — Blight: Survival",company:"Behaviour Interactive",location:"Montréal, QC",snippet:"Design and implement immersive sound effects and audio systems for Blight: Survival, Behaviour's upcoming co-op survival game set in a medieval world overrun by the Blight.",url:"https://to.indeed.com/aa886qqs86kw",posted:"Mar 26, 2026",jobType:"full-time",salary:"$66,688–$103,750 a year"},
  {title:"Senior Character Artist — FTC",company:"Compulsion Games",location:"Montréal, QC",snippet:"Create high-quality character art assets for an unannounced Compulsion Games project. Collaborate with art directors and technical artists to bring compelling characters to life.",url:"https://to.indeed.com/aacb64n9w74c",posted:"Mar 25, 2026",jobType:"full-time",salary:"$76,250–$110,000 a year"},
  {title:"Associate Technical Artist",company:"Electronic Arts",location:"Montréal, QC",snippet:"Support EA Montréal's art pipeline by developing tools, optimizing assets, and bridging the gap between art and engineering teams on AAA titles.",url:"https://to.indeed.com/aa6vyjqytlgv",posted:"Mar 25, 2026",jobType:"full-time",salary:"$90,100–$126,000 a year"},
  {title:"Indonesian QA Tester",company:"Altagram Canada",location:"Montréal, QC",snippet:"Perform localization and functional quality assurance testing for video game titles targeting Indonesian-speaking markets, ensuring linguistic accuracy and cultural appropriateness.",url:"https://to.indeed.com/aa8ytngry44q",posted:"Mar 23, 2026",jobType:"part-time",salary:""},
  {title:"Narrative Designer — Disney Dreamlight Valley",company:"Gameloft",location:"Montréal, QC",snippet:"Craft compelling narrative content, quests, and dialogue for Disney Dreamlight Valley. Collaborate with IP holders at Disney and internal creative teams to expand the game's story world.",url:"https://to.indeed.com/aadxh6fspclq",posted:"Mar 20, 2026",jobType:"full-time",salary:"$61,050–$98,000 a year"},
  {title:"Arabic Localization Video Game QA Tester",company:"Ghostpunch Games",location:"Montréal, QC",snippet:"Test and validate Arabic language content across video game titles, identifying linguistic and cultural issues to ensure a high-quality localized player experience.",url:"https://to.indeed.com/aaq2c66j8w4h",posted:"Mar 4, 2026",jobType:"",salary:"$47,150–$103,750 a year"},
  {title:"Visual Experience Designer",company:"Electronic Arts",location:"Montréal, QC",snippet:"Design UI/UX systems and visual experiences for EA's game titles in Montréal, collaborating with product teams to create intuitive and visually compelling player interfaces.",url:"https://to.indeed.com/aan7hqctbrdz",posted:"Mar 2, 2026",jobType:"full-time",salary:"$83,000–$116,400 a year"},
  {title:"3D Art Generalist — Brookhaven",company:"Voldex Games",location:"Montréal, QC",snippet:"Create 3D assets, environments and props for Brookhaven, Voldex's popular VR franchise. Work with a talented art team to maintain visual consistency and push technical quality.",url:"https://to.indeed.com/aafdlqgc7fcx",posted:"Mar 10, 2026",jobType:"full-time",salary:"$77,170–$92,200 a year"},
  {title:"QA Tester — Brookhaven",company:"Voldex Games",location:"Montréal, QC",snippet:"Test and document bugs for Brookhaven VR, working with developers to ensure a polished player experience across updates and new content releases.",url:"https://to.indeed.com/aavrx7yctchw",posted:"Feb 20, 2026",jobType:"full-time",salary:"$34,632–$35,700 a year"},
  {title:"Game Artist",company:"Light & Wonder",location:"Montréal, QC",snippet:"Create striking visual art for casino and digital game titles at Light & Wonder's Montréal studio, from concept through to final in-game implementation.",url:"https://to.indeed.com/aasnknhbqgqh",posted:"Feb 26, 2026",jobType:"full-time",salary:"$50,000–$100,000 a year"},
  {title:"Unity Software Developer — Interactive Health Applications",company:"Jintronix",location:"Montréal, QC",snippet:"Build engaging Unity-based interactive health and rehabilitation applications, working at the intersection of game technology and healthcare innovation.",url:"https://to.indeed.com/aabvrmzhhb6q",posted:"Dec 9, 2025",jobType:"full-time",salary:"$85,000–$95,000 a year"},
  {title:"Principal DevOps Engineer",company:"Cloud Imperium Games",location:"Montréal, QC",snippet:"Lead DevOps strategy and infrastructure for Cloud Imperium Games Montréal, supporting the development of Star Citizen and Squadron 42 at scale.",url:"https://to.indeed.com/aalchkfy86wy",posted:"Jul 15, 2025",jobType:"",salary:"$70,000–$115,000 a year"},
  {title:"Dialogue Audio Editor (on-call)",company:"Ghostpunch Games",location:"Montréal, QC",snippet:"Edit and implement dialogue audio for video game projects on an on-call basis, ensuring high production value and consistency across character performances.",url:"https://to.indeed.com/aanzcrk4vytf",posted:"Apr 10, 2025",jobType:"",salary:"$47,150–$103,750 a year"},
  {title:"Localization QA — French (France)",company:"Amber Studio",location:"Montréal, QC",snippet:"Perform linguistic and functional QA testing on French (France) localized video game content, identifying text, audio and cultural issues before release.",url:"https://to.indeed.com/aastdx4wk6ys",posted:"Oct 6, 2025",jobType:"",salary:"From $17 an hour"},
];

function searchStaticJobs(query) {
  const q = (query || '').toLowerCase().trim();
  if (!q) return STATIC_JOBS;
  return STATIC_JOBS.filter(j =>
    j.title.toLowerCase().includes(q) ||
    j.company.toLowerCase().includes(q) ||
    j.snippet.toLowerCase().includes(q) ||
    j.jobType.toLowerCase().includes(q)
  );
}


// ===============================
// MAIN SEARCH (ENTRY POINT)
// ===============================

function runSearch() {
  const keywordsInput = document.getElementById('keywordsInput');
  const query = keywordsInput?.value.trim() || '';

  currentTypeFilter = 'all';
  document.querySelectorAll('#typeFilters .filter-chip').forEach((b, i) => {
    b.classList.toggle('active', i === 0);
  });

  jobsData = searchStaticJobs(query);
  visibleJobs = 12;
  renderJobs();
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
