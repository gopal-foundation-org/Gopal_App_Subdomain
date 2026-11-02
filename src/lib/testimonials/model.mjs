import { escape as e, safeUrl, ordered, videoId } from '../ram/model.mjs';
export const associations = r => Array.isArray(r.initiative) ? r.initiative : [r.initiative];
export function publicTestimonials(content,initiative,program = '') {
  const settings = content.settings?.[initiative] || {};
  if (!settings.visible) return {settings:{heading:settings.heading,intro:settings.intro,visible:false,count:settings.count},records:[]};
  const records = ordered(content.records || []).filter(r => !r.archived && r.published === true && r.consentConfirmed === true && associations(r).includes(initiative) && (!program || r.program === program)).sort((a,b)=>Number(Boolean(b.featured))-Number(Boolean(a.featured))).slice(0,Math.max(3,Math.min(6,Number(settings.count)||6))).map(({id,displayName,role,city,testimonialText,image,imageAlt,videoUrl,date,program,initiative})=>({id,displayName,role,city,testimonialText,image,imageAlt,videoUrl,date,program,initiative}));
  return {settings:{heading:settings.heading,intro:settings.intro,visible:true,count:settings.count},records};
}
export function programTestimonials(content,initiative,program) {
  if(!program)return publicTestimonials(content,initiative);
  const specific=publicTestimonials(content,initiative,program);
  if(specific.records.length || !specific.settings.visible)return specific;
  const general={...content,records:(content.records || []).filter(record=>!record.program)};
  return publicTestimonials(general,initiative);
}
export function validateTestimonials(c) {
  if (c?.version !== 1 || !Array.isArray(c.records) || !c.settings) throw new Error('Please check testimonial settings.');
  const ids = new Set();
  function privateKeys(value){if(!value||typeof value!=='object')return;for(const [key,item] of Object.entries(value)){if(['responses','submissions','participants','backendToken','passwordHash','privateKey','clientSecret','accessToken','refreshToken','sheetCredentials'].includes(key))throw new Error('Private records and credentials cannot be stored in testimonial content.');privateKeys(item);}}
  privateKeys(c);
  for (const r of c.records) {
    if (!/^[\w-]{1,120}$/.test(r.id) || ids.has(r.id)) throw new Error('Each testimonial needs a unique ID.'); ids.add(r.id);
    if (!associations(r).length || associations(r).some(i=>!['RAM','SITA','COMMUNITY'].includes(i))) throw new Error('Choose a testimonial initiative.');
    for(const key of ['displayName','role','city','testimonialText','image','imageAlt','videoUrl','date','program'])if(r[key]!==undefined&&(typeof r[key]!=='string'||r[key].length>8000))throw new Error('Please check the testimonial text fields.');
    for(const key of ['published','consentConfirmed','featured','archived'])if(r[key]!==undefined&&typeof r[key]!=='boolean')throw new Error('Choose valid testimonial visibility and consent settings.');
    if (r.published && (!r.consentConfirmed || !r.displayName?.trim() || !r.testimonialText?.trim() || r.archived)) throw new Error('Confirm consent and complete the name and quote before publishing.');
    if (r.videoUrl && !videoId(r.videoUrl)) throw new Error('Use a valid YouTube link for a video testimonial.');
    if (r.image && safeUrl(r.image,'') !== r.image) throw new Error('Choose a valid image.');
  }
  return c;
}
export function testimonialMarkup(data,programs = []) {
  const records=(data?.records || []).filter(record=>record.testimonialText?.trim());
  if(!records.length || !data.settings.visible)return '';
  return `<section class="testimonial-section" id="testimonials" aria-labelledby="testimonials-heading"><div class="container"><header><p class="testimonial-eyebrow">Our learning community</p><h2 id="testimonials-heading">${e(data.settings.heading || 'What Participants Say')}</h2>${data.settings.intro?`<p>${e(data.settings.intro)}</p>`:''}</header><div class="testimonial-grid">${records.map(record=>{
    const image=record.image && safeUrl(record.image,'');
    const program=programs.find(program=>program.id===record.program)?.title;
    const initiative=associations(record).filter(scope=>['RAM','SITA','COMMUNITY'].includes(scope)).map(scope=>scope==='COMMUNITY'?'Community Programs':scope).join(' / ');
    const date=record.date && Number.isFinite(Date.parse(record.date))?new Date(record.date).toLocaleDateString('en-US',{timeZone:'UTC',month:'long',year:'numeric'}):'';
    const context=[...new Set([record.role,program || initiative,record.city,date].filter(Boolean))].join(' / ');
    return `<article class="testimonial-card" data-testimonial-id="${e(record.id)}"><blockquote><p>${e(record.testimonialText)}</p></blockquote><div class="testimonial-identity">${image?`<img class="testimonial-photo" src="${e(image)}" alt="${e(record.imageAlt || record.displayName || '')}" width="56" height="56" loading="lazy">`:''}<div>${record.displayName?`<p class="testimonial-name">${e(record.displayName)}</p>`:''}${context?`<p class="testimonial-context">${e(context)}</p>`:''}</div></div>${videoId(record.videoUrl)?`<button type="button" class="testimonial-video" data-testimonial-video="${videoId(record.videoUrl)}" aria-label="Play testimonial${record.displayName?' by '+e(record.displayName):''}"><img src="https://i.ytimg.com/vi/${videoId(record.videoUrl)}/hqdefault.jpg" alt="" width="480" height="270" loading="lazy"><span>Play Testimonial</span></button>`:''}</article>`;
  }).join('')}</div></div></section>`;
}
