import { defineConfig, passthroughImageService } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import ramDevApi, { syncRamVideos } from './scripts/ram-dev-api.mjs';
import sitaDevApi, { syncSitaVideos } from './scripts/sita-dev-api.mjs';
import testimonialsDevApi from './scripts/testimonials-dev-api.mjs';
import websiteDevApi from './scripts/website-dev-api.mjs';
import {readFileSync} from 'node:fs';
import {programSeo} from './src/lib/public-programs/model.mjs';

const programContent=Object.fromEntries(['ram','sita'].map(scope=>[scope,JSON.parse(readFileSync(new URL(`./public/content/${scope}.json`,import.meta.url),'utf8'))]));
function indexableUrl(value) {
  const url=new URL(value),path=url.pathname;
  if(/^\/(admin|api)(\/|$)/.test(path) || /^\/(ram|sita)\/(program|article)\/?$/.test(path) || url.search)return false;
  for(const [scope,content] of Object.entries(programContent)) {
    const record=content.programs.find(program=>new URL(programSeo(program,scope).canonical).pathname===path);
    if(record)return record.active && programSeo(record,scope).index;
  }
  return true;
}

export default defineConfig({
  // Approved assets use plain img tags. Do not process untrusted images with Sharp.
  image: {service:passthroughImageService()},
  site: 'https://programs.gloryofpeaceandlove.org',
  integrations: [sitemap({filter:indexableUrl}), { name: 'initiative-youtube-feeds', hooks: { 'astro:build:start': async ({ logger }) => { if(process.env.SKIP_VIDEO_SYNC!=='true'){await syncRamVideos(logger); await syncSitaVideos(logger);} } } }],
  vite: { plugins: [ramDevApi(), sitaDevApi(), testimonialsDevApi(), websiteDevApi()], server: { fs: { deny: ['.env','.env.*','*.{crt,pem}','**/.git/**','**/.ram-private.json','**/private-responses/**','**/src/data/testimonials.json','**/.astro/testimonials-draft.json','**/.astro/website-draft.json','**/.astro/testimonial-media/**','**/.astro/admin-setup-*.tmp'] } } },
  output: 'static'
});
