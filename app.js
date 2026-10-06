// Header nav
const header = document.querySelector('.site-header');
const toggle = document.querySelector('.menu-toggle');
const nav = document.getElementById('nav');
let lastScroll = 0;

function updateHeader() {
  const scroll = window.scrollY;
  if (scroll > lastScroll && scroll > 80) header.classList.add('is-hidden');
  else header.classList.remove('is-hidden');
  lastScroll = scroll;
}

toggle.addEventListener('click', () => {
  toggle.setAttribute('aria-expanded', toggle.getAttribute('aria-expanded') === 'false' ? 'true' : 'false');
  nav.classList.toggle('open');
});

nav.querySelectorAll('a:not(.btn-blue)').forEach(link => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  });
});

window.addEventListener('scroll', updateHeader, { passive: true });

// Progress bar
const progress = document.querySelector('.progress');
function updateProgress() {
  const scroll = window.scrollY;
  const height = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.transform = `scaleX(${height ? scroll / height : 0})`;
}
window.addEventListener('scroll', updateProgress, { passive: true });

// Reveal on scroll
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: .1 });

document.querySelectorAll('.reveal, .split-line, .pop').forEach(el => observer.observe(el));

// Manifesto scroll fill
const manifesto = document.getElementById('manifesto');
if (manifesto) {
  const text = manifesto.querySelector('.manifesto-text');
  const words = text.querySelectorAll('.w');
  const manifest_io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const rect = entry.target.getBoundingClientRect();
        const top = -rect.top;
        const height = rect.height - window.innerHeight;
        const progress_val = Math.max(0, Math.min(1, top / height));
        words.forEach((w, i) => {
          const start = parseFloat(w.dataset.from || 0) / 100;
          const width = (1 / words.length) * .98;
          if (progress_val >= start && progress_val < start + width) w.classList.add('on');
          else w.classList.remove('on');
        });
      }
    });
  }, { threshold: 0 });
  manifest_io.observe(manifesto);
}

// Zoom circle
const zoom = document.querySelector('.zoom');
if (zoom) {
  const zoom_io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const rect = entry.target.getBoundingClientRect();
        const top = -rect.top;
        const height = rect.height - window.innerHeight;
        const p = Math.max(0, Math.min(1, top / height));
        const circle = entry.target.querySelector('.zoom-circle');
        circle.style.setProperty('--r', `${9 + p * 40}vmin`);
        circle.style.setProperty('--s', `${1 - p * .7}`);
        circle.style.setProperty('--o', p);
      }
    });
  }, { threshold: 0 });
  zoom_io.observe(zoom);
}

// Horizontal scroll
const hscroll = document.getElementById('hscroll');
if (hscroll) {
  const track = hscroll.querySelector('.hscroll-track');

  function updateHScroll() {
    const rect = hscroll.getBoundingClientRect();
    const progress_val = Math.max(0, Math.min(1, (-rect.top) / (rect.height - window.innerHeight)));
    const offset = progress_val * (track.scrollWidth - window.innerWidth);
    track.style.transform = `translateX(${-offset}px)`;
  }

  const hscroll_io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      window.addEventListener('scroll', updateHScroll, { passive: true });
      hscroll_io.unobserve(hscroll);
    }
  }, { threshold: .1 });
  hscroll_io.observe(hscroll);
}

// Cursor
const cursor = document.getElementById('cursor');
if (cursor && !window.matchMedia('(hover: none)').matches) {
  document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
    cursor.classList.add('on');
  });
  document.addEventListener('mouseleave', () => cursor.classList.remove('on'));

  document.querySelectorAll('button, a, .strip-name').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('big'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('big'));
  });
}

// Hero animation
window.addEventListener('load', () => {
  document.getElementById('hero')?.classList.add('ready');
});

// Fetch brands
let brandsPromise;
async function getBrands() {
  if (!brandsPromise) {
    brandsPromise = fetch('/brands.json').then(r => {
      if (!r.ok) throw new Error('Katılımcılar yüklenemedi');
      return r.json();
    });
  }
  return brandsPromise;
}

// Strip buttons
document.querySelectorAll('.strip-name').forEach(btn => {
  btn.addEventListener('click', () => {
    const idx = parseInt(btn.dataset.idx);
    window.location.href = '/katilimcilar#' + idx;
  });
});

