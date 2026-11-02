import {createIcons,BookOpen,Sprout,Users,HeartHandshake,HandHeart,Heart,Mail,CalendarDays,MapPin,Play,X,CircleCheck} from 'lucide';
import {entries,resolveRegistration,models,programFacts} from './model.mjs';
import {TYPES} from '../ram/model.mjs';
import {programCard} from './cards.mjs';
import {registrationMarkup,successMarkup} from './registration.mjs';
import {confirmedSubmission as submitRam} from '../ram/submission.mjs';
import {confirmedSubmission as submitSita} from '../sita/submission.mjs';
import {bindTestimonialVideos} from '../testimonials/public.mjs';

const definitions=new WeakMap(),pending=new WeakSet(),confirmed=new Set();
const generations=new WeakMap(),returnTargets=new WeakMap();
const boundTestimonials=new WeakSet();
const preview=new URLSearchParams(location.search).get('preview')==='draft' || new URLSearchParams(location.search).get('websitePreview')==='draft';
const icons={BookOpen,Sprout,Users,HeartHandshake,HandHeart,Heart,Mail,CalendarDays,MapPin,Play,X,CircleCheck};
const refreshIcons=()=>createIcons({icons});
document.addEventListener('error',event=>{
  const image=event.target;
  if(image instanceof HTMLImageElement && image.matches('.ux-card-image,.ux-resource-link img') && !image.dataset.fallback){image.dataset.fallback='true';image.src='/images/hero-riverside-diya.png';}
},true);
let activeDialog;
async function loadContent(scope) {
  if(!models[scope])throw Error('Program unavailable.');
  const response=await fetch(preview?`/api/${scope}/content`:`/content/${scope}.json`,{cache:'no-store'});
  if(!response.ok)throw Error('We could not load the registration form. Please try again.');
  const data=await response.json();
  return preview?(data.draft || data.published):data;
}
function mount(host,scope,id,content) {
  const contents={[scope]:content},selected=resolveRegistration(contents,scope,id);
  host.innerHTML=registrationMarkup(contents,scope,id,{preview,pending:false});
  host.dataset.registrationScope=scope;host.dataset.opportunityId=id;
  const form=host.querySelector('form');
  if(form && selected)bindForm(host,form,selected);
  if(!host.closest('dialog'))host.querySelector('[data-close-form]')?.remove();
  refreshIcons();
  return form;
}
function bindForm(host,form,selected) {
  definitions.set(form,selected);
  form.querySelector('[type="submit"]').disabled=preview;
  const landing=host.closest('[data-program-landing]');
  if(!landing)return;
  const facts=landing.querySelector('.ux-program-facts');
  facts?.replaceChildren(...programFacts(selected.program,selected.opportunity).map(fact=>{
    const row=document.createElement('div'),term=document.createElement('dt'),value=document.createElement('dd');
    term.textContent=fact.label;value.textContent=fact.value;row.append(term,value);return row;
  }));
  landing.querySelectorAll('a.button[href="#register"]').forEach(button=>{button.firstChild.textContent=TYPES[selected.opportunity.registrationType].button+' ';});
  const batch=landing.querySelector('[data-program-batch]');if(batch)batch.value=selected.opportunity.id;
}
export async function openRegistration(scope,id,trigger) {
  if(!models[scope] || activeDialog?.open)return;
  const inline=document.querySelector('[data-registration-host]:not(dialog [data-registration-host])');
  if(inline?.querySelector('[aria-busy="true"]'))return;
  let dialog,host=inline;
  if(!host) {
    dialog=document.createElement('dialog');dialog.className='ux-registration-dialog';
    dialog.setAttribute('aria-label','Program registration');
    host=document.createElement('div');host.className='ux-dialog-body';host.dataset.registrationHost='';
    dialog.append(host);document.body.append(dialog);activeDialog=dialog;
    dialog.addEventListener('cancel',event=>{if(dialog.querySelector('[aria-busy="true"]'))event.preventDefault();});
    dialog.addEventListener('close',()=>{dialog.remove();if(activeDialog===dialog)activeDialog=null;trigger?.focus();},{once:true});
    dialog.showModal();
  }
  if(trigger)returnTargets.set(host,trigger);
  const generation=(generations.get(host)||0)+1;generations.set(host,generation);
  host.innerHTML='<p role="status">Loading the registration form...</p>';
  try {
    const content=await loadContent(scope);
    if(generations.get(host)!==generation)return;
    if(dialog && !dialog.isConnected)return;
    mount(host,scope,id,content);
    if(dialog){
      dialog.setAttribute('aria-labelledby','selected-form-heading');
      if(!host.querySelector('form'))host.insertAdjacentHTML('beforeend','<button type="button" class="button" data-close-form>Close</button>');
    }
    const heading=host.querySelector('h2') || host;heading.tabIndex=-1;heading.focus({preventScroll:true});
    if(inline)host.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  } catch {
    if(generations.get(host)!==generation)return;
    host.innerHTML='<p role="alert">We could not load the registration form. Please try again.</p><button type="button" class="button" data-close-form>Close</button>';
  }
}
async function submit(event) {
  const form=event.target.closest('[data-ram-registration],[data-sita-registration]');
  if(!form)return;
  event.preventDefault();
  if(preview || pending.has(form))return;
  const selected=definitions.get(form),status=form.querySelector('[data-submission-status]');
  if(!selected){status.textContent='Please reopen this registration form and try again.';return;}
  for(const group of form.querySelectorAll('[data-required-group="true"]'))group.querySelector('input')?.setCustomValidity(group.querySelector('input:checked')?'':'Please select at least one option.');
  if(!form.reportValidity())return;
  const {scope,opportunity,program,form:definition}=selected;
  if(!models[scope].opportunityType(opportunity)){status.textContent='Registration for this program is no longer open.';return;}
  const data=new FormData(form),submissionId=form.dataset.submissionId || crypto.randomUUID();
  form.dataset.submissionId=submissionId;
  const responses=Object.fromEntries(definition.questions.filter(question=>question.enabled).map(question=>[question.id,data.getAll(question.id).join('; ')]));
  const payload={submissionId,submittedAt:new Date().toISOString(),opportunityId:opportunity.id,opportunityName:opportunity.name,registrationType:opportunity.registrationType,formId:definition.id,formName:definition.name,programId:program.id,programName:program.title,initiative:scope.toUpperCase(),responses};
  const button=form.querySelector('[type="submit"]'),label=button.textContent;
  pending.add(form);form.setAttribute('aria-busy','true');button.disabled=true;button.textContent='Submitting...';status.textContent='';
  try {
    const receipt=await(scope==='sita'?submitSita:submitRam)({adapter:'privateProxy',endpoint:`/api/${scope}/registrations/submit`},payload);
    if(receipt.success!==true || receipt.submissionId!==submissionId)throw Error('Unconfirmed receipt.');
    // This success-only signal contains no participant data and never runs on open/failure.
    if(!confirmed.has(submissionId)) {
      confirmed.add(submissionId);
      document.dispatchEvent(new CustomEvent('sitaram:registration-confirmed',{detail:{submissionId,initiative:scope.toUpperCase()}}));
    }
    const host=form.closest('[data-registration-host]'),parent=form.closest('dialog'),returnTarget=returnTargets.get(host) || host;
    host.innerHTML='<p role="status">Your submission has been received.</p>';
    parent?.close();
    const popup=document.createElement('dialog');popup.className='ram-success-dialog ux-registration-dialog';popup.setAttribute('aria-labelledby','selected-form-heading');
    const email=document.querySelector('[data-website-email]')?.textContent?.trim() || '';
    popup.innerHTML=successMarkup(selected,email);document.body.append(popup);
    popup.addEventListener('close',()=>{popup.remove();if(returnTarget.isConnected){if(returnTarget===host)host.tabIndex=-1;returnTarget.focus();}},{once:true});
    refreshIcons();popup.showModal();
  } catch {status.textContent='We could not confirm your submission. Please try again. Your answers have been kept.';}
  finally {pending.delete(form);form.removeAttribute('aria-busy');if(button.isConnected){button.disabled=false;button.textContent=label;}}
}

