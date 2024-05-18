// ==UserScript==
// @name        Fantastic Streamer
// @namespace   https://github.com/pepeloni-away
// @icon        https://i.imgur.com/XC8ptrf.png
// @author      pploni
// @run-at      document-start
// @insert-into page
// @version     1.2
// @description Open videos from webpages in android video players
// @grant       GM_log
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_deleteValue
// @grant       GM_listValues
// @grant       GM_addValueChangeListener
// @grant       GM_removeValueChangeListener
//
// @match       https://aniwave.to/watch/*
// @match       https://animesuge.to/anime/*
// @match       https://anix.to/anime/*
// @match       https://vizcloud.*/e/*
// @match       https://vizcloud.*/embed/*
// @match       https://vidstream.*/e/*
// @match       https://vidstream.*/embed/*
// @match       https://vidplay.*/e/*
// @match       https://vidplay.*/embed/*
// @match       https://a9bfed0818.nl/e/*
// @match       https://mcloud.to/e/*
// @match       https://mcloud.bz/e/*
// @match       https://filemoon.sx/e/*
// @match       https://kerapoxy.cc/e/*
// @match       https://www.mp4upload.com/embed*
// @match       https://mp4upload.com/embed*
//
// @match       https://zoro.to/watch/*
// @match       https://rapid-cloud.co/embed*
// @match       https://watchsb.com/e/*
//
// @match       https://animepahe.*/play/*
// @match       https://kwik.cx/e/*
// @match       https://kwik.si/e/*
//
// @match       https://yugenanime.tv/watch/*
// @match       https://yugenanime.tv/e/*
//
// @match       https://hanime.tv/*
// @match       https://player.hanime.tv/*
// @exclude     https://hanime.tv/omni-player/*
//
// @match       https://marin.moe/*
// @match       https://plyr.link/p/player.html#*
// ==/UserScript==

const savePrefs = false // Saves changes you make in config and uses them after updates set config back to default.
const noPrefs = false // Skips save & check preferences - runs with the settings you see in config.
const verbose = false
const config = {
    debug: true, // Global switch for logging to console.
    debugWindow: true, // Logs things to a toggleable window - for mobile browsers without console access.
    debugWindow_topColor: "rebeccapurple",
    debugWindow_iframeColor: "green",
    logXHR: false,
    cornerButton: true, // Adds a button over the video - tap to open preferedQuality, hold to show all quality options.
    blockVideoPlay: true, // Playing video in browser will open preferedQuality instead
    pairs: false, // Only run in iframes if the top window is also a match. Can lead to undetected streaming links in iframes that load very fast, like animepahe's.
    preferedQuality: "best" // Set to "best" or "ask" or 1080 or <any other number from the array below> - will ask if number is not found.
}
const qualityOptions = [1080, 900, 720, 575, 480, 432, 360, 288, 240]
const qualityList = {}
const overlayLog = {}
const iframe = self.top !== self
const log = GM_log
const v = log.bind(undefined, `-v ${iframe ? "ifr" : "top"}:`)
const android = (_ => {
    try {
        // this seems to be violentmonkey exclusive
        return GM_info.platform.os === "android"
    } catch {
        return /android/i.test(navigator.userAgent)
    }
})() //|| true
let logConfig = false
let allowPlay = !config.blockVideoPlay
let channel = "ch" + new Date().getTime()


function flog(...args) {
    if (config.debug) {
        const color = iframe ? config.debugWindow_iframeColor : config.debugWindow_topColor
        log(
            "%cλ%c FS on %c%s", "background-color: #023020; color: white; padding: 2px 10px; border-radius: 3px;",
            "",
            `background-color: ${color}; color: white; padding: 2px 10px; border-radius: 3px;`,
            location.href,
            "\n",
            ...args
        )
    }
    if (config.debugWindow) {
        overlayLog.add(args)
        iframe && GM_setValue(channel, overlayLog)
    }
}

async function prefs() {
    const now = new Date().getTime()
    if (savePrefs) {
        await GM_setValue("_prefs", config)
    }
    const saved = await GM_getValue("_prefs", config)
    // check if saved key still is part of config and check if it has different value
    for (const key of Object.keys(saved)) {
        if (config[key] !== undefined && saved[key] !== config[key]) {
            logConfig = true
        }
    }
    for (const item in saved) {
        // don't bring old removed keys back into config
        if (config[item] !== undefined) {
            config[item] = saved[item]
        }
    }
    // write again after applying saved prefs in case options have been added/removed after updates
    await GM_setValue("_prefs", config)
    const end = new Date().getTime()
    verbose && v("prefs sync took", end - now, "ms, executing init function")
    init()
}

