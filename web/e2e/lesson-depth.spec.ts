import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const generic={reading_lesson:'chapter-02',reading_reference:'Chapter 2 · §2.7 Processes',interests:[]};

test('prediction does not expose its model or code, and reveals never mark execution',async({page})=>{
  await page.route('**/api/reader-profile',r=>r.fulfill({json:generic}));
  await page.goto('/#learn/fork-memory');
  await expect(page.locator('.thinking-space')).toBeVisible();
  await expect(page.locator('.concept-flow')).toHaveCount(0);
  await expect(page.locator('.canonical-source')).toHaveCount(0);
  await expect(page.locator('.thinking-space')).not.toContainText('does not overwrite');
  await expect(page.locator('.thinking-space')).not.toContainText('child value=7');
  await page.getByRole('button',{name:'Compare with an explanation'}).click();
  await page.getByText('Show concept diagram',{exact:true}).click();
  await expect(page.locator('.concept-flow')).toContainText('MAP_SHARED');
  await page.getByRole('button',{name:'Optional experiment',exact:true}).click();
  await page.getByText('Compare the expected result when ready',{exact:true}).click();
  await expect(page.getByLabel('My experiment status')).toHaveValue('not-run');
});

test('all canonical C downloads match displayed lines and real walkthrough bounds',async({page,request})=>{
  await page.route('**/api/reader-profile',r=>r.fulfill({json:generic}));
  const content=await (await request.get('/api/learning')).json();
  for(const topic of content.lessons){
    await page.goto('/#learn/'+topic.id+'?view=code');
    await expect(page.getByLabel('Walkthrough segment')).toBeVisible();
    await page.getByRole('button',{name:'Show complete source'}).click();
    const lines=await page.locator('.canonical-line code').allTextContents();
    expect(lines.map(line=>line.trimEnd())).toEqual(topic.experiment.source.trimEnd().split('\n').map((line:string)=>line.trimEnd()));
    const downloaded=page.waitForEvent('download');await page.getByRole('link',{name:'Download '+topic.experiment.file,exact:true}).click();
    const bytes=await readFile((await (await downloaded).path())!);
    expect(bytes.toString()).toBe(topic.experiment.source);expect(createHash('sha256').update(bytes).digest('hex')).toBe(topic.experiment.sha256);
    for(const step of topic.walkthrough){
      await page.getByLabel('Walkthrough segment').selectOption(step.id);
      await expect(page.locator(`.canonical-line[data-line="${step.start}"]`)).toHaveClass(/segment-line/);
      await expect(page.locator(`.canonical-line[data-line="${step.end}"]`)).toHaveClass(/segment-line/);
    }
  }
});

test('curriculum search includes API names, glossary and containment discovery',async({page})=>{
  await page.goto('/#learn/catalog');
  await page.getByLabel('Find a chapter').fill('pread');await expect(page.locator('.chapter-grid>a')).toHaveCount(1);
  await expect(page.locator('.chapter-grid')).toContainText('Further Details');
  await page.getByLabel('Find a chapter').fill('predicate');await expect(page.locator('.chapter-grid')).toContainText('Thread Synchronization');
  await page.goto('/#learn/track');await expect(page.getByRole('heading',{name:'Containment investigations',exact:true})).toBeVisible();
  await expect(page.locator('.containment-track')).toContainText('no Landlock integration');
  await page.getByRole('link',{name:'Observe one seccomp boundary',exact:true}).click();
  await page.getByRole('button',{name:'Containment connection',exact:true}).click();
  await expect(page.locator('.containment-connection')).toContainText('Almost every other syscall');
});

test('search shows pending, empty and failed states without anonymous initial results',async({page})=>{
  let release:()=>void=()=>{};const gate=new Promise<void>(resolve=>release=resolve);
  await page.route('**/api/symbols?*',async r=>{await gate;await r.continue();});
  await page.goto('/#explore');await expect(page.locator('.result')).toHaveCount(0);
  await page.getByLabel('Symbol name').fill('not_a_real_symbol');
  await expect(page.locator('.search-pane [role=status]')).toContainText('Searching');
  await expect(page.getByText('No indexed symbols match.',{exact:false})).toHaveCount(0);
  release();await expect(page.locator('.search-pane')).toContainText('No indexed symbols match');
  await page.unroute('**/api/symbols?*');
  await page.route('**/api/symbols?*',r=>r.fulfill({status:503,json:{detail:'Test search unavailable'}}));
  await page.getByLabel('Symbol name').fill('helper');await expect(page.locator('.search-pane [role=status]')).toContainText('Test search unavailable');
  await expect(page.getByText('No indexed symbols match.',{exact:false})).toHaveCount(0);
  await page.getByLabel('Symbol name').fill('');await page.reload();
  await expect(page.getByLabel('Symbol name')).toHaveValue('');
  await expect(page.locator('.result')).toHaveCount(0);
});

