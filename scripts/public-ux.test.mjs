import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {load} from 'cheerio';
import {entries, resolveRegistration, publicSectionOrder, programFacts, programFaq, programSeo} from '../src/lib/public-programs/model.mjs';
import {programGrid} from '../src/lib/public-programs/cards.mjs';
import {registrationMarkup} from '../src/lib/public-programs/registration.mjs';
import {programLanding, programSchema} from '../src/lib/public-programs/landing.mjs';
import {homeTestimonials} from '../src/lib/public-programs/surfaces.mjs';
import {programTestimonials,testimonialMarkup,publicTestimonials} from '../src/lib/testimonials/model.mjs';
import {renderPage as ramPage} from '../src/lib/ram/render.mjs';
import {renderPage as sitaPage} from '../src/lib/sita/render.mjs';
import {createFirebaseApp} from '../firebase/runtime.mjs';
import {memoryBucket} from '../firebase/memory-bucket.mjs';

const origin = 'https://programs.gloryofpeaceandlove.org';
const scopes = ['ram', 'sita'];
const types = ['OPEN_REGISTRATION', 'OPEN_WAITLIST', 'FUTURE_INTEREST'];
const labels = ['Register Now', 'Join Waitlist', "I'm Interested"];
const now = Date.parse('2030-04-10T12:00:00Z');
const seeds = Object.fromEntries(await Promise.all(scopes.map(async scope => [scope,
  JSON.parse(await readFile(new URL(`../public/content/${scope}.json`, import.meta.url), 'utf8'))
])));
const website = JSON.parse(await readFile(new URL('../public/content/website.json', import.meta.url), 'utf8'));
const testimonialSeed = JSON.parse(await readFile(new URL('../src/data/testimonials.json', import.meta.url), 'utf8'));
const site = {organizationName:'Synthetic Test Foundation', mainWebsiteUrl:'https://foundation.example.org/'};
const text = node => node.text().replace(/\s+/g, ' ').trim();
const names = ($, root) => [...new Set($(root).find('[name]').toArray().map(el => $(el).attr('name')))];

// Stable synthetic definitions avoid depending on the seed's current batches or dates.
// Equal IDs in both scopes deliberately exercise initiative isolation.
function fixture(scope) {
  const content = structuredClone(seeds[scope]);
  const program = {...content.programs[0], id:'test-program', slug:'synthetic-program',
    initiative:scope.toUpperCase(), title:`Synthetic ${scope.toUpperCase()} Program`,
    active:true, featured:true, pageUrl:'', index:true, audience:'Adult learners', format:'Online',
    shortDescription:'Synthetic public program description.', fullDescription:'Published synthetic learning content.',
    schedule:'', language:'', faqText:'', seoTitle:'', seoDescription:''};
  delete program.fee;
  delete program.price;
  const questionTypes = ['heading', 'shortText', 'email', 'info', 'phone', 'number', 'date',
    'longText', 'dropdown', 'singleChoice', 'multipleChoice', 'yesNo', 'checkbox', 'consent'];
  const questions = questionTypes.map(type => ({id:`field-${type}`, type,
    label:`Question ${type} <literal> & text`, description:`Help for ${type}`, enabled:true,
    required:!['heading', 'info', 'phone', 'date', 'dropdown', 'yesNo'].includes(type),
    options:['First & choice', 'Second <choice>', 'Third "choice"'], placeholder:`Enter ${type}`}));
  questions.splice(5, 0, {id:'disabled-field', type:'email', label:'DO NOT SHOW DISABLED FIELD', enabled:false, required:true});
  const form = {...content.forms[0], id:'linked-form', name:'Linked synthetic form', heading:'Complete synthetic registration',
    description:'All enabled questions belong to this form.', submitLabel:'Send synthetic answers', questions};
  const decoy = {...structuredClone(form), id:'decoy-form', heading:'WRONG FORM HEADING',
    questions:[{id:'decoy-question', type:'shortText', label:'WRONG FORM QUESTION', enabled:true, required:true}]};
  const opportunity = {...content.opportunities[0], id:'shared-opportunity', programId:program.id,
    formId:form.id, name:'Synthetic first session', status:'OPEN_REGISTRATION', registrationType:'OPEN_REGISTRATION',
    displayOnRamPage:scope === 'ram', displayOnSitaPage:scope === 'sita', displayOrder:1,
    opensAt:'', closesAt:'', startDate:'', endDate:'', schedule:'', timezone:'America/Los_Angeles',
    format:'Online', audience:'Adult learners', location:'', language:''};
  content.programs = [program];
  content.forms = [decoy, form]; // The correct form is intentionally not first.
  content.opportunities = [opportunity];
  content.videos = [];
  content.articles = [];
  content.videoSettings.automatic = false;
  return {content, program, opportunity, form};
}

