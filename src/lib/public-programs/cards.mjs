import {escape as e,safeUrl,TYPES} from '../ram/model.mjs';
import {entries,initiatives,programHref,programFacts} from './model.mjs';

export function registrationButton(scope,opportunity,{className='button button--primary',label='',controls=''}={}) {
  const type=TYPES[opportunity.registrationType];
  if(!type)return '';
  return `<button type="button" class="${e(className)}" data-register-scope="${e(scope)}" data-register-opportunity="${e(opportunity.id)}"${controls?` aria-controls="${e(controls)}"`:''}>${e(label || type.button)}<span aria-hidden="true">&rarr;</span></button>`;
}
export function programCard({scope,opportunity,program}) {
  const initiative=initiatives[scope],type=TYPES[opportunity.registrationType];
  const href=programHref(program,scope);
  const facts=programFacts(program,opportunity).filter(fact=>['For','Format','Dates'].includes(fact.label));
  return `<article class="ux-program-card" data-opportunity-card="${e(opportunity.id)}" data-initiative="${e(scope)}" data-registration-type="${e(opportunity.registrationType)}"><a class="ux-card-media" href="${e(href)}" tabindex="-1" aria-hidden="true"><img class="ux-card-image" src="${e(safeUrl(opportunity.image || program.image,'/images/hero-riverside-diya.png'))}" alt="" width="640" height="360" loading="lazy"></a><div class="ux-card-body"><span class="ux-initiative-label"><img src="${initiative.logo}" alt="" width="28" height="28">${e(initiative.label)}</span><h3><a href="${e(href)}">${e(program.title)}</a></h3>${program.shortDescription?`<p>${e(program.shortDescription)}</p>`:''}${opportunity.name!==program.title?`<p class="ux-batch-name">${e(opportunity.name)}</p>`:''}<ul class="ux-card-facts">${facts.map(fact=>`<li><strong>${e(fact.label)}</strong><span>${e(fact.value)}</span></li>`).join('')}</ul><span class="ux-state" data-tone="${type.tone}">${e(type.label)}</span><div class="ux-card-actions">${registrationButton(scope,opportunity)}<a href="${e(href)}" class="ux-detail-link">Program details</a></div></div></article>`;
}
export function programGrid(contents,{scope='',limit=0}={}) {
  const all=entries(contents).filter(entry=>!scope || entry.scope===scope);
  const selected=limit?all.slice(0,limit):all;
  return selected.length?selected.map(programCard).join(''):'<p class="ux-empty">No programs are open to join here at the moment. <a href="/contact/">Contact our team</a> or explore the other initiatives.</p>';
}
export function filtersMarkup() {
  return `<div class="ux-filters"><fieldset><legend>Initiative</legend>${[['','All'],['ram','RAM'],['sita','SITA'],['community','Community Programs']].map(([value,label])=>`<label><input type="radio" name="program-initiative" value="${value}" data-program-filter="scope" ${value?'':'checked'}><span>${label}</span></label>`).join('')}</fieldset><label class="ux-type-filter">Registration<select data-program-filter="type"><option value="">All registration types</option>${Object.entries(TYPES).map(([value,type])=>`<option value="${value}">${e(type.label)}</option>`).join('')}</select></label></div>`;
}
