chrome = chrome || browser

chrome.manifest = chrome.runtime.getManifest()

console.clear()
console.log(`Loaded Prevue v${chrome.manifest.version} at ${new Date()}`)

const urlsToDisableCsp = {}

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
    if (req.action === 'rememberUrl') {
        chrome.history.addUrl({ url: req.url })
    }

    else if (req.action === 'reinjectPrevueEverywhere') {
        reinjectPrevueEverywhere()
    }

    else if (req.action === 'reinjectPrevueHere') {
        injectPrevue(sender.tab.id)
    }

    else if (['reportingIframeUrl', 'reportingMetaRedirect'].includes(req.action)
        && /^(https?|file|chrome-extension):/i.test(req.url)) {
        urlsToDisableCsp[req.url] = true

        setTimeout(() => delete urlsToDisableCsp[req.url + ''], 5e3)

        chrome.tabs.sendMessage(sender.tab.id, req)
    }

    else if (req.action === 'pressedEscape') {
        chrome.tabs.sendMessage(sender.tab.id, { action: 'pressedEscape' })
    }

    respond({})

    return true
})

chrome.webRequest.onHeadersReceived.addListener(req => {
    const cspHeaders = ['x-frame-options', 'content-security-policy', 'cross-origin-opener-policy', 'cross-origin-resource-policy', 'content-security-policy-report-only']

    if (matchesExtensionPage(req.originUrl) || urlsToDisableCsp[req.url]) {
        req.responseHeaders = req.responseHeaders.filter(header => {
            if (header.name === 'location') {
                urlsToDisableCsp[header.value] = true

                setTimeout(() => delete urlsToDisableCsp[header.value + ''], 5e3)
            }

            return ! cspHeaders.includes(header.name.toLowerCase())
        })
    }
    
    return { responseHeaders: req.responseHeaders }
}, { urls: ['<all_urls>'] }, ['blocking', 'responseHeaders'])

chrome.runtime.onInstalled.addListener(details => {
    if (details.reason === 'install') {
        chrome.tabs.create({ url: chrome.runtime.getURL('/options.html') })
    }

    reinjectPrevueEverywhere(true)

    return true
})

function matchesExtensionPage (url) {
    return url.startsWith(chrome.runtime.getURL('prevue.html'))
}