for(const scope of scopes)test(`${scope}: server forms fail closed without JavaScript and never submit participant answers using GET`,()=>{
  const {content,opportunity}=fixture(scope);
  const server=load(registrationMarkup({[scope]:content},scope,opportunity.id));
  assert.equal(server('form').attr('method'),'post');
  assert.equal(server('form').attr('action'),`/api/${scope}/registrations/submit`);
  assert.equal(server('[type="submit"]').is(':disabled'),true);
  const bound=load(registrationMarkup({[scope]:content},scope,opportunity.id,{pending:false}));
  assert.equal(bound('[type="submit"]').is(':disabled'),false);
  assert.deepEqual(JSON.parse(bound('form').attr('data-registration-definition')),content.forms.find(form=>form.id===opportunity.formId));
});

function assertCompleteForm($, formElement, definition, scope, opportunityId) {
  const root = $(formElement);
  assert.equal(root.length, 1, 'one complete form');
  assert.equal(root.attr(`data-${scope}-registration`), opportunityId);
  const enabled = definition.questions.filter(question => question.enabled);
  const controls = enabled.filter(question => !['heading', 'info'].includes(question.type));
  assert.deepEqual(names($, root), controls.map(question => question.id), 'all enabled controls in definition order');
  assert.equal(root.find('[name="disabled-field"], [name="decoy-question"]').length, 0);
  const renderedText = text(root);
  let previous = -1;
  for (const question of enabled) {
    const position = renderedText.indexOf(question.label);
    assert.ok(position > previous, `${question.type}: label and informational question order`);
    previous = position;
    const inputs = root.find('[name]').filter((_index, el) => $(el).attr('name') === question.id);
    if (['heading', 'info'].includes(question.type)) {
      assert.equal(inputs.length, 0, 'informational questions are not answer controls');
      continue;
    }
    assert.equal(inputs.is(':disabled'), false, `${question.type}: enabled`);
    if (['singleChoice', 'multipleChoice', 'yesNo'].includes(question.type)) {
      const expected = question.type === 'yesNo' ? ['Yes', 'No'] : question.options;
      assert.deepEqual(inputs.toArray().map(el => $(el).attr('value')), expected);
      assert.ok(inputs.toArray().every(el => $(el).attr('type') === (question.type === 'multipleChoice' ? 'checkbox' : 'radio')));
      assert.equal(inputs.first().closest('fieldset').find('legend').text().includes(question.label), true);
      for (const input of inputs.toArray()) assert.ok($(input).closest('label').text().includes($(input).attr('value')));
      if (question.type === 'multipleChoice') {
        // Group validation means at least one choice, not every checkbox.
        assert.equal(inputs.first().closest('[data-required-group]').attr('data-required-group'), String(question.required));
        assert.equal(inputs.filter('[required]').length, 0);
      } else assert.equal(inputs.filter('[required]').length, question.required ? inputs.length : 0);
    } else {
      assert.equal(inputs.length, 1, `${question.type}: one control`);
      assert.equal(inputs.is('[required]'), question.required, `${question.type}: required state`);
      if (question.type === 'longText') assert.equal(inputs[0].tagName, 'textarea');
      else if (question.type === 'dropdown') {
        assert.equal(inputs[0].tagName, 'select');
        assert.deepEqual(inputs.find('option').filter((_index, el) => $(el).attr('value') !== '').toArray().map(el => $(el).text()), question.options);
      } else {
        const expected = {shortText:'text', email:'email', phone:'tel', number:'number', date:'date', checkbox:'checkbox', consent:'checkbox'};
        assert.equal(inputs.attr('type'), expected[question.type]);
        if (['checkbox', 'consent'].includes(question.type)) assert.equal(inputs.attr('value'), 'Yes');
      }
      const id = inputs.attr('id');
      const label = inputs.closest('label').length ? inputs.closest('label') : root.find('label').filter((_index, el) => $(el).attr('for') === id);
      assert.ok(label.text().includes(question.label), `${question.type}: associated label`);
    }
  }
  assert.equal(root.find('literal').length, 0, 'question text is escaped');
  assert.ok(!renderedText.includes('DO NOT SHOW DISABLED FIELD'));
  assert.ok(!renderedText.includes('WRONG FORM QUESTION'));
  assert.equal(text(root.find('button[type="submit"]')), definition.submitLabel);
  assert.equal(root.find('button[type="submit"]').is(':disabled'), true, 'server-rendered submission waits for the shared controller');
  assert.equal(root.attr('method'),'post','answers can never fall back to a GET query string');
}

