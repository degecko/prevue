let options = {
    target: 'both',
    targetLinkTypes: 'both',
    openPosition: 'auto',
    openAnimation: true,
    displayUrl: true,
    urlPosition: 'top',
    escCloseTrigger: true,
    outsideClickCloseTrigger: true,
    outsideScrollCloseTrigger: false,
    width: 50,
    widthUnit: '%',
    triggerOpenDelay: 50,
    triggerReleaseDelay: 400,
    triggers: [
        { key: '', action: 'drag' },
        { key: 'alt', action: 'mouseover' },
    ],
}

// Restore the current settings or apply the defaults.
chrome.storage.sync.get(null).then(res => {
    options = { ...options, ...res }

    chrome.storage.sync.set(options)

    document.addEventListener('change', e => {
        if (e.target.tagName !== 'SELECT') return

        const select = e.target

        if (select.name.startsWith('triggers[')) {
            options.triggers[select.dataset.index][select.dataset.prop] = select.value
        } else {
            options.triggers[select.name] = select.value
        }

        chrome.storage.sync.set(options)
    })

    document.addEventListener('click', e => {
        if (e.target.tagName !== 'INPUT') return

        options[e.target.name] = e.target.type === 'checkbox' ? e.target.checked : e.target.value

        chrome.storage.sync.set(options)
    })

    updateInputValues()
})

// const currentSettings = {}
//
// document.querySelectorAll('[name]').forEach(input => {
//     if (input.tagName === 'META') return
//
//     chrome.storage.sync.get([input.name], result => {
//         let target = input.type === 'checkbox' ? 'checked' : 'value'
//
//         if (result[input.name] === undefined) {
//             chrome.storage.sync.set({ [input.name]: defs[input.name] })
//
//             input[target] = defs[input.name]
//             currentSettings[input.name] = defs[input.name]
//         } else {
//             input[target] = result[input.name]
//             currentSettings[input.name] = result[input.name]
//         }
//     })
// })
//
// setTimeout(() => {
//     document.querySelectorAll('[name]').forEach(input => {
//         if (input.tagName === 'META') return
//
//         const event = input.type === 'checkbox' ? 'click' : 'change'
//
//         input.addEventListener(event, e => {
//             const value = input.type === 'checkbox' ? e.target.checked : e.target.value
//
//             chrome.storage.sync.set({ [input.name]: value }, () => {
//                 chrome.runtime.sendMessage({ action: 'reinjectPrevueEverywhere' })
//             })
//         })
//     })
//
//     currentSettings.ua = navigator.userAgent
//
//     document.querySelector('#contact-link').href += '?prevue=' + btoa(JSON.stringify(currentSettings))
// }, 1e3)

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

function updateInputValues () {
    Object.keys(options).map(option => {
        const input = document.querySelector(`[name="${option}"]`)

        if (! input) return

        if (input?.type === 'checkbox') {
            input.checked = options[option]
        } else {
            input.value = options[option]
        }
    })

    updateTriggersSection()
}

function updateTriggersSection () {
    const section = document.querySelector('#triggers')
    let markup = '', i = 0

    for (let trigger of options.triggers) {
        markup += `
            <div class="f" style="margin-bottom: 1rem;">
                <div style="padding: 0">
                    <select name="triggers[][key]" data-index="${i}" data-prop="key" data-value="${trigger.key}" style="width: 100%">
                        <option value="">none</option>
                        <option value="alt">ALT</option>
                        <option value="meta">CMD / WIN</option>
                        <option value="ctrl">CTRL</option>
                        <option value="shift">SHIFT</option>
                    </select>
                </div>
                <div style="padding: 0; margin: .5rem; width: 20px; flex-grow: 0; text-align: center;">
                    <strong>&amp;</strong>
                </div>
                <div style="padding: 0">
                    <select name="triggers[][action]" data-index="${i}" data-prop="action" data-value="${trigger.action}" style="width: 100%">
                        <option value="">Choose</option>
                        <option value="click">Left Click</option>
                        <option value="mouseover">Cursor Over / Hover</option>
                        <option value="drag">Drag</option>
                    </select>
                </div>
                <div style="padding: 0; margin: 0 0 0 1rem; width: 40px; flex-grow: 0; text-align: center;">
                    <button type="button" class="danger delete-trigger" data-trigger="${i}" style="height: 100%">&times;</button>
                </div>
            </div>
        `

        i++
    }

    section.innerHTML = markup

    section.querySelectorAll('select').forEach(select => {
        select.value = select.dataset.value + ''
    })
}

document.querySelector('#add-trigger').addEventListener('click', () => {
    options.triggers.push({ key: '', action: '' })

    updateTriggersSection()
})

document.addEventListener('click', e => {
    if (e.target.classList.contains('delete-trigger')) {
        options.triggers.splice(+e.target.dataset.trigger, 1)

        updateTriggersSection()

        chrome.storage.sync.set(options)
    }
})
