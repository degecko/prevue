const defs = {
    target: 'both',
    targetLinkTypes: 'both',
    openPosition: 'auto',
    openAnimation: true,
    displayUrl: true,
    urlPosition: 'top',
    ctrlTrigger: false,
    altTrigger: true,
    shiftTrigger: false,
    metaTrigger: false,
    keydownTrigger: true,
    mousemoveTrigger: true,
    dragTrigger: true,
    escCloseTrigger: true,
    outsideClickCloseTrigger: true,
    outsideScrollCloseTrigger: false,
    dragTriggerOpenDelay: 50,
    dragTriggerReleaseDelay: 400,
    width: 50,
    widthUnit: '%',
}

const currentSettings = {}

document.querySelectorAll('[name]').forEach(input => {
    if (input.tagName === 'META') return

    chrome.storage.sync.get([input.name], result => {
        let target = input.type === 'checkbox' ? 'checked' : 'value'

        if (result[input.name] === undefined) {
            chrome.storage.sync.set({ [input.name]: defs[input.name] })

            input[target] = defs[input.name]
            currentSettings[input.name] = defs[input.name]
        } else {
            input[target] = result[input.name]
            currentSettings[input.name] = result[input.name]
        }
    })
})

setTimeout(() => {
    document.querySelectorAll('[name]').forEach(input => {
        if (input.tagName === 'META') return

        const event = input.type === 'checkbox' ? 'click' : 'change'

        input.addEventListener(event, e => {
            const value = input.type === 'checkbox' ? e.target.checked : e.target.value

            chrome.storage.sync.set({ [input.name]: value }, () => {
                chrome.runtime.sendMessage({ action: 'reinjectPrevueEverywhere' })
            })
        })
    })

    currentSettings.ua = navigator.userAgent
    
    document.querySelector('#contact-link').href += '?prevue=' + btoa(JSON.stringify(currentSettings))
}, 1e3)

const title = document.querySelector('h1')

title.innerHTML = title.innerHTML.replace(/\bv\b/, chrome.runtime.getManifest().version)

document.querySelector('#see-more').addEventListener('click', e => {
    e.target.closest('#changelog-wrapper').classList.add('expanded')
    e.target.remove()
})

document.querySelector('#watch-demo').addEventListener('click', e => {
    document.querySelector('#video-demo').style.display = 'block'
    document.querySelector('#video-demo video').play()
})