for (const scope of scopes) {
  test(`${scope}: entries aggregate registration, waitlist, interest and opened scheduled sessions`, () => {
    const {content, opportunity, program} = fixture(scope);
    content.opportunities = types.map((type, index) => ({...opportunity, id:`type-${index}`, status:type, registrationType:type, displayOrder:3-index}));
    content.opportunities.push({...opportunity, id:'scheduled-open', status:'SCHEDULED', opensAt:'2030-04-09T12:00:00Z', displayOrder:4});
    const result = entries({[scope]:content}, now);
    assert.deepEqual(result.map(entry => entry.opportunity.id), ['type-2', 'type-1', 'type-0', 'scheduled-open']);
    assert.deepEqual(result.map(entry => entry.type), [...types].reverse().concat(types[0]));
    for (const entry of result) {
      assert.equal(entry.scope, scope);
      assert.equal(entry.program, program);
      assert.equal(entry.content, content);
    }
  });

  test(`${scope}: entries exclude hidden, unavailable and broken relationships`, async t => {
    const cases = [
      ['hidden on its initiative', ({opportunity}) => {opportunity[scope === 'ram' ? 'displayOnRamPage' : 'displayOnSitaPage'] = false;}],
      ...['DRAFT', 'CLOSED', 'ARCHIVED'].map(status => [status, ({opportunity}) => {opportunity.status = status;}]),
      ['not yet open', ({opportunity}) => {opportunity.opensAt = '2030-04-10T12:00:01Z';}],
      ['closed at exact cutoff', ({opportunity}) => {opportunity.closesAt = '2030-04-10T12:00:00Z';}],
      ['scheduled without opening', ({opportunity}) => {opportunity.status = 'SCHEDULED';}],
      ['unknown registration type', ({opportunity}) => {opportunity.registrationType = 'UNKNOWN';}],
      ['inactive program', ({program}) => {program.active = false;}],
      ['wrong initiative', ({program}) => {program.initiative = scope === 'ram' ? 'SITA' : 'RAM';}],
      ['missing program', ({opportunity}) => {opportunity.programId = 'missing-program';}],
      ['missing form', ({opportunity}) => {opportunity.formId = 'missing-form';}]
    ];
    for (const [name, alter] of cases) await t.test(name, () => {
      const data = fixture(scope);
      alter(data);
      assert.deepEqual(entries({[scope]:data.content}, now), []);
      assert.equal(resolveRegistration({[scope]:data.content}, scope, data.opportunity.id, now), null);
    });
    const data = fixture(scope);
    data.opportunity.opensAt = '2030-04-10T12:00:00Z';
    data.opportunity.closesAt = '2030-04-10T12:00:01Z';
    assert.equal(entries({[scope]:data.content}, now).length, 1, 'opening is inclusive; closing is exclusive');
  });

  test(`${scope}: grid cards link titles and open the opportunity's associated form directly`, () => {
    const data = fixture(scope);
    data.content.opportunities = types.map((type, index) => ({...data.opportunity, id:`type-${index}`, status:type, registrationType:type}));
    const $ = load(programGrid({[scope]:data.content}));
    const cards = $('[data-opportunity-card]');
    assert.equal(cards.length, 3);
    cards.each((index, card) => {
      const button = $(card).find('button[data-register-opportunity]');
      assert.equal(button.length, 1);
      assert.equal(button.attr('type'), 'button');
      assert.equal(button.attr('data-register-scope'), scope);
      assert.ok(text(button).startsWith(labels[index]));
      const resolved = resolveRegistration({[scope]:data.content}, scope, button.attr('data-register-opportunity'));
      assert.equal(resolved.form, data.form, 'association follows opportunity.formId rather than card position');
      const titleLink = $(card).find('h3 a');
      assert.equal(text(titleLink), data.program.title);
      assert.equal(titleLink.attr('href'), `/${scope}/${scope === 'ram' ? 'programs/' : ''}${data.program.slug}/`);
      assert.equal($(card).attr('data-registration-type'), types[index]);
    });
    assert.equal(load(programGrid({[scope]:data.content}, {scope, limit:2}))('[data-opportunity-card]').length, 2);
  });

  test(`${scope}: registration renders the complete enabled definition and follows changed formId`, () => {
    const {content, opportunity, form} = fixture(scope);
    const contents = {[scope]:content};
    const selected = resolveRegistration(contents, scope, opportunity.id);
    assert.equal(selected.form, form);
    const $ = load(registrationMarkup(contents, scope, opportunity.id));
    assertCompleteForm($, $('form'), form, scope, opportunity.id);
    assert.equal(text($('h2')), form.heading);
    assert.ok(!$.text().includes('WRONG FORM HEADING'));
    opportunity.formId = content.forms[0].id;
    assert.equal(resolveRegistration(contents, scope, opportunity.id).form, content.forms[0]);
    const changed = load(registrationMarkup(contents, scope, opportunity.id));
    assert.deepEqual(names(changed, changed('form')), ['decoy-question']);
    assert.equal(text(changed('h2')), 'WRONG FORM HEADING');
  });

  test(`${scope}: reused opportunity keeps the same full form in directory, initiative and landing entrypoints`, () => {
    const {content, opportunity, form, program} = fixture(scope);
    const contents = {[scope]:content};
    for (const html of [programGrid(contents), (scope === 'ram' ? ramPage : sitaPage)(content)]) {
      const $ = load(html);
      const button = $('[data-register-opportunity]').filter((_index, el) => $(el).attr('data-register-opportunity') === opportunity.id);
      assert.equal(button.length, 1);
      const resolved = resolveRegistration(contents, button.attr('data-register-scope'), button.attr('data-register-opportunity'));
      assert.equal(resolved.opportunity, opportunity);
      assert.equal(resolved.form, form);
      const rendered = load(registrationMarkup(contents, resolved.scope, resolved.opportunity.id));
      assertCompleteForm(rendered, rendered('form'), form, scope, opportunity.id);
    }
    const landing = load(programLanding(program, content, scope));
    assertCompleteForm(landing, landing('[data-registration-host] form'), form, scope, opportunity.id);
    const preview = load(registrationMarkup(contents, scope, opportunity.id, {preview:true}));
    assert.equal(preview('form [type="submit"]').is(':disabled'), true);
    assert.deepEqual(names(preview, preview('form')), names(landing, landing('form')));
    opportunity.status = 'CLOSED';
    const closed = load(registrationMarkup(contents, scope, opportunity.id));
    assert.equal(closed('form').length, 0);
    assert.equal(closed('[role="status"]').length, 1);
  });

  test(`${scope}: landing embeds a full form and only offers public batches of its own program`, () => {
    const {content, opportunity, form, program} = fixture(scope);
    const otherProgram = {...program, id:'other-program', slug:'other-program', title:'Other Program'};
    content.programs.push(otherProgram);
    content.opportunities.push(
      {...opportunity, id:'same-program-waitlist', name:'Synthetic waitlist session', status:'OPEN_WAITLIST', registrationType:'OPEN_WAITLIST', displayOrder:2},
      {...opportunity, id:'unrelated-batch', programId:otherProgram.id},
      {...opportunity, id:'closed-batch', status:'CLOSED'},
      {...opportunity, id:'draft-batch', status:'DRAFT'},
      {...opportunity, id:'hidden-batch', displayOnRamPage:false, displayOnSitaPage:false}
    );
    const $ = load(programLanding(program, content, scope));
    assert.equal(text($('h1')), program.title);
    assertCompleteForm($, $('[data-registration-host] form'), form, scope, opportunity.id);
    assert.equal($('dialog form, [hidden] form').length, 0, 'registration is inline and visible');
    const selector = $('select[data-program-batch]');
    assert.equal(selector.attr('data-program-batch'), scope);
    assert.deepEqual(selector.find('option').toArray().map(el => $(el).attr('value')), [opportunity.id, 'same-program-waitlist']);
    assert.equal($('[data-registration-host]').attr('data-opportunity-id'), opportunity.id);
    for (const option of selector.find('option').toArray()) {
      assert.equal(resolveRegistration({[scope]:content}, scope, $(option).attr('value')).program.id, program.id);
    }
    const facts = $('dt').toArray().map(el => text($(el)));
    assert.ok(!facts.includes('Fee') && !facts.includes('Dates'), 'missing fees and dates remain missing');
    content.opportunities.forEach(item => {item.status = 'CLOSED';});
    const closed = load(programLanding(program, content, scope));
    assert.equal(closed('form, select[data-program-batch]').length, 0);
    assert.ok(closed('a[href="/contact/"]').length > 0);
  });

  test(`${scope}: facts and SEO use configured content without invented fees or dates`, () => {
    const {program, opportunity} = fixture(scope);
    const canonical = `${origin}/${scope}/${scope === 'ram' ? 'programs/' : ''}${program.slug}/`;
    let seo = programSeo(program, scope);
    assert.equal(seo.canonical, canonical);
    assert.ok(seo.title.includes(program.title));
    assert.equal(seo.description, program.shortDescription);
    assert.equal(seo.index, true);
    assert.ok(!programFacts(program, opportunity).some(fact => ['Fee', 'Dates'].includes(fact.label)));
    assert.ok(!programFaq(program, [opportunity]).some(item => /fee|date/i.test(item.question)));
    program.seoTitle = 'Explicit synthetic SEO title';
    program.seoDescription = 'Explicit synthetic SEO description';
    seo = programSeo(program, scope);
    assert.equal(seo.title, program.seoTitle);
    assert.equal(seo.description, program.seoDescription);
    assert.equal(seo.canonical, canonical);
    program.index = false;
    assert.equal(programSeo(program, scope).index, false);
    program.index = true;
    program.fullDescription = '  ';
    assert.equal(programSeo(program, scope).index, false);
    program.fee = 0;
    opportunity.startDate = '2030-05-01';
    opportunity.endDate = '2030-05-03';
    const facts = programFacts(program, opportunity);
    assert.equal(facts.find(fact => fact.label === 'Fee').value, 'Free');
    assert.equal(facts.find(fact => fact.label === 'Dates').value, 'May 1, 2030 - May 3, 2030');
  });
}

