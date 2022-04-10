(() => {
    
    if (location.href === 'about:blank') {
        return
    }
    
    'chrome' in window || (window.chrome = browser)

    window.Prevue = class {
        constructor () {
            this.el = {}
            this.onRight = false
            this.resizing = false
            this.iframeBaseUrl = chrome.runtime.getURL('/prevue.html')
        }

        init () {
            this.listenForBackgroundMessages()

            this.retrieveOptions(options => {
                this.options = options
                this.targetLinks = ['both', 'links'].includes(this.options.target)
                this.targetImages = ['both', 'images'].includes(this.options.target)

                this.prebuildHtml((options.width || 50) + (options.widthUnit === 'px' ? 'px' : 'vw'))

                if (this.options.keydownTrigger) {
                    this.listenTo('keydown', e => this.listener(e))
                }

                if (this.options.mousemoveTrigger) {
                    this.listenTo('mousemove', e => this.listener(e, false, true))
                }

                if (this.options.dragTrigger) {
                    this.listenTo('dragstart', () => {
                        this.dragStart = new Date().getTime()
                        this.closeAllPreviews()
                    })

                    this.listenTo('drag', () => this.dragDelta = new Date().getTime() - this.dragStart)

                    this.listenTo('dragend', e => {
                        if (this.dragDelta >= this.options.dragTriggerOpenDelay &&
                            this.dragDelta <= this.options.dragTriggerReleaseDelay) {
                            this.listener(e, true, true)
                        }
                    })
                }

                if (this.options.escCloseTrigger) {
                    this.listenTo('keydown', e => e.key === 'Escape' && this.close())
                }

                if (this.options.outsideScrollCloseTrigger) {
                    this.listenTo('scroll', e => this.isMinimized() || this.close())
                    this.listen([window, document.body], 'scroll', e => this.isMinimized() || this.close())
                }

                if (this.options.outsideClickCloseTrigger) {
                    this.listenTo('click', e => {
                        e.target.closest('#prevue--wrapper') || this.isMinimized() || this.close()
                    })
                }

                this.listen([window, document.body], 'mousemove', e => {
                    if (! e.clientX || ! this.resizing) return

                    let width = this.onRight ? window.innerWidth - e.clientX : e.clientX
                    width = width / window.innerWidth * 100

                    this.el.sidePreview.style.width = width + 'vw'
                })

                this.listen([window, document.body], 'mouseup', e => {
                    if (! e.clientX || ! this.resizing) return

                    setTimeout(() => this.resizing = false, 200)

                    if (! this.el.sidePreview.style.width.slice(0, -2)) {
                        return
                    }

                    chrome.storage.sync.set({
                        width: this.el.sidePreview.style.width.slice(0, -2),
                        widthUnit: '%'
                    })
                })
            })
        }

        closeAllPreviews () {
            this.url = null

            this.el.sidePreviewImage.removeAttribute('src')
            this.el.sidePreviewIframe.removeAttribute('src')
            this.el.sidePreview.classList.remove('prevue--visible')

            if (this.changedSettings) {
                this.changedSettings = false
                this.bg('reinjectPrevueHere')
            }
        }

        close () {
            if (this.resizing) {
                return
            }

            this.el.sidePreview.classList.contains('prevue--visible')
                && this.closeAllPreviews()
        }

        isMinimized () {
            return this.el.sidePreview.classList.contains('prevue--minimized')
        }

        switchSides () {
            this.el.sidePreview.classList.toggle('prevue--right')

            // Resetting some cache.
            this.panningXOffset = undefined
            this.panningYOffset = undefined
        }

        minimizeMaximize () {
            this.el.sidePreview.classList.toggle('prevue--minimized')
        }

        listener (e, isDragging = false, recordEvent = false) {
            if (this.resizing) return

            if (! this.specialKeyPressed(e) && ! isDragging) return

            let url, type

            if (this.targetImages && e.target.tagName === 'IMG') {
                if (this.targetLinks && e.target.closest('a[href]')) {
                    url = e.target.closest('a[href]').href
                    type = 'url'
                } else {
                    url = e.target.src
                    type = 'image'
                }
            } else if (this.targetLinks) {
                const a = e.target.tagName === 'A' ? e.target : e.target.closest('a[href]')
                url = a?.href
                type = 'url'
            }

            if (e.target.dataset?.role === 'img') {
                type = 'image'
            }

            if (url && this.url !== url) {
                if (this.options.targetLinkTypes === 'both'
                    || (this.options.targetLinkTypes === 'external' && this.isExternal())
                    || (this.options.targetLinkTypes === 'internal' && this.isInternal())) {

                    this.url = url
                    recordEvent && (this.event = e)

                    this.updatePreview(type)
                }
            }
        }

        prebuildHtml (defaultWidth) {
            // Remove everything first.
            document.querySelectorAll('[id=prevue--wrapper]')?.forEach(wrapper => wrapper.remove())

            this.el.sidePreview = document.createElement('div')
            this.el.sidePreview.id = 'prevue--wrapper'
            this.el.sidePreview.style.width = defaultWidth

            if (! this.options.displayUrl) {
                this.el.sidePreview.classList.add('prevue--hidden-title')
            }

            if (this.options.urlPosition === 'bottom') {
                this.el.sidePreview.classList.add('prevue--url-bottom')
            }

            if (this.options.openAnimation) {
                this.el.sidePreview.style.transition = 'opacity .2s, left .2s, right .2s'
            }

            const dragger = document.createElement('div')
            dragger.id = 'prevue--dragger'

            dragger.addEventListener('mousedown', e => {
                this.resizing = true
                this.onRight = this.el.sidePreview.classList.contains('prevue--right')
            })

            this.el.sidePreview.appendChild(dragger)

            this.el.sidePreviewTitleWrapper = document.createElement('div')

            const title = document.createElement('a')
            title.className = 'prevue--title'
            title.target = '_blank'
            this.el.sidePreviewTitleWrapper.appendChild(title)

            this.el.sidePreviewTitleWrapper.className = 'prevue--wrapper-title'
            this.el.sidePreview.appendChild(this.el.sidePreviewTitleWrapper)

            this.el.sidePreviewIframe = document.createElement('iframe')
            this.el.sidePreviewIframe.className = 'prevue--iframe'
            this.el.sidePreview.appendChild(this.el.sidePreviewIframe)

            this.el.sidePreviewImageWrapper = document.createElement('div')
            this.el.sidePreviewImageWrapper.className = 'prevue--image-wrapper'
            this.el.sidePreview.appendChild(this.el.sidePreviewImageWrapper)

            this.el.sidePreview.onmousemove = e => this.imageZoomPanningHandler(e)

            this.el.sidePreviewImage = document.createElement('img')
            this.el.sidePreviewImage.className = 'prevue--image'

            this.el.sidePreviewImage.onclick = e => {
                const image = e.target

                if (this.getImageZoomPerc() < 100 || image.dataset.panning) {
                    image.dataset.panning = image.dataset.panning === 'true' ? 'false' : 'true'
                }

                setTimeout(() => this.imageZoomPanningHandler(e), 1)
                setTimeout(() => this.setTitle(` (${this.getImageZoomPerc()}%)`), 100)
            }

            this.el.sidePreviewImage.onload = () => this.setTitle(` (${this.getImageZoomPerc()}%)`)
            this.el.sidePreviewImage.onerror = () => this.updatePreview('url')

            this.el.sidePreviewImageWrapper.appendChild(this.el.sidePreviewImage)

            // Create the action buttons wrapper.
            this.el.sidePreviewActions = document.createElement('div')
            this.el.sidePreviewActions.className = 'prevue--actions'

            let action = document.createElement('div')
            action.innerHTML = this.closeIconSvg()
            action.className = 'prevue--action-close'
            action.onclick = e => this.close(e)
            action.title = 'Close Prevue Popup'
            this.el.sidePreviewActions.appendChild(action)

            action = document.createElement('div')
            action.innerHTML = this.switchSidesIconSvg()
            action.className = 'prevue--action-switch-sides'
            action.onclick = e => this.switchSides(e)
            action.title = 'Switch Sides'
            this.el.sidePreviewActions.appendChild(action)

            action = document.createElement('div')
            action.innerHTML = this.chevronLeftIconSvg()
            action.className = 'prevue--action-minimize-maximize'
            action.onclick = e => this.minimizeMaximize(e)
            action.title = 'Minimize / Maximize'
            this.el.sidePreviewActions.appendChild(action)

            action = document.createElement('div')
            action.innerHTML = this.cogIconSvg()
            action.className = 'prevue--action-settings'
            action.title = 'Prevue Options'
            action.onclick = () => {
                if (this.url.startsWith(chrome.runtime.getURL('options.html'))) {
                    this.url = this.previousUrl + ''
                    this.previousUrl = null
                } else {
                    this.previousUrl = this.url + ''
                    this.url = chrome.runtime.getURL('options.html')
                    this.changedSettings = true
                }

                this.openIframePopup()
            }

            this.el.sidePreviewActions.appendChild(action)

            this.el.sidePreview.appendChild(this.el.sidePreviewActions)
            document.body.appendChild(this.el.sidePreview)
        }

        getImageZoomPerc () {
            const image = this.el.sidePreviewImage
            const xPerc = image.clientWidth / image.naturalWidth * 100
            const yPerc = image.clientHeight / image.naturalHeight * 100

            return Math.round(Math.min(xPerc, yPerc))
        }

        retrieveOptions (cb) {
            try {
                chrome.storage.sync.get(null).then(options => cb(options))
            } catch (e) {}
        }

        sidePreview (type) {
            // If the mouse is positioned on the right side of the page, add a CSS class.
            this.el.sidePreview.classList.toggle('prevue--right', this.shouldOpenOnTheRight())

            if (type === 'image') {
                this.setTitle()

                this.el.sidePreviewImage.src = this.url
                this.el.sidePreview.classList.add('prevue--visible')
                this.el.sidePreviewIframe.style.display = 'none'
                this.el.sidePreviewImageWrapper.style.display = 'flex'

                return
            }

            this.openIframePopup()
        }

        openIframePopup () {
            this.el.sidePreviewImageWrapper.style.display = 'none'
            this.el.sidePreviewIframe.style.display = 'block'
            this.el.sidePreview.classList.add('prevue--visible')

            this.setTitle()

            this.el.sidePreviewIframe.src = `${this.iframeBaseUrl}?${btoa(this.url)}`
        }

        shouldOpenOnTheRight () {
            if (this.options.openPosition === 'left') {
                return false
            }

            return this.options.openPosition === 'right'
                || this.event.clientX <= window.innerWidth / 2
        }

        visualUrl (append = '') {
            let isSecure = /^https:\/\//i.test(this.url)

            return (isSecure ? this.lockIconSvg() : '') + `<div>` + this.url
                .replace(new RegExp(`^${location.origin}`, 'i'), '')
                .replace(/^(https?:\/\/)www\./, '$1')
                .replace(/^http:\/\//i, '')
                .replace(/^https:\/\//i, '')
                .replace(/^(!?)([^/]+)/, '$1<strong>$2</strong>') + append + '</div>'
        }

        specialKeyPressed (e) {
            return (this.options.altTrigger && e.altKey)
                || (this.options.metaTrigger && e.metaKey)
                || (this.options.ctrlTrigger && e.ctrlKey)
                || (this.options.shiftTrigger && e.shiftKey)
        }

        updatePreview (type) {
            this.bg({ action: 'rememberUrl', url: this.url })

            this.sidePreview(type)
        }

        setTitle (append = '') {
            this.el.sidePreviewTitleWrapper.children[0].innerHTML = this.visualUrl(append)
            this.el.sidePreviewTitleWrapper.children[0].title = this.url
            this.el.sidePreviewTitleWrapper.children[0].href = this.url
        }

        isExternal () {
            if (! this.url) {
                return false
            }

            // Begins with something other than http or //
            if (! this.url.toLowerCase().startsWith('http') && /^\/?[^/]+/.test(this.url)) {
                return false
            }

            // Check if it contains the original location.
            return ! new RegExp(`^(http)?s?:?//${location.hostname}`, 'i').test(this.url)
        }

        isInternal () {
            return ! this.isExternal()
        }

        imageZoomPanningHandler (e) {
            const image = this.el.sidePreviewImage
            const deadOffset = 15

            if (! image.dataset?.panning) return

            const wrapperWidth = this.el.sidePreviewImageWrapper.offsetWidth
            const wrapperHeight = this.el.sidePreviewImageWrapper.offsetHeight
            const shouldHandleXPanning = image.naturalWidth > wrapperWidth
            const shouldHandleYPanning = image.naturalHeight > wrapperHeight

            if (shouldHandleXPanning && this.panningXOffset === undefined) {
                this.panningXOffset = this.el.sidePreview.classList.contains('prevue--right')
                    ? window.innerWidth - this.el.sidePreview.offsetWidth : 0
            }

            if (shouldHandleYPanning && this.panningYOffset === undefined) {
                this.panningYOffset = this.options.urlPosition === 'top' && this.options.displayUrl
                    ? this.el.sidePreviewTitleWrapper.offsetHeight : 0
            }

            if (shouldHandleXPanning) {
                let x = e.x - this.panningXOffset
                x < deadOffset && (x = 0)
                x > wrapperWidth - deadOffset && (x = wrapperWidth)
                const xPerc = x / wrapperWidth

                image.style.left = -xPerc * (image.offsetWidth - wrapperWidth) + 'px'
            } else {
                image.style.left = (wrapperWidth / 2 - image.offsetWidth / 2) + 'px'
            }

            if (shouldHandleYPanning) {
                let y = e.y - this.panningYOffset
                y < deadOffset && (y = 0)
                y > wrapperHeight - deadOffset && (y = wrapperHeight)
                const yPerc = y / wrapperHeight

                image.style.top = -yPerc * (image.offsetHeight - wrapperHeight) + 'px'
            } else {
                image.style.top = (wrapperHeight / 2 - image.offsetHeight / 2) + 'px'
            }
        }

        bg (data, cb = function () {}) {
            if (typeof data === 'string') {
                data = { action: data }
            }

            try {
                chrome.runtime.sendMessage(data, cb)
            } catch (e) {}
        }

        lockIconSvg () {
            return `<svg xmlns="http://www.w3.org/2000/svg" class="prevue--secure-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" /></svg>`
        }

        closeIconSvg () {
            return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`;
        }

        chevronLeftIconSvg () {
            return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>`;
        }

        switchSidesIconSvg () {
            return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>`;
        }

        cogIconSvg () {
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" /></svg>`
        }

        /**
         * Simple debugging tool for measuring times.
         */
        ts (append = '') {
            if (this.prevTs) {
                console.log(new Date().getTime() - this.prevTs + 'ms', append)
            } else {
                console.log('-------------- started debugging --------------')
                console.log(append)
            }

            this.prevTs = new Date().getTime()
        }

        isFramed () {
            try {
                return window.self !== window.top
            } catch (e) {
                return false
            }
        }

        initInsideIframe () {
            const metaRedirect = document.documentElement.innerHTML
                .match(/<meta content=(.?)0;url=(.+)\1[^>]+?http-equiv=.?refresh.?>/i)

            if (metaRedirect) {
                this.bg({ action: 'reportingMetaRedirect', url: metaRedirect[2] })
            } else {
                this.bg({ action: 'reportingIframeUrl', url: location.href })

                this.restyleEmbeddedSitesScrollbars()
                this.passthroughEscapeKeyPressEvent()
            }
        }

        passthroughEscapeKeyPressEvent () {
            document.addEventListener('keyup', e => {
                e.key === 'Escape' && this.bg({ action: 'pressedEscape' })
            })
        }

        restyleEmbeddedSitesScrollbars () {
            const style = document.createElement('style')

            style.innerHTML = `
                html::-webkit-scrollbar,
                body::-webkit-scrollbar { background: transparent !important; width: 6px !important; height: 6px !important; }
                html::-webkit-scrollbar-track,
                body::-webkit-scrollbar-track { background-color: transparent !important; }
                html::-webkit-scrollbar-thumb,
                body::-webkit-scrollbar-thumb { background: #444 !important; transition: all .2s !important; border-radius: 0 !important; }
                html::-webkit-scrollbar-thumb:hover,
                body::-webkit-scrollbar-thumb:hover { background: #222 !important; }
                @media (prefers-color-scheme: dark) {
                    html::-webkit-scrollbar-thumb,
                    body::-webkit-scrollbar-thumb { background: #aaa !important; transition: all .2s !important; }
                    html::-webkit-scrollbar-thumb:hover,
                    body::-webkit-scrollbar-thumb:hover { background: #ddd !important; }
                }
            `

            document.body.appendChild(style)
        }

        listenForBackgroundMessages () {
            chrome.runtime.onMessage.addListener((req, sender, respond) => {
                if (req.action === 'reportingIframeUrl' && this.url !== req.url) {
                    this.url = req.url

                    this.setTitle()
                }

                if (req.action === 'reportingMetaRedirect' && this.url !== req.url) {
                    this.url = req.url

                    this.openIframePopup()
                }

                else if (req.action === 'pressedEscape') {
                    this.close()
                }

                respond()

                return true
            })
        }

        listen (els, event, handler) {
            els.map(el => el.addEventListener(event, e => this.isContextInvalidated() || handler(e), false))
        }

        listenTo (event, handler) {
            this.listen([document.body], event, handler)
        }

        /**
         * The chrome.* API calls fail when the extension gets updated or reloaded,
         * which basically translates to the fact that this specific
         * content script injection is not usable anymore.
         * So I'm invalidating its event listeners.
         *
         * Note that a subsequent content injection will typically take place
         * when this happens, which basically "replaces" this one.
         * This check was added because they're actually
         * being executed in parallel.
         */
        isContextInvalidated () {
            if (this.contextInvalidated) {
                return true
            }

            try {
                chrome.runtime.getURL('/')

                return false
            } catch (e) {
                this.contextInvalidated = true

                return true
            }
        }
    }

    window.App = new Prevue()

    App.isFramed()
        ? App.initInsideIframe()
        : App.init()

})()
