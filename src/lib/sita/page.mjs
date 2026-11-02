import { createIcons, BookOpen, Sprout, Users, HeartHandshake, HandHeart, Heart, Mail, CalendarDays, MapPin, Play, X, CircleCheck } from 'lucide';
import { escape as e, safeUrl, publicOpportunities, opportunityType, videoId } from './model.mjs';
import { renderPage, opportunityCard, programCard, articleCard } from './render.mjs';
import { openRegistration, refreshRegistration } from '../public-programs/client.mjs';
import { programLanding } from '../public-programs/landing.mjs';
import { publicWording, programSeo } from '../public-programs/model.mjs';
import { mountPublicTestimonials } from '../testimonials/public.mjs';
const icons = { BookOpen, Sprout, Users, HeartHandshake, HandHeart, Heart, Mail, CalendarDays, MapPin, Play, X, CircleCheck };
export const refreshIcons = () => createIcons({ icons });
let registrationQueryOpened = false;

async function loadContent(preview) {
  if (preview) {
    const response = await fetch('/api/sita/content', { cache:'no-store' });
    if (!response.ok) throw new Error('Draft preview is available while the local editor is running.');
    const data = await response.json();
    return data.draft || data.published;
  }
  const response = await fetch('/content/sita.json', { cache:'no-store' });
  if (!response.ok) throw new Error('Unable to load SITA content.');
  return response.json();
}
export async function initSitaPage() {
  const root = document.querySelector('[data-sita-root]');
  if (!root) return;
  const navigation = document.querySelector('.site-header .nav');
  if (navigation) navigation.id = 'primary-menu';
  document.querySelector('.site-header')?.addEventListener('keydown',event => {
    if (event.key === 'Escape') {
      const header = document.querySelector('.site-header');
      header.dataset.open = 'false';
      const toggle = header.querySelector('.mobile-toggle');
      toggle?.setAttribute('aria-expanded','false'); toggle?.focus();
    }
  });
  const query = new URLSearchParams(location.search);
  const preview = query.get('preview') === 'draft';
  let content;
  try { content = await loadContent(preview); }
  catch (error) { if (preview) root.insertAdjacentHTML('afterbegin', `<p class="sita-preview-notice" role="alert">${e(error.message)}</p>`); refreshIcons(); return; }
  root.innerHTML = renderPage(content);
  if (preview) root.insertAdjacentHTML('afterbegin','<div class="sita-preview-notice">SITA draft preview <a href="/admin/sita/">Return to Control Center</a></div>');
  mountPublicTestimonials(root.querySelector('[data-testimonials-host]'),'SITA',content.programs);
  applySeo(content.seo);
  refreshIcons();
  const filters = { type:'', category:'', audience:'', search:'' };
  function filterOpportunities() {
    const opportunities = publicOpportunities(content).filter(o => {
      const program = content.programs.find(p => p.id === o.programId);
      return (!filters.type || opportunityType(o) === filters.type) && (!filters.category || program.category === filters.category) && (!filters.audience || o.audience === filters.audience) && (!filters.search || `${o.name} ${o.description} ${program.title}`.toLowerCase().includes(filters.search.toLowerCase()));
    });
    root.querySelector('[data-opportunity-list]').innerHTML = opportunities.map(o => opportunityCard(o,content)).join('');
    root.querySelector('[data-opportunity-count]').textContent = publicWording(`${opportunities.length} ${opportunities.length === 1 ? 'opportunity' : 'opportunities'}`);
    root.querySelector('[data-opportunity-empty]').hidden = opportunities.length > 0;
    refreshIcons();
  }
  root.addEventListener('input', event => {
    const filter = event.target.closest('[data-opportunity-filter]');
    if (filter) { filters[filter.dataset.opportunityFilter] = filter.value; filterOpportunities(); }
  });
  function playVideo(id,title) {
    document.querySelectorAll('iframe[src*="youtube-nocookie.com"]').forEach(frame=>frame.remove());
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1`;
    iframe.title = `Play ${title}`;
    iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true; iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    root.querySelector('[data-video-player]').replaceChildren(iframe);
  }
  root.addEventListener('click', event => {
    const switchVideo = event.target.closest('[data-switch-video]');
    if (switchVideo) {
      const video = content.videos.find(v => v.id === switchVideo.dataset.switchVideo);
      if (!video?.enabled || !videoId(video.url)) return;
      playVideo(videoId(video.url),video.title);
      root.querySelector('[data-video-title]').textContent = video.title;
      root.querySelector('[data-video-description]').textContent = String(video.description || '').slice(0,320);
      root.querySelectorAll('[data-switch-video]').forEach(row => row.setAttribute('aria-pressed',String(row === switchVideo)));
    }
    const play = event.target.closest('[data-play-video]');
    if (play) {
      playVideo(play.dataset.playVideo,root.querySelector('[data-video-title]')?.textContent || 'SITA video');
    }
  });
  const opportunityId = query.get('opportunityId') || query.get('opportunity');
  if (opportunityId && !registrationQueryOpened) {
    registrationQueryOpened = true;
    void openRegistration('sita', opportunityId);
  }
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
}
function applySeo(seo) {
  document.title = seo.title;
  const setMeta = (selector,value) => document.querySelector(selector)?.setAttribute('content',value);
  document.querySelector('meta[name="robots"]')?.removeAttribute('data-website-robots');
  const query=new URLSearchParams(location.search);
  setMeta('meta[name="robots"]',seo.index===false || query.get('preview')==='draft' || query.get('websitePreview')==='draft' ? 'noindex, nofollow' : 'index, follow');
  setMeta('meta[name="description"]',seo.description);
  setMeta('meta[property="og:title"]',seo.socialTitle || seo.title);
  setMeta('meta[property="og:description"]',seo.socialDescription || seo.description);
  document.querySelector('link[rel="canonical"]')?.setAttribute('href',safeUrl(seo.canonical));
}
export async function initSitaDetail(kind) {
  const root = document.querySelector('[data-sita-detail]');
  const preview = new URLSearchParams(location.search).get('preview') === 'draft';
  const content = await loadContent(preview).catch(() => null);
  if (!content || !root) return;
  const query = new URLSearchParams(location.search);
  const records = kind === 'program' ? content.programs.filter(p => p.active || preview) : content.articles.filter(a => a.published || preview);
  const record = records.find(r => r.slug === (query.get('slug') || root.dataset.sitaRecordSlug));
  if (!record) { root.innerHTML = '<h1>Page unavailable</h1><p>This page is not currently published.</p><a href="/sita/">Return to SITA</a>'; return; }
  if(kind==='program' && !preview && root.querySelector('[data-program-landing]'))return;
  applySeo({ title:record.seoTitle || record.title, description:record.seoDescription || record.shortDescription || record.excerpt, canonical:`https://programs.gloryofpeaceandlove.org/sita/${kind === 'program' ? '' : 'articles/'}${encodeURIComponent(record.slug)}/`,index:kind==='program'?programSeo(record,'sita').index:Boolean(record.body?.trim()) });
  if(kind==='program'){root.innerHTML=programLanding(record,content,'sita');await refreshRegistration();return;}
  root.innerHTML = `<a class="sita-text-link" href="/sita/">Back to SITA</a><h1>${e(record.title)}</h1><img src="${e(safeUrl(record.image))}" alt="${e(record.imageAlt)}"><p>${e(record.body)}</p>`;
}
export async function initSitaList(kind) {
  const content = await loadContent(false).catch(() => null);
  const root = document.querySelector('[data-sita-list]');
  if (content && root) root.innerHTML = kind === 'programs' ? content.programs.filter(p => p.active).map(programCard).join('') : content.articles.filter(a => a.published).map(articleCard).join('');
}