test('aggregation isolates identical opportunity IDs by scope and never manufactures community entries', () => {
  const ram = fixture('ram'), sita = fixture('sita');
  const contents = {ram:ram.content, sita:sita.content, community:structuredClone(ram.content)};
  assert.deepEqual(entries(contents).map(entry => entry.scope), scopes);
  assert.equal(resolveRegistration(contents, 'ram', ram.opportunity.id).form, ram.form);
  assert.equal(resolveRegistration(contents, 'sita', sita.opportunity.id).form, sita.form);
  for (const [scope, id] of [['community', ram.opportunity.id], ['missing', ram.opportunity.id], ['ram', 'missing']]) {
    assert.equal(resolveRegistration(contents, scope, id), null);
  }
  assert.deepEqual(entries({}), []);
  assert.equal(load(programGrid(contents, {scope:'ram'}))('[data-register-scope="sita"]').length, 0);
  const community = load(programGrid(contents, {scope:'community'}));
  assert.equal(community('[data-opportunity-card], [data-register-opportunity]').length, 0);
  assert.ok(community('a[href="/contact/"]').length > 0);
});

test('public section order respects visibility and moves open programs ahead of featured programs without mutation', () => {
  const sections = [
    {id:'hero', visible:true}, {id:'about', visible:false}, {id:'programs', visible:true},
    {id:'journey', visible:true}, {id:'opportunities', visible:true}, {id:'videos', visible:true}
  ];
  const before = structuredClone(sections);
  assert.deepEqual(publicSectionOrder(sections).map(item => item.id), ['hero', 'opportunities', 'programs', 'journey', 'videos']);
  assert.deepEqual(sections, before);
  const alreadyOrdered = [sections[0], sections[4], sections[3], sections[2]];
  assert.deepEqual(publicSectionOrder(alreadyOrdered), alreadyOrdered);
  for (const hidden of ['programs', 'opportunities']) {
    const changed = sections.map(item => ({...item, visible:item.visible && item.id !== hidden}));
    assert.deepEqual(publicSectionOrder(changed), changed.filter(item => item.visible));
  }
});

