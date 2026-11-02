import {escape as e,safeUrl,videoId,ordered} from '../ram/model.mjs';
import {publicTestimonials,testimonialMarkup} from '../testimonials/model.mjs';
export function homeTestimonials(feedback,contents) {
  const data=['RAM','SITA','COMMUNITY'].map(scope=>publicTestimonials(feedback,scope));
  const records=[...new Map(data.flatMap(item=>item.records).map(record=>[record.id,record])).values()].slice(0,3);
  return testimonialMarkup({settings:{visible:true,heading:'What Participants Say'},records},Object.values(contents).flatMap(content=>content.programs));
}
export function homeResources(contents) {
  const resources=Object.entries(contents).flatMap(([scope,content])=>{
    const video=ordered(content.videos).find(item=>item.enabled && videoId(item.url));
    const article=ordered(content.articles).find(item=>item.published);
    return [{...(video || {}),kind:'video',scope}, {...(article || {}),kind:'article',scope}].filter(item=>item.id);
  }).slice(0,3);
  return resources.length?`<section class="ux-section"><div class="container"><div class="ux-section-heading"><div><h2>Videos &amp; Resources</h2><p>Explore the ideas and learning behind our programs.</p></div><a href="/articles/" class="ux-section-link">Explore resources &rarr;</a></div><div class="ux-resource-strip">${resources.map(item=>`<a class="ux-resource-link" href="${item.kind==='video'?`/${item.scope}/#${item.scope}-videos`:`/${item.scope}/articles/${encodeURIComponent(item.slug)}/`}"><img src="${e(safeUrl(item.kind==='video'?item.thumbnail || 'https://i.ytimg.com/vi/'+videoId(item.url)+'/hqdefault.jpg':item.image,'/images/hero-riverside-diya.png'))}" alt="" width="400" height="225" loading="lazy"><div><span class="ux-initiative-label">${e(item.scope.toUpperCase())} / ${item.kind==='video'?'Watch':'Read'}</span><h3>${e(item.title)}</h3></div></a>`).join('')}</div></div></section>`:'';
}
