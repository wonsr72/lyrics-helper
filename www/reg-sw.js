if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)&&location.hostname!==''){navigator.serviceWorker.register('sw.js').catch(function(){});}