document.addEventListener('submit',submit);
document.addEventListener('input',event=>event.target.closest('[data-required-group="true"]')?.querySelector('input')?.setCustomValidity(''));
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-register-opportunity]');
  if(button){event.preventDefault();openRegistration(button.dataset.registerScope,button.dataset.registerOpportunity,button);}
  const close=event.target.closest('[data-close-form]');
  if(close && !close.closest('dialog')?.querySelector('[aria-busy="true"]'))close.closest('dialog')?.close();
  const video=event.target.closest('[data-ux-videos] [data-play-video],[data-ux-videos] [data-switch-video]');
  if(video)playVideo(video);
});
document.addEventListener('change',async event=>{
  const batch=event.target.closest('[data-program-batch]');
  if(!batch)return;
  const host=document.querySelector('[data-registration-host]');
  if(host?.querySelector('[aria-busy="true"]')){batch.value=host.dataset.opportunityId;return;}
  await openRegistration(batch.dataset.programBatch,batch.value,batch);
});
async function playVideo(button) {
  const root=button.closest('[data-ux-videos]');
  let id=button.dataset.playVideo || button.dataset.videoId,video;
  if(button.dataset.switchVideo) {
    const scope=root.closest('[data-program-landing]')?.dataset.programLanding;
    try{video=(await loadContent(scope)).videos.find(item=>item.id===button.dataset.switchVideo && item.enabled);id=video && models[scope].videoId(video.url);}catch{return;}
  }
  if(!/^[\w-]{11}$/.test(id || ''))return;
  if(!root.isConnected)return;
  document.querySelectorAll('iframe[src*="youtube-nocookie.com"]').forEach(frame=>frame.remove());
  const frame=document.createElement('iframe');frame.src=`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1`;frame.title=button.getAttribute('aria-label') || button.textContent.trim() || 'Program video';frame.allow='autoplay; encrypted-media; picture-in-picture';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';
  root.querySelector('[data-video-player]')?.replaceChildren(frame);
  if(video){root.querySelector('[data-video-title]').textContent=video.title;root.querySelector('[data-video-description]').textContent=String(video.description || '').slice(0,320);}
  root.querySelectorAll('[data-switch-video]').forEach(row=>row.setAttribute('aria-pressed',String(row===button)));
}
export async function refreshRegistration() {
  bindAdditionalTestimonials();
  const host=document.querySelector('[data-registration-host]');
  if(!host)return;
  if(host.querySelector('[aria-busy="true"]'))return;
  const scope=host.dataset.registrationScope,id=host.dataset.opportunityId;
  const generation=(generations.get(host)||0)+1;generations.set(host,generation);
  const original=host.querySelector('form');
  if(original?.querySelector('[type="submit"]'))original.querySelector('[type="submit"]').disabled=true;
  try{
    const content=await loadContent(scope);if(generations.get(host)!==generation)return;
    const selected=resolveRegistration({[scope]:content},scope,id);
    if(original && selected && original.dataset.registrationDefinition===JSON.stringify(selected.form)) {
      bindForm(host,original,selected);host.querySelector('[data-close-form]')?.remove();
    } else {
      const answers=original?new FormData(original):null;
      const next=mount(host,scope,id,content);
      if(answers && next)for(const control of next.querySelectorAll('[name]')){
        if(!answers.has(control.name))continue;
        if(['checkbox','radio'].includes(control.type))control.checked=answers.getAll(control.name).includes(control.value);
        else control.value=answers.get(control.name);
      }
    }
  }
  catch{if(generations.get(host)!==generation)return;const status=host.querySelector('[data-submission-status]');if(status)status.textContent='Please reload to load the current registration form.';}
}
function bindAdditionalTestimonials() {
  document.querySelectorAll('[data-ux-home-testimonials],[data-program-landing]').forEach(root=>{if(!boundTestimonials.has(root)){boundTestimonials.add(root);bindTestimonialVideos(root);}});
}
async function hydrateDirectory() {
  const root=document.querySelector('[data-public-programs]');if(!root)return;
  const scope=root.dataset.programScope || '',limit=Number(root.dataset.programLimit) || 0;
  let contents={};
  try{const data=await Promise.all(['ram','sita'].map(loadContent));contents={ram:data[0],sita:data[1]};}catch{return;}
  const filter={scope,type:''};
  function render() {
    const all=entries(contents).filter(entry=>(!filter.scope || entry.scope===filter.scope)&&(!filter.type || entry.type===filter.type));
    root.querySelector('[data-public-program-grid]').innerHTML=(limit?all.slice(0,limit):all).map(programCard).join('') || '<p class="ux-empty">No programs match this selection. <a href="/contact/">Contact our team</a> for future sessions.</p>';
    const count=root.querySelector('[data-public-program-count]');if(count)count.textContent=`${all.length} ${all.length===1?'program':'programs'} available`;
  }
  root.addEventListener('change',event=>{const control=event.target.closest('[data-program-filter]');if(control){filter[control.dataset.programFilter]=control.value;render();}});
  render();
}
refreshRegistration();hydrateDirectory();refreshIcons();