// Calendar
const calBtn = document.getElementById('calendar');
if (calBtn) {
  calBtn.addEventListener('click', () => {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Fevzipasa//Tasarim Pazari//TR', 'CALSCALE:GREGORIAN'];
    for (let day = 9; day <= 11; day++) {
      const date = '202610' + String(day).padStart(2, '0');
      lines.push(
        'BEGIN:VEVENT',
        `UID:${date}@fevzipasa.local`,
        'DTSTAMP:202610061T200000Z',
        `DTSTART:${date}T110000`,
        `DTEND:${date}T210000`,
        'SUMMARY:Fevzipaşa Tasarım Pazarı 5. Edisyon',
        'DESCRIPTION:Yerel tasarımcılar ve esnaflar Çanakkale\'de buluşuyor',
        'LOCATION:Fevzipaşa Mahallesi, Çanakkale',
        'END:VEVENT'
      );
    }
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fevzipasa.ics';
    a.click();
    URL.revokeObjectURL(url);
    document.getElementById('status').textContent = 'Takvim dosyası indirildi.';
  });
}

// Page transitions
const curtain = document.getElementById('curtain');
if (curtain) {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="/"]');
    if (link && !link.hasAttribute('download') && link.hostname === location.hostname) {
      e.preventDefault();
      curtain.classList.remove('out', 'in-from-below');
      setTimeout(() => {
        window.location.href = link.href;
      }, 400);
    }
  });

  if (document.readyState === 'loading') {
    curtain.classList.add('in-from-below');
    addEventListener('DOMContentLoaded', () => {
      setTimeout(() => curtain.classList.add('out'), 100);
    });
  } else {
    setTimeout(() => curtain.classList.add('out'), 100);
  }
}

// Local dev sync
if (['127.0.0.1', 'localhost'].includes(location.hostname)) {
  let previous;
  let checking = false;
  setInterval(async () => {
    if (checking || document.hidden) return;
    checking = true;
    try {
      const response = await fetch('/__version', { cache: 'no-store' });
      const current = (await response.json()).version;
      if (previous && current !== previous) {
        const key = 'fevzipasa-scroll:' + location.pathname;
        sessionStorage.setItem(key, String(scrollY));
        location.reload();
      }
      previous = current;
    } catch {} finally {
      checking = false;
    }
  }, 1500);

  const key = 'fevzipasa-scroll:' + location.pathname;
  const saved = sessionStorage.getItem(key);
  if (saved !== null) {
    sessionStorage.removeItem(key);
    requestAnimationFrame(() => scrollTo(0, Number(saved)));
  }
}

// Participants page
const filtersContainer = document.getElementById('filters');
const makersList = document.getElementById('makers');
const hoverImg = document.querySelector('.hover-img img');
const dialog = document.getElementById('brand-detail');

if (filtersContainer && makersList) {
  let currentFilter = 'all';
  let brands = [];

  async function loadAndRenderBrands() {
    brands = await getBrands();
    renderRows();
    handleHashParameter();
  }

  function renderRows() {
    const rows = makersList.querySelectorAll('.p-row');
    rows.forEach((row, idx) => {
      const category = row.dataset.category;
      const show = currentFilter === 'all' || currentFilter === category;
      row.style.display = show ? '' : 'none';
    });
  }

  function handleHashParameter() {
    const idx = parseInt(location.hash.slice(1));
    if (!isNaN(idx) && idx >= 0 && idx < brands.length) {
      openBrandDialog(idx);
    }
  }

  function openBrandDialog(idx) {
    const brand = brands[idx];
    if (!brand) return;
    const dlgImg = dialog.querySelector('img');
    const dlgH2 = dialog.querySelector('h2');
    const dlgP = dialog.querySelector('p');
    dlgImg.src = brand.image;
    dlgImg.alt = brand.name;
    dlgH2.textContent = brand.name;
    dlgP.textContent = brand.description;
    dialog.showModal();
  }

  // Filter buttons
  filtersContainer.querySelectorAll('.filter').forEach(btn => {
    btn.addEventListener('click', () => {
      filtersContainer.querySelectorAll('.filter').forEach(b => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      currentFilter = btn.dataset.category;
      renderRows();
    });
  });

  // Participant rows
  makersList.querySelectorAll('.p-row button').forEach((btn, idx) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openBrandDialog(idx);
    });
  });

  // Participant rows hover image
  makersList.querySelectorAll('.p-row').forEach((row, idx) => {
    row.addEventListener('mouseenter', () => {
      if (hoverImg) {
        hoverImg.src = row.dataset.image;
        hoverImg.alt = row.querySelector('.name').textContent;
      }
    });
  });

  // Dialog close button
  if (dialog) {
    dialog.querySelector('.dlg-close').addEventListener('click', () => {
      dialog.close();
    });
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });
  }

  loadAndRenderBrands();
}
