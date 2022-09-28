chrome.manifest = chrome.runtime.getManifest()

console.clear()
console.log(`Loaded Prevue v${chrome.manifest.version} at ${new Date()}`)

function injectPrevue (tabId, includingCss = false) {
    chrome.scripting.executeScript({
        target: { tabId, allFrames: false },
        files: chrome.manifest.content_scripts[0].js,
    })

    includingCss && chrome.scripting.insertCSS({
        target: { tabId, allFrames: false },
        files: chrome.manifest.content_scripts[0].css,
    })
}

function reinjectPrevueEverywhere (includingCss = false) {
    chrome.windows.getAll({ populate: true }, windows => {
        windows.map(win => {
            win.tabs.map(tab => {
                if (tab.status === 'complete'
                    && ! tab.active
                    && tab.url?.length
                    && /^(https?|file|chrome-extension):/i.test(tab.url)
                    && ! /^https?:\/\/chrome\.google\.com\//.test(tab.url)) {
                    // console.log(tab.id, tab.url)
                    injectPrevue(tab.id, includingCss)
                } else {
                    // console.log(tab)
                }
            })
        })
    })
}

chrome.runtime.onMessage.addListener((req, sender, respond) => {
    const tabId = sender.tab?.id

    if (req.action === 'rememberUrl') {
        chrome.history.addUrl({ url: req.url })
    }

    else if (req.action === 'setupImprobableApology') {
        chrome.declarativeNetRequest.updateSessionRules({
            addRules: [{
                id: Math.ceil(Math.random() * 1e8),
                action: {
                    type: 'redirect',
                    redirect: { url: sender.tab.url + '#prevue:sorry' }
                },
                condition: {
                    urlFilter: '*',
                    tabIds: [tabId],
                    resourceTypes: ['main_frame'],
                },
            }],
        })

        setTimeout(() => {
            chrome.declarativeNetRequest.getSessionRules(rules => {
                chrome.declarativeNetRequest.updateSessionRules({
                    removeRuleIds: rules.map(r => r.id),
                })
            })
        }, 3e3)
    }

    else if (req.action === 'reinjectPrevueEverywhere') {
        reinjectPrevueEverywhere()
    }

    else if (req.action === 'reinjectPrevueHere') {
        injectPrevue(tabId)
    }
    
    else if (req.action === 'reportingIframeUrl' && /^(https?|file|chrome-extension):/i.test(req.url)) {
        chrome.tabs.sendMessage(tabId, req)
    }

    else if (req.action === 'pressedEscape') {
        chrome.tabs.sendMessage(tabId, { action: 'pressedEscape' })
    }

    else if (req.action === 'disableCsp') {
        chrome.declarativeNetRequest.updateEnabledRulesets({
            enableRulesetIds: ['disable-csp']
        })
    }

    else if (req.action === 'enableCsp') {
        chrome.declarativeNetRequest.updateEnabledRulesets({
            disableRulesetIds: ['disable-csp']
        })
    }

    respond({})

    return true
})

chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === 'install') {
        chrome.tabs.create({ url: chrome.runtime.getURL('/options.html') })
    } else if (details.reason === 'update') {
        //
    }

    reinjectPrevueEverywhere(true)

    return true
})
