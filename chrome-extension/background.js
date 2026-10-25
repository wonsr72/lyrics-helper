chrome.action.onClicked.addListener(function(){chrome.tabs.create({url:chrome.runtime.getURL('app/index.html')});});
