let currentEventName = "Unknown_Event";
let currentExpId = "000000";

// This listener renames the file the MOMENT it starts downloading
chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  if (item.url.includes('roblox.com')) {
    let folder = `roblox-exports/${currentExpId}`;
    let filename = item.filename;

    // If it's a custom event, use the name we captured from the dropdown
    if (filename.includes('CustomEventsV2')) {
      filename = `custom-events/${currentEventName}.csv`;
    }

    suggest({ filename: `${folder}/${filename}` });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "START_EXPORT") {
    executeAutomation(request.config);
  } else if (request.action === "SET_EVENT_NAME") {
    currentEventName = request.eventName;
    currentExpId = request.expId;
  }
});

async function executeAutomation(config) {
  const analyticsPages = ['retention', 'engagement', 'acquisition', 'audience', 'economy', 'funnels'];
  const monetizationPages = ['overview', 'developer-products', 'passes', 'avatar-items', 'immersive-ads', 'subscriptions', 'creator-rewards'];

  for (const id of config.ids) {
    currentExpId = id;

    // 1. Process Analytics
    if (config.doAnalytics) {
      for (const page of analyticsPages) {
        const url = `https://create.roblox.com/dashboard/creations/experiences/${id}/analytics/${page}`;
        await runInTab(url, id, scrapeStandardCSV);
      }
    }

    // 2. Process Custom Events
    if (config.doCustom) {
      const url = `https://create.roblox.com/dashboard/creations/experiences/${id}/analytics/custom`;
      await runInTab(url, id, scrapeCustomEvents);
    }
    
    // 3. Process Monetization
    if (config.doMonetization) {
      for (const page of monetizationPages) {
        const url = `https://create.roblox.com/dashboard/creations/experiences/${id}/monetization/${page}`;
        await runInTab(url, id, scrapeStandardCSV);
      }
    }
  }
  console.log("ALL EXPORTS COMPLETE");
}

async function runInTab(url, expId, scriptToRun) {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.tabs.update(tab.id, { url: url });

  return new Promise((resolve) => {
    chrome.tabs.onUpdated.addListener(function onUpdate(tabId, info) {
      if (tabId === tab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(onUpdate);
        setTimeout(async () => {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: scriptToRun,
            args: [expId] // Pass the ID into the page script
          });
          resolve();
        }, 8000);
      }
    });
  });
}

function scrapeStandardCSV() {
  const buttons = document.querySelectorAll('[data-testid="chart-export-button"], [aria-label*="Export"], [data-testid="chart-download-button"]');
  buttons.forEach(btn => btn.click());
}

async function scrapeCustomEvents(expId) {
  const wait = (ms) => new Promise(res => setTimeout(res, ms));
  const label = Array.from(document.querySelectorAll('label')).find(el => el.textContent.includes('Custom Event Name'));
  if (!label) return;

  const openButton = label.parentElement.querySelector('button[aria-label="Open"]');
  if (!openButton) return;

  openButton.click();
  await wait(1500);

  const options = Array.from(document.querySelectorAll('[role="listbox"] li'));
  for (let i = 0; i < options.length; i++) {
    const currentOptions = Array.from(document.querySelectorAll('[role="listbox"] li'));
    const eventName = currentOptions[i].innerText.trim().replace(/\s+/g, '_');
    
    currentOptions[i].click();
    await wait(4000);
    
    // Tell the background script what name to use for the next download
    chrome.runtime.sendMessage({ 
      action: "SET_EVENT_NAME", 
      eventName: eventName,
      expId: expId 
    });

    const downloadBtn = document.querySelector('[data-testid="chart-download-button"]');
    if (downloadBtn) downloadBtn.click();
    
    await wait(1500);
    document.querySelector('button[aria-label="Open"]')?.click();
    await wait(1000);
  }
}
