// ═══════════════════════════════════════════════════════
//  Academia De la Pasiune la Profit · Shared JS
// ═══════════════════════════════════════════════════════

// ── SUPABASE CONFIG ─────────────────────────────────────
// Replace with your actual Supabase credentials
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

// ── NAV SCROLL ──────────────────────────────────────────
(function () {
  var nav = document.querySelector('.nav');
  if (!nav) return;
  window.addEventListener('scroll', function () {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
})();

// ── MOBILE NAV TOGGLE ───────────────────────────────────
function toggleNav() {
  var links = document.querySelector('.nav-links');
  if (links) links.classList.toggle('open');
}

// ── ACTIVE NAV LINK ─────────────────────────────────────
(function () {
  var path = window.location.pathname.replace(/\/$/, '') || '/';
  document.querySelectorAll('.nav-links a').forEach(function (a) {
    var href = a.getAttribute('href').replace(/\/$/, '') || '/';
    if (path === href || (href !== '/' && path.startsWith(href))) {
      a.classList.add('active');
    }
  });
})();

// ── TOAST ───────────────────────────────────────────────
function showToast(msg, type) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  t.classList.add('show');
  setTimeout(function () { t.classList.remove('show'); }, 3500);
}

// ── FAQ TOGGLE ──────────────────────────────────────────
function toggleFaq(btn) {
  var item = btn.closest('.faq-item');
  var isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(function (i) { i.classList.remove('open'); });
  if (!isOpen) item.classList.add('open');
}

// ── SMOOTH SCROLL ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var href = this.getAttribute('href');
      if (href === '#') return;
      var target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        var top = target.getBoundingClientRect().top + window.scrollY - 76;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });
});

// ── SUPABASE HELPERS ────────────────────────────────────
async function supabaseRequest(path, options) {
  var res = await fetch(SUPABASE_URL + path, Object.assign({
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + (getToken() || SUPABASE_ANON_KEY)
    }
  }, options));
  return res;
}

function getToken()  { return localStorage.getItem('sb_token'); }
function getUser()   { try { return JSON.parse(localStorage.getItem('sb_user')); } catch(e) { return null; } }
function setSession(token, user) {
  localStorage.setItem('sb_token', token);
  localStorage.setItem('sb_user', JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem('sb_token');
  localStorage.removeItem('sb_user');
}
function isLoggedIn() { return !!getToken() && !!getUser(); }

// ── AUTH GUARD ──────────────────────────────────────────
function requireAuth(redirectTo) {
  if (!isLoggedIn()) {
    window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
  }
}

// ── SIGN IN ─────────────────────────────────────────────
async function signIn(email, password) {
  var res = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email, password: password })
  });
  var data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || 'Eroare autentificare');
  setSession(data.access_token, data.user);
  return data;
}

// ── SIGN UP ─────────────────────────────────────────────
async function signUp(email, password, fullName) {
  var res = await fetch(SUPABASE_URL + '/auth/v1/signup', {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email, password: password, data: { full_name: fullName } })
  });
  var data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || 'Eroare înregistrare');
  if (data.access_token) setSession(data.access_token, data.user);
  return data;
}

// ── SIGN OUT ─────────────────────────────────────────────
async function signOut() {
  try {
    await fetch(SUPABASE_URL + '/auth/v1/logout', {
      method: 'POST',
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + getToken() }
    });
  } catch(e) {}
  clearSession();
  window.location.href = '/login';
}

// ── UPDATE NAV FOR AUTH STATE ────────────────────────────
(function () {
  var user = getUser();
  var loginLinks = document.querySelectorAll('.nav-login');
  var dashLinks = document.querySelectorAll('.nav-dashboard');
  loginLinks.forEach(function (el) { el.style.display = user ? 'none' : ''; });
  dashLinks.forEach(function (el) { el.style.display = user ? '' : 'none'; });
})();

// ── SCROLL REVEAL — mobile-safe ─────────────────
(function () {
  if (!('IntersectionObserver' in window)) return;
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });
  document.querySelectorAll('.reveal').forEach(function (el) {
    el.classList.add('animate-ready');
    observer.observe(el);
  });
})();