function schemaNodes(value, type) {
  return (value['@graph'] || [value]).filter(item => item['@type'] === type);
}
function assertNoFabricatedSchemaFacts(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    assert.ok(!['aggregateRating', 'ratingValue', 'reviewCount', 'ratingCount', 'review', 'offers', 'startDate', 'endDate'].includes(key), `unconfigured schema fact: ${key}`);
    assertNoFabricatedSchemaFacts(item);
  }
}

for (const scope of scopes) {
  test(`${scope}: program JSON-LD parses, matches visible FAQ facts and safely escapes script delimiters`, () => {
    const {program, content} = fixture(scope);
    program.title = 'Synthetic </script><script>alert("test")</script> & title';
    program.faqText = 'Can I join? | Adult learners can join.\nWhat will I study? | Reflection </script> & learning.\nIncomplete line\n | missing question';
    const faqs = programFaq(program, content.opportunities);
    const encoded = programSchema(program, scope, faqs, site);
    assert.doesNotMatch(encoded, /<\/script/i);
    const schema = JSON.parse(encoded);
    const course = schemaNodes(schema, 'Course')[0];
    assert.equal(course.name, program.title);
    assert.equal(course.description, program.shortDescription);
    assert.equal(course.url, programSeo(program, scope).canonical);
    assert.equal(course.provider.name, site.organizationName);
    assert.equal(course.provider.url, site.mainWebsiteUrl);
    assert.equal(Object.hasOwn(course, 'isAccessibleForFree'), false);
    assertNoFabricatedSchemaFacts(schema);
    const $ = load(programLanding(program, content, scope, {site}));
    assert.equal($('script').length, 1, 'injected closing tags cannot add executable scripts');
    assert.equal(text($('h1')), program.title);
    const embedded = JSON.parse($('script[type="application/ld+json"]').text());
    const visible = $('details').toArray().map(el => ({question:text($(el).find('summary')), answer:text($(el).find('p'))}));
    assert.deepEqual(visible, faqs);
    assert.deepEqual(schemaNodes(embedded, 'FAQPage')[0].mainEntity.map(item => ({question:item.name, answer:item.acceptedAnswer.text})), visible);
    const breadcrumb = schemaNodes(embedded, 'BreadcrumbList')[0].itemListElement;
    assert.equal(breadcrumb.at(-1).item, programSeo(program, scope).canonical);
    program.fee = 0;
    assert.equal(schemaNodes(JSON.parse(programSchema(program, scope, faqs, site)), 'Course')[0].isAccessibleForFree, true);
  });

  test(`${scope}: empty FAQ and missing substantive description do not generate FAQ or Course claims`, () => {
    const {content, program, opportunity} = fixture(scope);
    program.audience = program.format = program.language = program.faqText = '';
    opportunity.audience = opportunity.format = opportunity.language = '';
    const faqs = programFaq(program, [opportunity]);
    assert.deepEqual(faqs, []);
    const $ = load(programLanding(program, content, scope, {site}));
    assert.equal($('details').length, 0);
    assert.equal(schemaNodes(JSON.parse($('script[type="application/ld+json"]').text()), 'FAQPage').length, 0);
    program.fullDescription = '';
    const schema = JSON.parse(programSchema(program, scope, [], site));
    assert.equal(schemaNodes(schema, 'Course').length, 0);
    assertNoFabricatedSchemaFacts(schema);
  });
}

