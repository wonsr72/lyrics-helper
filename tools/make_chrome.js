// www 폴더를 chrome-extension/app 으로 복사하고, 크롬 웹스토어에 올릴 zip 의 재료를 만든다.
const fs=require('fs'),path=require('path');
const src=path.join(__dirname,'..','www'),dst=path.join(__dirname,'..','chrome-extension','app');
fs.rmSync(dst,{recursive:true,force:true});
fs.cpSync(src,dst,{recursive:true});
fs.rmSync(path.join(dst,'sw.js'),{force:true});          // 확장 프로그램은 서비스워커 불필요
fs.rmSync(path.join(dst,'reg-sw.js'),{force:true});
const h=path.join(dst,'index.html');
fs.writeFileSync(h,fs.readFileSync(h,'utf8').replace('<script src="reg-sw.js"></script>',''));
console.log('chrome-extension/app 준비 완료 → chrome-extension 폴더 안을 zip 으로 묶어 올리세요');
