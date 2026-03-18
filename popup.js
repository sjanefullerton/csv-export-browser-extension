document.getElementById('startBtn').addEventListener('click', () => {
  const ids = document.getElementById('ids').value.split(',').map(s => s.trim());
  const config = {
    ids,
    doAnalytics: document.getElementById('analytics').checked,
    doMonetization: document.getElementById('monetization').checked,
    doCustom: document.getElementById('custom').checked
  };
  
  chrome.runtime.sendMessage({ action: "START_EXPORT", config });
  document.getElementById('status').innerText = "Running... check the Roblox tab.";
});