function feedbackFixture() {
  const record = {id:'shared-quote', initiative:['RAM', 'SITA'], displayName:'Synthetic Public Participant',
    testimonialText:'Synthetic approved quotation for tests.', published:true, consentConfirmed:true,
    displayOrder:1, privateNote:'PRIVATE EDITOR NOTE MUST NOT LEAK'};
  return {version:1, settings:Object.fromEntries(['RAM', 'SITA', 'COMMUNITY'].map(scope => [scope, {visible:true, count:9999}])), records:[
    record,
    {...record, id:'draft', displayName:'Unpublished Participant', testimonialText:'UNPUBLISHED QUOTE', published:false},
    {...record, id:'unconsented', testimonialText:'UNCONSENTED QUOTE', consentConfirmed:false},
    {...record, id:'archived', testimonialText:'ARCHIVED QUOTE', archived:true},
    {...record, id:'string-published', testimonialText:'STRING BOOLEAN QUOTE', published:'true'},
    {...record, id:'string-consent', testimonialText:'STRING CONSENT QUOTE', consentConfirmed:'true'},
    {...record, id:'unknown-initiative', initiative:['UNKNOWN'], testimonialText:'UNKNOWN INITIATIVE QUOTE'}
  ]};
}

test('home testimonials use genuine published consented rows once and do not invent counts or ratings', () => {
  const contents = Object.fromEntries(scopes.map(scope => [scope, fixture(scope).content]));
  const feedback = feedbackFixture();
  const $ = load(homeTestimonials(feedback, contents));
  assert.deepEqual($('blockquote').toArray().map(el => text($(el))), [feedback.records[0].testimonialText]);
  assert.ok($.text().includes(feedback.records[0].displayName));
  assert.doesNotMatch($.text(), /UNPUBLISHED|UNCONSENTED|ARCHIVED|STRING BOOLEAN|STRING CONSENT|UNKNOWN INITIATIVE|PRIVATE EDITOR|9999|\d[\d,.]*\+?\s*(?:participants|families|reviews|ratings)/i);
  assert.equal($('[itemprop="aggregateRating"], [itemprop="ratingValue"], script[type="application/ld+json"]').length, 0);
  feedback.settings.RAM.visible = feedback.settings.SITA.visible = false;
  assert.equal(homeTestimonials(feedback, contents), '', 'hidden initiative settings are respected');
  feedback.records = [];
  assert.equal(homeTestimonials(feedback, contents), '', 'no fabricated testimonials when empty');
});

