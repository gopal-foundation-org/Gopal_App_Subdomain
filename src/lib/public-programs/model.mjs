import * as ram from '../ram/model.mjs';
import * as sita from '../sita/model.mjs';
export const PUBLIC_ORIGIN='https://programs.gloryofpeaceandlove.org';

export const initiatives = {
  ram: {label:'RAM', logo:'/logos/ram-logo.png', href:'/ram/'},
  sita: {label:'SITA', logo:'/logos/sita-logo.png', href:'/sita/'},
  community: {label:'Community Programs', logo:'/logos/bhaktisurabh-logo.jpg', href:'/community-programs/'}
};
export const models = {ram, sita};
export function entries(contents, now) {
  return Object.entries(models).flatMap(([scope, model]) => {
    const content=contents[scope];
    return content ? model.publicOpportunities(content,now).map(opportunity=>({scope,content,opportunity,program:content.programs.find(p=>p.id===opportunity.programId),type:model.opportunityType(opportunity,now)})) : [];
  });
}
export function resolveRegistration(contents,scope,id,now) {
  const entry=entries(contents,now).find(item=>item.scope===scope && item.opportunity.id===id);
  return entry ? {...entry,form:entry.content.forms.find(form=>form.id===entry.opportunity.formId)} : null;
}
export function programHref(program,scope) {
  return models[scope].programUrl(program);
}
export function programFacts(program,opportunity) {
  const facts=[];
  const add=(label,value)=>{if(typeof value==='string' && value.trim())facts.push({label,value:value.trim()});};
  add('For',opportunity?.audience || program.audience);
  add('Format',opportunity?.format || program.format);
  if(opportunity?.location && opportunity.location!==opportunity.format)add('Location',opportunity.location);
  if(opportunity?.startDate) {
    const date=value=>new Intl.DateTimeFormat('en-US',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z'));
    add('Dates',date(opportunity.startDate)+(opportunity.endDate?' - '+date(opportunity.endDate):''));
  }
  add('Schedule',opportunity?.schedule || program.schedule);
  if(opportunity?.schedule)add('Time zone',opportunity.timezone);
  add('Language',opportunity?.language || program.language);
  if(program.fee===0 || program.price===0)add('Fee','Free');
  else add('Fee',typeof program.fee==='string'?program.fee:typeof program.price==='string'?program.price:'');
  return facts;
}
export function publicWording(value='') {
  return String(value).replace(/Find Open Opportunities|Open Opportunities/g,'Programs Open Now').replace(/\bopportunities\b/g,'programs').replace(/\bopportunity\b/g,'program');
}
export function publicSectionOrder(sections) {
  const visible=sections.filter(section=>section.visible);
  const programs=visible.findIndex(section=>section.id==='programs'),open=visible.findIndex(section=>section.id==='opportunities');
  if(programs>=0 && open>programs)visible.splice(programs,0,...visible.splice(open,1));
  return visible;
}
export function programSeo(program,scope) {
  return {title:program.seoTitle || `${program.title} | GOPAL Foundation`,description:program.seoDescription || program.shortDescription || '',canonical:`${PUBLIC_ORIGIN}/${scope}/${scope==='ram'?'programs/':''}${encodeURIComponent(program.slug)}/`,socialImage:program.socialImage || program.image,index:program.index!==false && Boolean(program.fullDescription?.trim())};
}
export function programFaq(program,opportunities) {
  const configured=(program.faqText || '').split('\n').filter(line=>line.includes('|')).map(line=>{const [question,...answer]=line.split('|');return {question:question.trim(),answer:answer.join('|').trim()};}).filter(item=>item.question&&item.answer);
  if(configured.length)return configured;
  const facts=programFacts(program,opportunities.length===1?opportunities[0]:null);
  const questions={'For':'Who can join?','Format':'How is the program offered?','Language':'What language is the program in?','Fee':'What is the program fee?'};
  return facts.filter(fact=>questions[fact.label]).map(fact=>({question:questions[fact.label],answer:fact.value}));
}
