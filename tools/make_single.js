// 폰에 "복사해서" 쓰는 버전을 만든다.
//  1) phone-direct/가사도우미.html  : 파일 하나(그림·글자·기능 전부 포함). 폰에 복사해서 열면 됨
//  2) phone-direct/web/             : 인터넷에 올리면 '홈 화면에 추가' 로 앱처럼 설치되는 폴더(PWA)
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),www=path.join(root,'www'),out=path.join(root,'phone-direct');
fs.rmSync(out,{recursive:true,force:true}); fs.mkdirSync(out,{recursive:true});
let html=fs.readFileSync(path.join(www,'index.html'),'utf8');
const css=fs.readFileSync(path.join(www,'style.css'),'utf8');
const js=fs.readFileSync(path.join(www,'app.js'),'utf8').replace(/<\/script>/g,'<\\/script>');
const icon='data:image/png;base64,'+fs.readFileSync(path.join(www,'icons','icon-192.png')).toString('base64');
html=html.replace(/<link rel="manifest"[^>]*>\n?/,'').replace(/<link rel="apple-touch-icon"[^>]*>/,'<link rel="apple-touch-icon" href="'+icon+'">').replace(/<link rel="icon"[^>]*>/,'<link rel="icon" href="'+icon+'">')
  .replace('<link rel="stylesheet" href="style.css">','<style>\n'+css+'\n</style>')
  .replace('<script src="app.js"></script>','<script>\n'+js+'\n</script>').replace('<script src="reg-sw.js"></script>','')
  .replace('<a href="privacy.html">개인정보 처리방침</a>','개인정보: 개발자 서버 없음 · 가사는 이 기기에만 저장');
fs.writeFileSync(path.join(out,'가사도우미.html'),html);
fs.cpSync(www,path.join(out,'web'),{recursive:true});
console.log('phone-direct 만들기 완료:',(html.length/1024).toFixed(0)+'KB');