test('grouped graph evidence has an accessible chooser and selected provenance',async({page})=>{
  await page.goto('/#explore');await page.getByLabel('Symbol name').fill('spawn_task');
  await page.locator('.result').filter({hasText:'spawn_task'}).click();
  await page.getByText('Neighbor names and grouped evidence',{exact:true}).click();
  await page.locator('.graph-symbol-names button').filter({hasText:/spawn_task → pid · \d+ evidence records/}).click();
  await expect(page.getByRole('region',{name:'Choose relationship evidence'})).toBeVisible();
  const chooser=page.locator('.graph-evidence-chooser');
  await expect(chooser).toContainText('clang_ast');
  await chooser.locator('button').first().focus();await page.keyboard.press('Enter');
  await expect(chooser.locator('[aria-pressed=true]')).toHaveCount(1);
  await expect(page.locator('.evidence-detail')).toContainText('clang_ast');
});

test('phone and enlarged-text views keep the question and keyboard destination useful',async({page})=>{
  await page.route('**/api/reader-profile',r=>r.fulfill({json:generic}));
  await page.setViewportSize({width:390,height:844});await page.goto('/#learn/chapter-30');
  const question=page.locator('.thinking-space>h2');await expect(question).toBeVisible();
  expect((await question.boundingBox())!.y).toBeLessThan(700);
  await expect(page.locator('.reading-sidebar')).toBeHidden();
  await expect(page.locator('.topic-header h1')).toBeFocused();
  await page.locator('.skip-link').focus();await page.keyboard.press('Enter');
  await expect(page.locator('#workspace-content')).toBeFocused();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.screenshot({path:fileURLToPath(new URL('../../docs/review-phone-question.png',import.meta.url)),fullPage:true});
  await page.goto('/#learn/fork-memory?view=code&segment=fork');await expect(page.locator('.canonical-source')).toContainText('child_pid = fork()');
  await page.screenshot({path:fileURLToPath(new URL('../../docs/review-phone-code.png',import.meta.url)),fullPage:true});
  await page.setViewportSize({width:1512,height:982});await page.goto('/#learn/chapter-30');
  await page.evaluate(()=>document.body.style.zoom='1.5');
  await expect(question).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.screenshot({path:fileURLToPath(new URL('../../docs/review-enlarged-reading.png',import.meta.url)),fullPage:true});
});

test('reading-only index failure remains visible without preventing the lesson',async({page,request})=>{
  const content=await (await request.get('/api/learning')).json();content.index_error='Unsupported index schema; rebuild the dataset';
  await page.route('**/api/dataset',r=>r.fulfill({status:409,json:{detail:'Unsupported index schema; rebuild the dataset'}}));
  await page.route('**/api/learning',r=>r.fulfill({json:content}));
  await page.goto('/#learn/chapter-03');await expect(page.locator('.reading-error')).toContainText('Reading-only mode');
  await expect(page.getByLabel('My thinking (optional)')).toBeVisible();
  await page.getByRole('button',{name:'Compare with an explanation'}).click();
  await expect(page.locator('.authored-explanation')).toBeVisible();
});

test('corrected ownership, ACL, signal, memory, predicate and acknowledgment models reveal separately',async({page})=>{
  for(const chapter of [5,17,20,24,30,61]){
    await page.goto('/#learn/chapter-'+String(chapter).padStart(2,'0'));
    await expect(page.locator('.concept-flow')).toBeHidden();
    await page.getByRole('button',{name:'Compare with an explanation'}).click();
    await page.getByText('Show concept diagram',{exact:true}).click();
    await expect(page.locator('.concept-flow')).toBeVisible();
    await expect(page.locator('.concept-flow')).toContainText('Authored concept diagram');
    const first=page.locator('.concept-drawing button').first();await first.click();
    const contrast=await first.evaluate(node=>{
      const style=getComputedStyle(node);
      const luminance=(color:string)=>{const channels=(color.match(/[\d.]+/g)||[]).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4));return channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722;};
      const a=luminance(style.color),b=luminance(style.backgroundColor);return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
    });
    expect(contrast).toBeGreaterThanOrEqual(4.5);
    await expect(page.locator('.concept-connections p')).not.toBeEmpty();
    if(chapter===5)await page.screenshot({path:fileURLToPath(new URL('../../docs/review-diagram-descriptors.png',import.meta.url)),fullPage:true});
    if(chapter===17)await page.screenshot({path:fileURLToPath(new URL('../../docs/review-diagram-acl.png',import.meta.url)),fullPage:true});
    if(chapter===30)await page.screenshot({path:fileURLToPath(new URL('../../docs/review-diagram-condition-loop.png',import.meta.url)),fullPage:true});
  }
});
