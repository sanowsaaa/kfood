import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
const {chromium}=await import(pathToFileURL(process.env.ADMIN_PLAYWRIGHT_MODULE_PATH).href);
test('editorial HTML retains formatting while malformed HTML, encoded script URLs and every event attribute remain inert',async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.ADMIN_BROWSER_EXECUTABLE,args:['--no-sandbox']});
  try{
    const page=await browser.newPage();await page.route('**/*',r=>r.request().url()==='https://html-fixture.invalid/'?r.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}):r.abort());await page.goto('https://html-fixture.invalid/');
    const source=ts.transpileModule(await readFile('src/utils/security.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
    await page.addScriptTag({content:'var exports={};'+source});
    const result=await page.evaluate(()=>{
      const sanitize=exports.sanitizeHtml;
      const payloads=[
        '<p onauxclick="window.attacked=1">Text</p>',
        '<img src="invalid" onerror=window.attacked=1>',
        '<a href="java&#x73;cript:window.attacked=1">Link</a>',
        '<a href="java&#9;script:window.attacked=1">Link</a>',
        '<a href="data:text/html,<script>window.attacked=1</script>">Link</a>',
        '<svg><a xlink:href="javascript:window.attacked=1">x</a></svg>',
        '<math><mtext><table><mglyph><style><!--</style><img title="--><img src=x onerror=window.attacked=1>">',
        '<template><img src=x onerror=window.attacked=1></template>',
        '<form id="location"><input name="href"></form>',
        '<p style="background-image:url(javascript:window.attacked=1)" onclick="window.attacked=1">x</p>',
      ];
      let unsafe=0;
      for(const html of payloads){
        const target=document.createElement('div');target.innerHTML=sanitize(html);document.body.append(target);
        for(const el of target.querySelectorAll('*')){
          if(['script','svg','math','iframe','object','template','form','input'].includes(el.localName))unsafe++;
          for(const a of el.attributes)if(a.name.startsWith('on')||['id','name','srcdoc'].includes(a.name)||/(?:javascript|data|vbscript):/i.test(a.value))unsafe++;
          el.dispatchEvent(new Event('auxclick'));el.dispatchEvent(new Event('error'));
        }
      }
      const good=sanitize('<h2 style="color:#ed167d">Title</h2><p><strong>Text</strong> <a href="https://example.invalid/article">Link</a></p><img src="https://example.invalid/photo.webp" alt="Photo"><table><tr><td colspan="2">Value</td></tr></table>');
      return {unsafe,attacked:window.attacked||0,good};
    });
    assert.equal(result.unsafe,0);assert.equal(result.attacked,0);
    assert.match(result.good,/<h2/);assert.match(result.good,/<strong>Text<\/strong>/);
    assert.match(result.good,/photo.webp/);assert.match(result.good,/colspan="2"/);
  }finally{await browser.close();}
});