async function cleanup() {
    const now = new Date().getTime()
    const arr = await GM_listValues()
    for (const key of arr) {
        if (key !== "_prefs") {
            await GM_deleteValue(key)
        }
    }
    const end = new Date().getTime()
    verbose && v("cleanup took", end - now, "ms")
}

function init() {
    Object.defineProperties(qualityList, {
        "unknown": {
            value: []
        },
        "subs": {
            value: []
        },
        "empty": {
            get() {
                return !(Object.values(this).length > 0 || Object.values(this.unknown).length > 0)
            }
        },
        "best": {
            get() {
                for (const resolution of qualityOptions) {
                    if (this[resolution]) {
                        return this[resolution]
                    }
                }
                return this.unknown[0]
            }
        },
        "add": {
            value: function add(optionalProp, val) {
                if (arguments.length === 1) {
                    val = optionalProp
                    optionalProp = "unknown"
                }
                if (optionalProp === "unknown") {
                    if (Object.values(this).indexOf(val) === -1 && this.unknown.indexOf(val) === -1) this.unknown.push(val)
                    return this
                }
                const position = this.unknown.indexOf(val)
                if (position > -1) {
                    this.unknown.splice(position, 1)
                }
                this[optionalProp] = val
                return this
            }
        }
    })
    Object.defineProperties(overlayLog, {
        "deleted": {
            value: []
        },
        "add": {
            value: function add(argsArray) {
                const date = new Date().getTime()
                let prop = iframe ? date + "iframe" : date
                const val = {
                    content: this.stringify(argsArray),
                    element: null,
                    color: iframe ? config.debugWindow_iframeColor : config.debugWindow_topColor
                }
                // account for https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTime#return_time_precision
                while (this[prop] !== undefined) {
                    prop = prop + "i"
                }
                this[prop] = val

                this.sync()
                return this
            }
        },
        "sync": {
            value: function sync() {
                if (document.querySelector("#phonedebug") === null) return
                const target = document.querySelector("#logs")
                let lastValue = null
                for (const [key, value] of Object.entries(this)) {
                    if (value.element === null) {
                        value.element = document.createElement("pre")
                    }
                    if (lastValue && lastValue.content === value.content) {
                        delete this[key]
                        this.deleted.push(key)
                        lastValue.element.className = "dupe"
                        const count = lastValue.element.getAttribute("dupeCounter") || 0
                        lastValue.element.setAttribute("dupeCounter", `${parseInt(count) + 1}`)
                        verbose && v("removed dupe from debugWindow")
                    }
                    value.element.style.color = value.color
                    value.element.innerText = value.content
                    lastValue = value
                }
                target.append(...Object.keys(this).sort().map(i => this[i].element))
            }
        },
        "stringify": {
            value: function stringify(argsArray) {
                if (typeof argsArray[0] === "string" && argsArray[0].startsWith("New instance")) {
                    return `New instance on: ${location.href}`
                }
                const result = []
                for (const arg of argsArray) {
                    if (typeof arg === "string") {
                        result.push(arg)
                    }
                    if (typeof arg === "object") {
                        try {
                            result.push(JSON.stringify(arg, null, 2))
                        } catch (e) {
                            result.push(e.toString())
                        }
                    }
                }
                return result.join(" ")
            }
        }
    })
    verbose && v("set qualityList and overlayLog properties")
    cleanup()
    return config.pairs ? pairs() : start()

    function pairs() {
        // this works well but is pretty slow, find a way to pair scripts with GM functions [[[[[[[[[[[[[[[[[[[[]]]]]]]]]]]]]]]]]]]]
        // could use iframe.name and self.name -- --- nevermind, only works on firefox
        const now = new Date().getTime()
        if (iframe) {
            self.addEventListener("message", m => {
                if (m.data === "FS run.") {
                    verbose && v('iframe setup took', new Date().getTime() - now, "ms")
                    start()
                }
            })
            self.top.postMessage("FS run?", "*")
            verbose && v("sent FS run? message", new Date().getTime() - now)
        }
        if (iframe === false) {
            self.addEventListener("message", m => {
                if (m.data === "FS run?") {
                    verbose && v("FS run? received", new Date().getTime() - now)
                    m.source.postMessage("FS run.", "*")
                }
            })
            verbose && v("successfully paired, executing start function")
            start()
        }
    }

    function start() {
        verbose && v("start! - executing hooks and top/iframe functions")
        hooks()
        iframe ? iframeWindow() : topWindow()
    }
}

