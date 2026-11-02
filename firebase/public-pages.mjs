import {load} from 'cheerio';
import {programGrid} from '../src/lib/public-programs/cards.mjs';
import {entries} from '../src/lib/public-programs/model.mjs';
import {homeTestimonials,homeResources} from '../src/lib/public-programs/surfaces.mjs';

export async function renderPublicSurface(request,response,cms) {
  const path=new URL(request.url).pathname.replace(/\/+$/,'') || '/';
  if(!['/','/programs','/community-programs'].includes(path) || !response.headers.get('Content-Type')?.includes('text/html'))return response;
  const contents={ram:await cms.published('ram'),sita:await cms.published('sita')};
  const $=load(await response.text());
  $('[data-public-programs]').each((_index,root)=>{
    const scope=$(root).attr('data-program-scope') || '',limit=Number($(root).attr('data-program-limit')) || 0;
    $(root).find('[data-public-program-grid]').html(programGrid(contents,{scope,limit}));
    const count=entries(contents).filter(entry=>!scope || entry.scope===scope).length;
    $(root).find('[data-public-program-count]').text(`${count} ${count===1?'program':'programs'} available`);
  });
  if(path==='/') {
    $('[data-ux-home-testimonials]').html(homeTestimonials(await cms.published('testimonials'),contents));
    $('[data-ux-home-resources]').html(homeResources(contents));
  }
  const headers=new Headers(response.headers);headers.delete('Content-Length');headers.set('Cache-Control','no-store');
  return new Response($.html(),{status:response.status,headers});
}