test('home testimonials include only supplied public community feedback', () => {
  const feedback = feedbackFixture();
  feedback.records = Array.from({length:5}, (_, index) => ({...feedback.records[0], id:`quote-${index}`, testimonialText:`Synthetic approved quotation ${index}`, initiative:['COMMUNITY']}));
  const $ = load(homeTestimonials(feedback, {}));
  const quotes = $('blockquote').toArray().map(el => text($(el)));
  assert.ok(quotes.length > 0 && quotes.length <= feedback.records.length);
  assert.equal(new Set(quotes).size, quotes.length, 'no duplicate feedback');
  for (const quote of quotes) assert.ok(feedback.records.some(record => record.testimonialText === quote));
  feedback.settings.COMMUNITY.visible = false;
  assert.equal(homeTestimonials(feedback, {}), '');
});

// Published data, assets and requests are all in memory; no credentials or network.
async function publicApp(contents, feedback = {...testimonialSeed, records:[]}) {
  const bucket = memoryBucket();
  const published = {...contents, testimonials:feedback, website:structuredClone(website)};
  for (const [scope, content] of Object.entries(published)) {
    await bucket.put(`cms/${scope}.json`, JSON.stringify({published:content, draft:null, media:[]}));
  }
  return createFirebaseApp({env:{SITE_ORIGIN:origin}, bucket,
    request:async () => {throw Error('Unexpected outbound request in public UX test');},
    assets:async request => {
      const community = new URL(request.url).pathname.startsWith('/community-programs');
      return new Response(`<!doctype html><html><head><title>Seed</title><meta name="description"><meta name="robots" data-website-robots><link rel="canonical"><meta property="og:title"><meta property="og:description"><meta property="og:url"></head><body><article data-ram-detail></article><article data-sita-detail></article><div data-public-programs data-program-scope="${community ? 'community' : ''}"><p data-public-program-count></p><div data-public-program-grid></div></div><div data-ux-home-testimonials></div></body></html>`, {headers:{'Content-Type':'text/html'}});
    }
  });
}

for (const scope of scopes) {
  test(`${scope}: Firebase public landing returns full registration and accurate SEO/canonical metadata`, async () => {
    const data = fixture(scope);
    data.program.seoTitle = `Published ${scope.toUpperCase()} title`;
    data.program.seoDescription = `Published ${scope.toUpperCase()} description`;
    const contents = Object.fromEntries(scopes.map(key => [key, key === scope ? data.content : fixture(key).content]));
    const app = await publicApp(contents);
    const canonical = `${origin}/${scope}/${scope === 'ram' ? 'programs/' : ''}${data.program.slug}/`;
    const response = await app(new Request(canonical));
    assert.equal(response.status, 200);
    const $ = load(await response.text());
    assert.equal(text($('title')), data.program.seoTitle);
    assert.equal($('meta[name="description"]').attr('content'), data.program.seoDescription);
    assert.equal($('link[rel="canonical"]').attr('href'), canonical);
    assert.equal($('meta[property="og:url"]').attr('content'), canonical);
    assert.equal($('meta[property="og:title"]').attr('content'), data.program.seoTitle);
    assert.equal($('meta[property="og:description"]').attr('content'), data.program.seoDescription);
    assert.match($('meta[name="robots"]').attr('content'), /^index,/);
    assertCompleteForm($, $('[data-registration-host] form'), data.form, scope, data.opportunity.id);
    assertNoFabricatedSchemaFacts(JSON.parse($('script[data-public-program-schema]').text()));
    data.program.index = false;
    const noindexApp = await publicApp(contents);
    const noindex = load(await (await noindexApp(new Request(canonical))).text());
    assert.match(noindex('meta[name="robots"]').attr('content'), /^noindex,/);
    assert.equal(noindex('link[rel="canonical"]').attr('href'), canonical);
  });
}

test('Firebase directory and home use published entries; community has no invented registration cards', async () => {
  const contents = Object.fromEntries(scopes.map(scope => [scope, fixture(scope).content]));
  const feedback = feedbackFixture();
  const app = await publicApp(contents, feedback);
  for (const route of ['/', '/programs/', '/community-programs/']) {
    const response = await app(new Request(origin + route));
    assert.equal(response.status, 200);
    const $ = load(await response.text());
    const community = route === '/community-programs/';
    const expected = community ? 0 : entries(contents).length;
    assert.equal($('[data-public-program-grid] [data-opportunity-card]').length, expected);
    assert.equal($('[data-public-program-count]').text(), `${expected} programs available`);
    if (community) assert.equal($('[data-register-opportunity]').length, 0);
    else assert.deepEqual($('[data-register-opportunity]').toArray().map(el => $(el).attr('data-register-scope')), scopes);
    if (route === '/') assert.deepEqual($('blockquote').toArray().map(el => text($(el))), [feedback.records[0].testimonialText]);
  }
});