function hooks() {
    const utils = {
        base64rx: /^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{4}|[A-Za-z0-9+\/]{3}=|[A-Za-z0-9+\/]{2}={2})$/,
        scrapeXHR(xhr) {
            const url = xhr.responseURL
            const response = this.base64rx.test(xhr.response) ? atob(xhr.response) : xhr.response
            if (/^#EXTM3U/.test(response)) {
                if (/#EXT-X-MEDIA-SEQUENCE/.test(response) === false) {
                    flog(`found master m3u8: ${url}`)
                    this.parseM3U8(url, response)
                } else {
                    qualityList.add(url)
                }
            }
            if (/(?<!timeline|thumbnails).vtt$/.test(url)) {
                if (/^WEBVTT/.test(response)) {
                    qualityList.subs.push(url)
                }
            }
        },
        parseM3U8(url, m3u8) {
            function completeSlug(master, slug) {
                const t = master.match(/(http.*\/)/)
                return t[1] + slug
            }
            const re = /(?<=^#EXT-X-STREAM-INF:).*\d{3,4}x(\d{3,4}).*\n([^\n]+)/gm
            let m
            do {
                m = re.exec(m3u8)
                m && qualityList.add(m[1], m[2].startsWith("http") ? m[2] : completeSlug(url, m[2]))
            } while (m);
        },
        // keep in mind this is called before video src is set!
        scrapeVideo(video) {
            // use events to also support sites that don't reload on navigation, like marin.moe
            video.addEventListener("loadedmetadata", (event) => {
                config.cornerButton && video.parentElement && cornerButton(video.parentElement, video)
                if (video.src.startsWith("http")) {
                    const size = video.videoHeight
                    size ? qualityList.add(size, video.src) : qualityList.add(video.src)
                }
                for (const element of video.childNodes) {
                    if (element instanceof HTMLSourceElement === false) return
                    if (element.src === undefined) return
                    if (element.src.startsWith("http") === false) return
                    const size = element.getAttribute("size")
                    size ? qualityList.add(size, element.src) : qualityList.add(element.src)
                }
            })
        }
    }
    XMLHttpRequest.prototype.open = new Proxy(XMLHttpRequest.prototype.open, {
        apply: function(target, thisArg, args) {
            try {
                config.logXHR && flog(`XHR ${args[0]} --> ${args[1]}`)
                thisArg.addEventListener("load", () => {
                    utils.scrapeXHR(thisArg)
                })
            } catch (e) {
                flog(e, "open trap failed, arguments:", arguments)
            }
            return Reflect.apply(...arguments)
        }
    })
    HTMLMediaElement.prototype.play = new Proxy(HTMLMediaElement.prototype.play, {
        apply(target, thisArg, args) {
            label: if (android) {
                if (args[0] !== "intent" && allowPlay) break label // so that i can use HTMLMediaElement.prototype.play("intent", *videoElement for ask menu)
                if (qualityList.empty === true) return
                if (config.preferedQuality === "best") {
                    return startIntent(qualityList.best)
                }
                if (qualityList[config.preferedQuality]) {
                    return startIntent(qualityList[config.preferedQuality])
                }
                return askQuality(thisArg instanceof HTMLVideoElement ? thisArg : args[1])
            }
            if (document.querySelector("#FS-cornerButton")) { // hide this without putting it to the top right of the video, it causes overflow and creates a scroll bar [[[[[[[[[[]]]]]]]]]]
                document.querySelector("#FS-cornerButton").style.transform = "translateX(100%) translateY(-100%)"
            }
            return Reflect.apply(...arguments)
        }
    })
    HTMLMediaElement.prototype.pause = new Proxy(HTMLMediaElement.prototype.pause, {
        apply(target, thisArg, args) {
            if (document.querySelector("#FS-cornerButton")) {
                document.querySelector("#FS-cornerButton").style.transform = ""
            }
            return Reflect.apply(...arguments)
        }
    })
    Object.defineProperty(HTMLMediaElement.prototype, "src", {
        set: new Proxy(Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "src").set, {
            apply(target, thisArg, args) {
                if (thisArg instanceof HTMLVideoElement) {
                    utils.scrapeVideo(thisArg)
                }
                return Reflect.apply(...arguments)
            }
        }),
        get: Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "src").get,
        configurable: true
    })
    Object.defineProperty(HTMLSourceElement.prototype, "src", {
        set: new Proxy(Object.getOwnPropertyDescriptor(HTMLSourceElement.prototype, "src").set, {
            apply(target, thisArg, args) {
                setTimeout(_ => {
                    if (thisArg.parentElement && thisArg.parentElement instanceof HTMLVideoElement) {
                        verbose && v("scraping video parent of source element")
                        utils.scrapeVideo(thisArg.parentElement)
                    }
                })
                return Reflect.apply(...arguments)
            }
        }),
        get: Object.getOwnPropertyDescriptor(HTMLSourceElement.prototype, "src").get,
        configurable: true
    })
    HTMLSourceElement.prototype.setAttribute = new Proxy(HTMLSourceElement.prototype.setAttribute, {
            apply(target, thisArg, args) {
                setTimeout(_ => {
                    if (thisArg.parentElement && thisArg.parentElement instanceof HTMLVideoElement) {
                        verbose && v("scraping video parent of source element")
                        utils.scrapeVideo(thisArg.parentElement)
                    }
                })
                return Reflect.apply(...arguments)
            }
        })


    // ===extractors for unconventional sites===
    // ===top page extractors===
        ! function extractHanime() {
            // hanime has streaming links and a other things inside a global variable __NUXT__ on the top page
            // i wanted to make this because sometimes hanime crashes unless opened in a new tab, it is actually a compatibility problem with dark reader, on ff at least
        }();
    // ===/top page extractors===
    /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - */
    // ===iframe page extractors===
    ! function extractKwik() {
        if ("kwik.cx" !== location.hostname) return
        self.addEventListener("load", _ => {
            const quality = document.documentElement.innerHTML.match(/(?<=_)\d{3,4}(?=p_)/)[0]
            const a = document.querySelector("script:not([src])").innerText.match(/m3u8.*?(?=')/)[0].split("|").reverse().slice(5)
            const b = document.documentElement.innerHTML.match(/(?<=<link rel="preconnect" href="\/\/)\w+-(\d+)\.\w+\.nextcdn\.org(?=">)/)
            qualityList.add(quality, "https://" + b[0] + "/" + a[0] + "/" + b[1] + "/" + a.slice(1, 4).join("/") + "." + a[4])
            // in case we missed the video.onloadedmedtadata event
            cornerButton(document.querySelector("video").parentElement, document.querySelector("video"))
        })
    }();
    ! function watchsbHeaders() {
        // watchsb links will return 403 if user agent or accept language header differ from the ones the browser used
        if ("watchsb.com" !== location.hostname) return
        XMLHttpRequest.prototype.send = new Proxy(XMLHttpRequest.prototype.send, {
            apply(target, thisArg, args) {
                // pass this header when starting intent
                thisArg.setRequestHeader("Accept-Language", "en-GB,en;q=0.5")
                return Reflect.apply(...arguments)
            }
        })
    }();
    // ===/iframe page extractors===
    // ===/extractors for unconventional sites===
    verbose && v("hooks completed successfully")
}

function topWindow() {
    // ===setup communication channel===
    function titleRequestHandler(name, oldValue, newValue, remote) {
        if (newValue === undefined) return // this just means it was deleted by another instance of the userscript
        if (newValue === "title?") {
            verbose && v("title request received", name, oldValue, newValue, remote)
            GM_setValue(name, {
                topTitle: document.title,
                betterTitle: betterTitle()
            })
        }
    }

    function channelListenerHandler(name, oldValue, newValue, remote) {
        if (newValue === undefined) return // this just means it was deleted by another instance of the userscript
        if (remote === false) return
        // why not just overlayLog.add here?
        // because this listener only fires every change on tampermonkey.
        // Given multiple GM_setValue in quick succession, like logging 12 subtitle requests in a few miliseconds,
        // in violentmonkey the listener will only fire for the 12th change, and maybe once for one of the first ones.
        for (const [prop, val] of Object.entries(newValue)) {
            overlayLog[prop] === undefined && overlayLog.deleted.indexOf(prop) === -1 && (overlayLog[prop] = val)
        }
        verbose && v("merged overlayLog from iframe")
        overlayLog.sync()
    }
    GM_addValueChangeListener(channel + "title", titleRequestHandler)
    GM_addValueChangeListener(channel, channelListenerHandler)
    self.addEventListener("message", m => {
        if (typeof m.data === "object" && m.data.FS === "ping") {
            m.source.postMessage({
                FS: channel
            }, "*")
        }
    })
    // ===/setup communication channel===
    greet()


    function betterTitle() {
        if (location.hostname === "animesuge.to" || location.hostname.startsWith("aniwave")) {
            const name = document.querySelector(".info .title").innerText
            const ep = document.querySelector(".ep-range li a.active").innerText
            if (typeof name === "string" && typeof "ep" === "string") {
                return name + " - episode " + ep
            }
        }
        // do this for zoro as well [[[[[[[[[[[[[[]]]]]]]]]]]]]]
        verbose && v("did not find a better title")
        return null
    }
    ! function addOverlay() {
        if (!config.debugWindow) return
        if (document.body === null) {
            new MutationObserver((m, obs) => {
                if (document.body) {
                    obs.disconnect();
                    addOverlay()
                }
            }).observe(document, {
                childList: true,
                subtree: true
            })
            return
        }
        const html = `
            <div id="phonedebug" style="display: none;">
                <div id="fs-btn-group">
                    <button id="FSClear">Clear</button>
                    <button id="FSIframes">Iframes</button>
                    <button id="FSConfig">Config</button>
                    <button id="FSQlist">Qlist</button>
                </div>
                <div id="logs"></div>
            </div>
            <div id="phonedebug_toggle">
                 DEBUG
            </div>
        `
        const css = `
            #phonedebug_toggle {
                font-size: 14px;
                position: fixed;
                left: 0;
                bottom: 0;
                color: orange;
                cursor: pointer;
                z-index: 999;
                padding: 5px 5px 1em 1em;
                user-select: none !important;
            }

            #phonedebug {
                background-color: rgba(0, 0, 0, 0.88);
                position: fixed;
                top: 0;
                width: 100%;
                height: 75%;
                z-index: 999;
                padding: 12px 12px 20px 12px;
                overflow-wrap: break-word;
                overflow: hidden scroll;
                color: white;
            }

            /* ******* credits to https://www.w3schools.com/howto/howto_css_button_group.asp ******* */
            #fs-btn-group {
                width: 100%;
                margin-bottom: 1em;
                border-bottom: medium groove aqua;
            }

            #fs-btn-group > button {
                width: 25%
            }

            #fs-btn-group button {
                background-color: #04AA6D;
                border: 1px solid green;
                color: white;
                padding: 10px 12px;
                cursor: pointer;
                float: left;
            }

            #fs-btn-group button:not(:last-child) {
                border-right: none; /* Prevent double borders */
            }

            /* Clear floats (clearfix hack) */
            #fs-btn-group:after {
                content: "";
                clear: both;
                display: table;
            }

            #fs-btn-group button:active {
                background-color: #3e8e41;
            }

            /* ******* end credits to https://www.w3schools.com/howto/howto_css_button_group.asp ******* */

            #logs > pre {
                /* allow line wrap on long lines */
                white-space: pre-wrap !important;

                border: 1px solid;
                padding-left: 2px;
            }

            #logs > pre.dupe::after {
                content: "(" attr(dupeCounter) ")";
                color: blue;
                float: right;
            }
        `
        // document.body.innerHTML += html // this crashes page when clicking new episode on pahe for some reason
        document.body.insertAdjacentHTML("beforeend", html)
        document.head.appendChild(document.createElement("style")).innerText = css
        overlayLog.sync()


        document.querySelector("#phonedebug_toggle").addEventListener("click", _ => {
            const div = document.querySelector("#phonedebug")
            if (div.style.display === "none") {
                div.style.display = ""
                // only scroll debugWindow when it is shown, not the page
                document.body.style.paddingRight = `${self.innerWidth - document.body.offsetWidth}px`
                document.body.style.overflow = "hidden"
                return
            }
            div.style.display = "none"
            document.body.style.overflow = ""
            document.body.style.paddingRight = ""
        })
        document.querySelector("#FSClear").addEventListener("click", _ => {
            const logs = document.querySelector("#logs")
            while (logs.firstChild) {
                logs.firstChild.remove()
            }

            for (const key in overlayLog) {
                delete overlayLog[key]
            }
            GM_setValue(channel + "debugWindow", "clear")
        })
        document.querySelector("#FSIframes").addEventListener("click", _ => {
            let srcs = []
            for (const i of document.querySelectorAll("iframe")) {
                i.src && srcs.push(i.src)
            }
            overlayLog.add(["iframes found:", srcs])
            GM_setValue(channel + "debugWindow", "iframes?")
        })
        document.querySelector("#FSConfig").addEventListener("click", _ => {
            overlayLog.add(["config running on top page:", JSON.stringify(config, null, 2)])
            GM_setValue(channel + "debugWindow", "config?")
        })
        document.querySelector("#FSQlist").addEventListener("click", _ => {
            overlayLog.add(["quality list on top page:", JSON.stringify(qualityList, [...qualityOptions, "unknown", "subs"], 2)])
            GM_setValue(channel + "debugWindow", "qlist?")
        })
    }();
}

function iframeWindow() {
    // ===setup communication channel===
    const controller = new AbortController()
    self.addEventListener("message", m => {
        if (typeof m === "object" && m.data.FS) {
            controller.abort()

            GM_deleteValue(channel)
            channel = m.data.FS
            verbose && v("updated channel on iframe to channel from top page -", channel)
            GM_setValue(channel, overlayLog) // in case something was logged before channel was updated

            verbose && v("set listeners for debugWindow requests on iframe")
            config.debugWindow && GM_addValueChangeListener(channel + "debugWindow", debugWindowRequestHandler)
        }
    }, {
        signal: controller.signal
    })
    self.top.postMessage({
        FS: "ping"
    }, "*")

    function debugWindowRequestHandler(name, oldValue, newValue, remote) {
        if (newValue === undefined) return // this just means it was deleted by another instance of the userscript
        if (newValue === "config?") {
            overlayLog.add(["config running on iframe page:", config])
            GM_setValue(channel, overlayLog)
            verbose && v("sent config to debugWindow")
        }
        if (newValue === "qlist?") {
            overlayLog.add(["quality list on iframe page:", JSON.stringify(qualityList, [...qualityOptions, "unknown", "subs"], 2)])
            GM_setValue(channel, overlayLog)
            verbose && v("sent qlist to debugWindow")
        }
        if (newValue === "clear") {
            verbose && v("received clear command from debugWindow")
            for (const key in overlayLog) {
                delete overlayLog[key]
            }
        }
        if (newValue === "iframes?") {
            let srcs = []
            for (const i of document.querySelectorAll("iframe")) {
                i.src && srcs.push(i.src)
            }
            overlayLog.add(["iframes found:", srcs])
            GM_setValue(channel, overlayLog)
            verbose && v("sent iframes to debugWindow")
        }
        GM_deleteValue(name)
    }
    // ===/setup communication channel===
    greet()
}

function greet() {
    flog("New instance!\ndetected:", qualityList)
    if (logConfig && config.debug) {
        flog("running with saved config!")
        // use console.table because it doesn't reorder config alfabetically
        console.table(config)
    }
    if (typeof GM_info === "object" && "injectInto" in GM_info && GM_info.injectInto !== "page") {
        const msg = "Violentmonkey injection into page failed, script won't function properly"
        log(
            "%cλ%c %s %s %c%s",
            "background-color: #023020; color: white; padding: 2px 10px; border-radius: 3px;",
            "",
            "FS on",
            location.href,
            "background-color: red; color: white; padding: 2px 10px; border-radius: 3px;",
            msg
        )
    }
}

function startIntent(url) {
    const utils = {
        genericHeaders: {
            user_agent: navigator.userAgent.replaceAll(";", "%3b"),
            // both urlencoded \ (%5c) and \\ work here for escaping
            accept_language: "Accept-Language: en-GB,en;q=0.5".replaceAll(",", "\\,").replaceAll(";", "%3b")
        },
        makeId(length) { // based on https://stackoverflow.com/a/1349426
            let result = ""
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
            const charactersLength = characters.length
            for (let i = 0; i < length; i++) {
                result += characters.charAt(Math.floor(Math.random() * charactersLength))
            }
            return result
        }
    }
    verbose && v("executing startIntent function with", url)
    // use torrent titles if available, some iframes use them
    if (/_|\.|\d{3,4}p|mkv|mp4/.test(document.title)) { // improve regex here [[[[[[[[[[[[[[[[[[[[[]]]]]]]]]]]]]]]]]]]]]
        verbose && v("using document.title")
        return launchIntent(document.title)
    }

    const now = new Date().getTime()

    function titleResponseHandler(name, oldValue, newValue, remote) {
        if (newValue === undefined) return // this just means it was deleted by another instance of the userscript
        if (newValue === "title?") return
        GM_removeValueChangeListener(titleResponseListener)
        verbose && v("title response received", name, oldValue, newValue, remote, "took", new Date().getTime() - now, "ms")
        launchIntent(newValue.betterTitle || newValue.topTitle)
    }
    const titleResponseListener = GM_addValueChangeListener(channel + "title", titleResponseHandler)
    GM_setValue(channel + "title", "title?")
    // do a timeout fallback here that starts intent with iframe title in case there's no response from titleResponseListener

    function launchIntent(title) {
        title = encodeURI(title) // title.replaceAll("%", "\%") // test with https://aniwave.to/watch/magical-star-kanon-100.lnlq/ep-1
        verbose && v("launching intent with title=", title)
        let intent = `intent:${url}#Intent;type=video/any;S.title=${title};`
        /* ===Header requirements===
         * kwik.cx needs referrer
         * mp4upload used to need referrer and disable certificate check, needs nothing after the new interface update? /// nvm
         * filemoon needs user agent
         * streamsb needs the exact user agend and accept language header the browser used
         * tenshi needs a random cookie
         *
         *
         * Most android players do not support headers passed as intent extras, or anything more than just the url and a title.
         * MXPlayer supports a lot of intent extras, but is not compatible with intent urls you can use in browsers,
         * You can't add a string array of headers to an intent url, as MXPlayer needs - https://mx.j2inter.com/api
         *
         * [[[ plug my mpv fork here i guess ]]]
         * ===/Header requirements=== */
        if ("kwik.cx" === location.hostname) {
            intent += "S.--referrer=https://kwik.cx/;"

        }
        if ("www.mp4upload.com" === location.hostname || "mp4upload.com" === location.hostname) {
            intent += "S.--referrer=mp4upload.com;"
            intent += "S.--tls-verify=no;"
        }
        if (["filemoon.sx", "kerapoxy.cc"].includes(location.hostname)) {
            intent += `S.--user-agent=${utils.genericHeaders.user_agent};`
        }
        if ("watchsb.com" === location.hostname) {
            intent += `S.--user-agent=${utils.genericHeaders.user_agent};`
            intent += `S.--http-header-fields=${utils.genericHeaders.accept_language};`
        }
        if ("marin.moe" === location.hostname) {
            intent += `S.--http-header-fields=Cookie: __ddg2_=${utils.makeId(16)};`
            // intent += `S.--http-header-fields=Cookie: __ddg2_=aTotallyLegitCookie;`
        }

        if (qualityList.subs.length !== 0) {
            qualityList.subs.length === 1 ? intent += `S.--sub-file=${qualityList.subs[0]};` : intent += `S.--sub-files=${qualityList.subs.join(":")};`
        }
        intent += "end"

        let a = document.querySelector("#FS-intentIframe")
        if (a === null) {
            a = document.createElement("iframe")
            a.style.display = "none"
            a.id = "FS-intentIframe"
            document.body.append(a)
            document.body.append(a)
        }
        flog(intent)
        a.contentWindow.location = intent

        verbose && v("intent should have successfully launched")
    }
}

function cornerButton(videoParent, video) {
    if (document.querySelector("#FS-cornerButton")) {
        flog("cornerButton already exists", document.querySelector("#FS-cornerButton"))
        return
    }
    const html = `
        <div id="FS-cornerButton">
            <div id="text">
                <span>^</span>
                open
                <span>^</span>
            </div>
        </div>
    `
    const css = `
        #FS-cornerButton {
            border-width: 50px;
            border-style: solid;
            border-color: red red transparent transparent;
            position: absolute;
            top: 0px;
            right: 0px;
            width: 0px;
            height: 0px;
            display: flex;
            justify-content: center;
            z-index: 9999;
            transition: transform 1s ease 0s;
        }
        #FS-cornerButton > #text {
            position: relative;
            rotate: 45deg;
            right: -25px;
            top: -25px;
            cursor: pointer;
            user-select: none !important;
            color: gold;
            font-size: 16px;
            display: flex;
            align-items: flex-start;
        }
        #FS-cornerButton > #text > span {
            color: orange;
            user-select: none !important;
        }
    `
    videoParent.insertAdjacentHTML("beforeend", html)
    document.head.appendChild(document.createElement("style")).innerText = css
    const div = document.querySelector("#FS-cornerButton")
    const text = document.querySelector("#FS-cornerButton > #text")

    div.addEventListener("click", e => {
        e.stopPropagation()
    }, true)
    div.addEventListener("dbclick", e => { // dunno how to prevent fullscreen on animepahe here [[[[[[[[[[[[[[[[[[]]]]]]]]]]]]]]]]]]
        e.stopPropagation()
        e.preventDefault()
    }, true)

    // ===hold function===
    /* this is me messing around with examples from:
     * https://www.kirupa.com/html5/press_and_hold.htm
     * https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame */
    const item = text
    const pressHoldEvent = new CustomEvent("pressHold")
    const pressHoldDuration = 750 // hold duration in miliseconds
    let timerID

    // Listening for the mouse and touch events
    item.addEventListener("mousedown", pressingDown, false);
    item.addEventListener("mouseup", notPressingDown, false);
    item.addEventListener("mouseleave", notPressingDown, false);

    item.addEventListener("touchstart", pressingDown, false);
    item.addEventListener("touchend", notPressingDown, false);

    // Listening for our custom pressHold event
    item.addEventListener("pressHold", doSomething, false);

    function pressingDown(e) {
        e.stopPropagation()
        e.preventDefault()
        // Start the timer
        requestAnimationFrame(step)

        text.children[0].style.rotate = "-15deg"
        text.children[1].style.rotate = "15deg"

        // console.log("Pressing!");
    }

    function notPressingDown(e) {
        e.stopPropagation()
        e.preventDefault()
        // Stop the timer
        cancelAnimationFrame(timerID);

        text.children[0].style.rotate = ""
        text.children[1].style.rotate = ""
        text.children[0].innerText = "^"
        text.children[1].innerText = "^"

        // console.log("Not pressing!", longPress, e);
        if (longPress === false) {
            e.type !== "mouseleave" && HTMLMediaElement.prototype.play("intent", video)
        }
        longPress = false
        start = undefined
    }

    let start
    let longPress = false

    function step(timestamp) {
        // console.log("Timer tick!")
        start ||= timestamp
        const elapsed = timestamp - start
        if (elapsed < pressHoldDuration) {
            timerID = requestAnimationFrame(step);
            const value = Math.max(Math.ceil(90 * elapsed / pressHoldDuration), 15)
            text.children[0].style.rotate = `-${value}deg`
            text.children[1].style.rotate = `${value}deg`
        } else {
            start = undefined
            text.children[0].innerText = "^^"
            text.children[1].innerText = "^^"
            // console.log("Press threshold reached!");
            longPress = true
            item.dispatchEvent(pressHoldEvent);
        }
    }

    function doSomething(e) {
        // flog("pressHold event fired!")
        askQuality(video)
    }
    // ===/hold function===
}

function askQuality(videoElement) {
    if (document.querySelector("#FS-askdiv") === null) {
        const html = `
            <div id="FS-askdiv">
                <button id="FS-close">
                    <div style="rotate: 90deg;">Close</div>
                </button>
                <button id="FS-toggle" style="display: none;">
                    <div>...in-browser playback</div>
                </button>
                <div id="FS-options"></div>
                <div id="FS-unknown"></div>
            </div>
        `
        const css = `
            #FS-askdiv {
                position: absolute;
                top: 0px;
                right: 0px;
                width: 100%;
                height: 100%;
                background-color: green;
                z-index: 99999;
                transition: transform 1s;
                transform: translateX(-110%);
                display: flex;
                justify-content: space-around;
            }
            #FS-askdiv.FS-show {
                transform: translateX(0%);
            }

            #FS-close {
                height: 100%;
                order: 2;
            }
            #FS-options, #FS-unknown {
                display: flex;
                justify-content: center;
                height: 100%;
                flex-grow: 1;
            }
            #FS-unknown:empty, #FS-options:empty {
                display: none;
            }

            #FS-toggle {
                display: flex;
                width: 12%;
            }
            #FS-toggle > div {
                writing-mode: vertical-lr;
                margin: auto;
            }

            #FS-options > button, #FS-unknown > button {
                align-self: center;
            }
        `
        document.head.appendChild(document.createElement("style")).innerText = css
        videoElement.parentElement.insertAdjacentHTML("beforeend", html)

        const askdiv = document.querySelector("#FS-askdiv")
        const x = document.querySelector("#FS-close")
        const toggle = document.querySelector("#FS-toggle")
        askdiv.addEventListener("click", e => {
            e.stopPropagation()
        })
        x.addEventListener("click", _ => {
            askdiv.className = ""
            setTimeout(_ => {
                document.querySelector("#FS-options").innerHTML = ""
                document.querySelector("#FS-unknown").innerHTML = ""
            }, 1000)
        })
        toggle.addEventListener("click", _ => {
            allowPlay === true ? allowPlay = false : allowPlay = true
            toggle.firstElementChild.innerText = allowPlay ? "Block in-browser playback" : "Allow in-browser playback"
        })

        if (config.blockVideoPlay === true) {
            toggle.style.display = ""
            toggle.firstElementChild.innerText = allowPlay ? "Block in-browser playback" : "Allow in-browser playback"
        }
    }
    // document.querySelector("#FS-askdiv").className = "show" // this doesn't apply css transition when adding the element
    setTimeout(_ => {
        document.querySelector("#FS-askdiv").className = "FS-show"

    })
    fillAskDiv()

    function fillAskDiv() {
        let target
        target = document.querySelector("#FS-options")
        for (const [prop, val] of Object.entries(qualityList)) {
            const btn = document.createElement("button")
            btn.innerText = prop
            btn.addEventListener("click", _ => startIntent(val))
            target.append(btn)
        }
        // also add unknown stuff
        target = document.querySelector("#FS-unknown")
        let count = 0
        for (const val of qualityList.unknown) {
            const btn = document.createElement("button")
            btn.innerText = "unknown" + count
            btn.addEventListener("click", _ => startIntent(val))
            target.append(btn)
            count++
        }
    }
}


if (android === false) {
    verbose && v("not on android, aborting execution")
    return
}

// don't run on these, they are empty but have the same location.href as the parent page
if (document.title === "Disqus Realtime Notification") return

noPrefs ? init() : prefs()