function associatedFeedback() {
  const approved={id:'general-ram',initiative:['RAM'],program:'',displayName:'Synthetic approved name',testimonialText:'Synthetic approved general reflection.',published:true,consentConfirmed:true,archived:false,displayOrder:20};
  return {version:1,settings:{RAM:{visible:true,count:6},SITA:{visible:true,count:6}},records:[
    ...Array.from({length:8},(_,index)=>({...approved,id:'other-program-'+index,program:'unrelated-program',featured:true,displayOrder:index})),
    approved,
    {...approved,id:'specific',program:'gita-beginners',testimonialText:'Synthetic program-specific reflection.',displayOrder:30},
    {...approved,id:'sita-general',initiative:['SITA'],testimonialText:'Synthetic SITA reflection.'},
    {...approved,id:'unpublished',published:false},
    {...approved,id:'unconsented',consentConfirmed:false},
    {...approved,id:'archived',archived:true},
    {...approved,id:'string-published',published:'true'},
    {...approved,id:'string-consent',consentConfirmed:'true'}
  ]};
}

test('program testimonials prioritize exact program association and never fill with other program reviews',()=>{
  const feedback=associatedFeedback(),before=structuredClone(feedback);
  assert.deepEqual(programTestimonials(feedback,'RAM','gita-beginners').records.map(record=>record.id),['specific']);
  assert.deepEqual(feedback,before,'public selection does not mutate CMS data');
});
test('program testimonial fallback uses unassigned initiative reviews before limiting, not other programs',()=>{
  const feedback=associatedFeedback();
  assert.deepEqual(programTestimonials(feedback,'RAM','program-with-no-reviews').records.map(record=>record.id),['general-ram']);
  assert.deepEqual(programTestimonials(feedback,'SITA','program-with-no-reviews').records.map(record=>record.id),['sita-general']);
});
test('program testimonial fallbacks preserve consent, strict publication, archive and visibility rules',()=>{
  const feedback=associatedFeedback();feedback.records.find(record=>record.id==='specific').published=false;
  assert.deepEqual(programTestimonials(feedback,'RAM','gita-beginners').records.map(record=>record.id),['general-ram']);
  feedback.settings.RAM.visible=false;assert.deepEqual(programTestimonials(feedback,'RAM','gita-beginners').records,[]);
  feedback.settings.RAM.visible=true;feedback.records=feedback.records.filter(record=>record.program || record.id!=='general-ram');
  assert.deepEqual(programTestimonials(feedback,'RAM','gita-beginners').records,[]);
});
test('testimonial markup has no invented photo, name, rating or participant count',()=>{
  const feedback=associatedFeedback();const data=programTestimonials(feedback,'RAM','gita-beginners');
  const $=load(testimonialMarkup(data,[{id:'gita-beginners',title:'Synthetic matching Program'}]));
  assert.equal($('.testimonial-card').length,1);assert.equal($('.testimonial-photo').length,0);
  assert.equal($('.testimonial-name').text(),'Synthetic approved name');assert.ok($('.testimonial-context').text().includes('Synthetic matching Program'));
  assert.equal($('h2').text(),'What Participants Say');assert.equal($('section').attr('aria-labelledby'),$('h2').attr('id'));
  assert.doesNotMatch($.text(),/stars|5\/5|countries|ratings|thousands|9999/);
  assert.equal($('script[type="application/ld+json"]').length,0);
  data.records[0].displayName='';const anonymous=load(testimonialMarkup(data));assert.equal(anonymous('.testimonial-name').length,0);
});
test('only a supplied approved testimonial photo is rendered with stable dimensions and escaped identity',()=>{
  const feedback=associatedFeedback(),record=feedback.records.find(record=>record.id==='specific');
  record.image='/logos/gopal-logo.png';record.imageAlt='Synthetic approved photo <literal>';record.displayName='<script>not markup</script>';
  const $=load(testimonialMarkup(programTestimonials(feedback,'RAM','gita-beginners')));
  assert.equal($('.testimonial-photo').attr('src'),record.image);assert.equal($('.testimonial-photo').attr('width'),'56');assert.equal($('.testimonial-photo').attr('height'),'56');
  assert.equal($('.testimonial-photo').attr('alt'),record.imageAlt);assert.equal($('script').length,0);assert.equal($('.testimonial-name').text(),record.displayName);
});
test('initiative pages still select their own eligible program and general testimonials',()=>{
  const feedback=associatedFeedback();
  for(const scope of ['RAM','SITA'])for(const record of publicTestimonials(feedback,scope).records){
    assert.ok(record.initiative.includes(scope));assert.ok(!['unpublished','unconsented','archived','string-published','string-consent'].includes(record.id));
  }
  const $=load(homeTestimonials(feedback,{}));assert.ok($('[data-testimonial-id]').length>0);assert.equal($('h2').text(),'What Participants Say');
});
