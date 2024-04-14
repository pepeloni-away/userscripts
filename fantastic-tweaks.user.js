// ==UserScript==
// @name        Fantastic Tweaks
// @namespace   https://github.com/pepeloni-away
// @author      pploni
// @run-at      document-start
// @insert-into page
// @version     1.1
// @description Tweaks for anime streaming sites
// @match       https://animixplay.to/*
// @match       https://disqus.com/embed/comments/*
//
// @match       https://aniwave.*/watch/*
// @match       https://vizcloud.*/e/*
// @match       https://vizcloud.*/embed/*
// @match       https://vidstream.*/e/*
// @match       https://vidstream.*/embed/*
// @match       https://vidplay.*/e/*
// @match       https://vidplay.*/embed/*
// @match       https://mcloud.to/e/*
// @match       https://mcloud.bz/e/*
// @match       https://filemoon.sx/e/*
// @match       https://www.mp4upload.com/embed*
// @match       https://mp4upload.com/embed*
//
// @match       https://aniwatch.to/watch/*
// @match       https://megacloud.tv/*
// @match       https://watchsb.com/e/*
// ==/UserScript==

const android = (_ => {
    try {
        return GM_info.platform.os === "android"
    } catch {
        return /android/i.test(navigator.userAgent)
    }
})() //|| true
function addStyle(strings, android = false) {
    const [css, mcss] = strings
    const a = document.createElement("style")
    a.innerText = android ? css + mcss : css
    document.documentElement.append(a)
}

function defuseSharedDetector1() {
    Object.defineProperty(Object.prototype, "_isOpen", {
        set(value) {
            // console.log(value, this, JSON.stringify(this), this.launch)
            this[Symbol.for("Fantastic Tweaks")] = value
            this.launch = function() {
                console.log("potato")
            }
        },
        get() {
            return this[Symbol.for("Fantastic Tweaks")]
        }
    })
}

! function animixplayTweaks() {
    if (location.hostname !== "animixplay.to") return
    /* rip animixplay 23 dec 2022*/
    Object.defineProperty(window, 'isPremium', {
        value: true
    })

    if (location.pathname.startsWith("/anime")) {
        addStyle`#infopanel {max-height: none !important} #expandbtn {display: none}`
    }
}();
! function disqusTweaks() {
    if (location.hostname !== "disqus.com") return

    // return focus to main window if Disqus is iframe, useful for keyboard navigation
    if (self.top !== self) {
        self.addEventListener("focus", () => {
            if (document.activeElement.nodeName !== "INPUT" && document.activeElement.className !== "textarea") {
                self.parent.focus()
            }
        })
    }

    addStyle `
    #form, #favorite-button, .tab-user, [data-action="flag"], #comment-policy, #badges-message__container, #reactions__container, #thread-share-bar,
    .highlighted-post, .reply, .bullet, .follow-user-container, .tooltip.tooltip--refresh, .parent-link-container {
        display: none !important;
    }

    [data-role="post-sort"] {
        margin: auto !important;
    }

    div.tooltip-outer.voters-outer.voters-outer--refresh, div.tooltip-outer.profile-card.profile-card--refresh, div.context-card.tooltip-outer {
        visibility: hidden
    }
    `
}();
! function aniwaveTweaks() {
    const official =
        location.hostname === "aniwave.to"
        || location.hostname === "aniwave.bz"
        || location.hostname === "aniwave.ws"
    if (!official) return

    addStyle `
        .brating, .dropdown.favourite, .w2g, .auto-skip, .skiptime, .ctrl.expand .auto-next {
            display: none !important;
        }
        .bmeta {
            gap: 20px;
        }
        #w-servers .tip div/*:last-child*/ + div {
            display: none !important;
        }
        ${android}
        .light {
            display: none !important;
        }
    `

    /* add @@||animixplay.to^$popup,domain=9anime.id to ublock if this button doesn't work */
    const animixBtn = document.createElement('a')
    animixBtn.className = "to-animix"
    // animixBtn.innerText = "to Animix"
    animixBtn.innerText = "Chiaki"
    animixBtn.title = "not set - this button relies on malsync, check if that is running"
    animixBtn.style.cssText = "border: medium none; background: transparent none repeat scroll 0% 0%; color: red; display: inline-block;"

    new MutationObserver(function(m, obs) {
        for (const el of m) {
            if (document.body) {
                obs.disconnect()
                if (!android) new MutationObserver(rmDisqusTitle).observe(document.body, {
                    childList: true,
                    subtree: true
                })
                if (android) new MutationObserver(nextPrev).observe(document.body, {
                    childList: true,
                    subtree: true
                })
                new MutationObserver(addAnimixBtn).observe(document.body, {
                    childList: true,
                    subtree: true
                })
                new MutationObserver(hideDub).observe(document.body, {
                    childList: true,
                    subtree: true
                })
                new MutationObserver(episodes).observe(document.body, {
                    childList: true,
                    subtree: true
                })
                new MutationObserver(malsyncWatcher).observe(document.body, {
                    childList: true,
                    subtree: true
                })
                break
            }
        }
    }).observe(document.documentElement, {
        childList: true
    })

    // disable Disqus tooltip when mouseover unfocused iframe
    function rmDisqusTitle(m, obs) {
        for (const el of m) {
            const disqusIframe = document.querySelector("iframe[title='Disqus']")
            if (!disqusIframe) return
            obs.disconnect()
            disqusIframe.onmouseover = function() {
                this.setAttribute("data-title", this.title);
                this.title = ""
            }
            disqusIframe.onmouseout = function() {
                this.setAttribute("title", this.getAttribute("data-title"))
            }
            // disqus iframe is reset when selecting different episodes
            new MutationObserver(function(m, obs) {
                for (const el of m) {
                    if (!(el.addedNodes[0] instanceof HTMLIFrameElement && el.addedNodes[0].title === "Disqus")) return
                    el.addedNodes[0].onmouseover = function() {
                        this.setAttribute("data-title", this.title);
                        this.title = ""
                    }
                    el.addedNodes[0].onmouseout = function() {
                        this.setAttribute("title", this.getAttribute("data-title"))
                    }
                }
            }).observe(disqusIframe.parentElement, {
                childList: true,
                subtree: true
            })
            break
        }
    }
    // move next/prev under other controls, so it's easier to press on mobile
    function nextPrev(m, obs) {
        for (const el of m) {
            if (!document.querySelector("#w-player")) return
            obs.disconnect()
            const b = (document.createElement("div"))
            b.id = "prevnextmobile"
            b.style.cssText = "display: flex; justify-content: space-around; text-align: center; min-height: 24px; align-items: center; margin: 5px;"
            document.querySelector('#w-player').insertBefore(b, document.querySelector('#w-servers'))
            for (const btn of [document.querySelector('.forward.prev'), document.querySelector('.forward.next')]) {
                b.appendChild(btn)
                btn.style.cssText = "cursor: pointer; flex-grow: 1;"
                // remove custom 9anime tooltips
                new MutationObserver(function(m, obs) {
                    for (const el of m) {
                        if (el.attributeName === "data-original-title") {
                            obs.disconnect()
                            btn.removeAttribute("data-original-title")
                        }
                    }
                }).observe(btn, {
                    attributes: true
                })
            }
            break
        }
    }

    function addAnimixBtn(m, obs) {
        for (const el of m) {
            if (!document.querySelector(".right")) return
            obs.disconnect()
            document.querySelector(".right").appendChild(animixBtn)
            break
        }
    }

    function malsyncWatcher(m, obs) {
        for (const el of m) {
            if (!document.querySelector("#malp")) return
            obs.disconnect()
            let malId = document.querySelector("[id=malRating]").href.match(/\/(\d+$)/)?. [1]
            const animix = "https://animixplay.to/anime/"
            const chiaki = "https://chiaki.site/?/tools/watch_order/id/"
            addStyle `.to-animix:hover { color: #aaa !important; }`
            animixBtn.style.color = "#777"
            animixBtn.removeAttribute("title")
            animixBtn.href = chiaki + malId
            new MutationObserver(function(m, obs) {
                for (const el of m) {
                    malId = document.querySelector("[id=malRating]").href.match(/\/(\d+$)/)?. [1]
                    animixBtn.href = chiaki + malId
                }
            }).observe(document.querySelector("[id=malRating]"), {
                attributes: true
            })
            break
        }
    }

    function hideDub(m, obs) {
        for (const el of m) {
            const both = document.querySelector("div[data-type='sub']") !== null && document.querySelector("div[data-type='dub']") !== null
            // if we dont have both by the time disqus iframe is added, dub likely isn't available so stop
            if (document.querySelector("iframe[src]")) obs.disconnect()
            if (!both) return
            obs.disconnect()

            let e
            if (android) {
                const mobileDubToggle = document.createElement("div")
                mobileDubToggle.style.cssText = "flex-grow: 0.3;"
                mobileDubToggle.className = "btn btn-sm btn-secondary"
                mobileDubToggle.id = "mobileDubToggle"
                document.querySelector('#prevnextmobile').insertBefore(mobileDubToggle, document.querySelector('.forward.next'))

                e = mobileDubToggle
                e.innerText = "sub only"
                e.onclick = function() {
                    if (document.querySelector("div[data-type='dub']").style.display === "none") {
                        document.querySelector("div[data-type='dub']").style.display = ""
                        this.innerText = "show all"
                    } else {
                        document.querySelector("div[data-type='dub']").style.display = "none"
                        this.innerText = "sub only"
                    }
                }
            } else {
                e = document.createElement("button")
                e.innerText = "+ dubs"
                e.className = "btn btn-sm btn-secondary"
                e.style.cssText = "margin-left: auto; float: right;"
                e.onclick = function() {
                    if (document.querySelector("div[data-type='dub']").style.display === "none") {
                        document.querySelector("div[data-type='dub']").style.display = ""
                        this.innerText = "- dubs"
                    } else {
                        document.querySelector("div[data-type='dub']").style.display = "none"
                        this.innerText = "+ dubs"
                    }
                }
                document.querySelector("div[data-type='sub']").append(e)
            }
            e.click()

            // #w-servers is reset when selecting different episodes
            new MutationObserver(function reapply(m, obs) {
                if (document.querySelector("div[data-type='sub']").contains(e)) return
                android ? document.querySelector('#prevnextmobile').insertBefore(e, document.querySelector('.forward.next')) : document.querySelector("div[data-type='sub']").append(e)
                e.click()
            }).observe(document.querySelector("#w-servers"), { childList: true, subtree: true })
            break
        }
    }

    /* bring back blocky compact title-less episodes everywhere
     *
     * 9anime still has them on longer series (FMAB, One Piece, etc)
     * for now they can be set anywhere by just changing a class from .name to .number and adding a bit of css */
    function episodes(m, obs) {
        for (const el of m) {
            if (!document.querySelector(".ep-range")) return
            obs.disconnect()
            addStyle `
                .episodes.number .ep-range li span {
                    display: none;
                }
                .episodes.number, #w-episodes .body {
                    max-height: none !important;
                }
                `
            const btn = document.createElement("div"),
                container = document.createElement("div")
            btn.innerText = "titIes"
            btn.className = "btn btn-sm btn-secondary"
            btn.onclick = function() {
                const name = document.querySelectorAll(".episodes.name"),
                    nr = document.querySelectorAll(".episodes.number")
                if (name)
                    for (const i of name) i.className = "episodes number"
                if (nr)
                    for (const i of nr) i.className = "episodes name"
            }
            container.style.cssText = "float: right; margin-left: auto; padding-left: 5px;"
            container.append(btn)
            document.querySelector("#w-episodes .head").append(container)
            if (document.querySelector(".episodes.name")) btn.click()
            break
        }
    }

    // ====================== anti antidebugger section ============================

    // self.addEventListener("beforeunload", function() {
    //     debugger
    // })

    // this is a more general fallback, for when they change the antidebugger again
   /* console.log = new Proxy(console.log, {
        apply(target, thisArg, args) {
            if (args.length === 1 && args[0].toString) {
                // args[0] = 'nope'
                args[0].toString = Function.toString
            }
            return Reflect.apply(...arguments)
        }
    })
    console.table = function() {}

    Object.defineProperty(unsafeWindow.Function, "toString", {
        value: Function.toString
    })*/


    Object.defineProperty(Object.prototype, "detectors", {
        set(v) {
            // console.log('set', v)
            this.lel = v
        },
        get() {
            this.ignore = _ => true // this is enough if you open devtools first and then go to the url
            this.ondevtoolopen = _ => {/*console.log('hej')*/} // this runs once when you first open devtool even with ignore on.
            // console.log('get', this)
            return this.lel
        }
    })

    self.addEventListener("keydown", (event) => {
        const videoIframe = document.querySelector("iframe[allow]")
        if (!videoIframe) return
        const msg = (data, origin) => videoIframe.contentWindow.postMessage(data, origin)
        if (event.target.nodeName !== "INPUT") {
            if (event.key === "k") msg("FT-kpause", "*")
            if (event.key === " ") msg("FT- pause", "*")
            if (event.key === "f") {
                videoIframe.parentElement.scrollIntoView({
                    behavior: "smooth"
                })
                videoIframe.contentWindow.focus()
            }
        }
    })
}();
! function vidstreamTweaks() {
    if (!RegExp("https://(vizcloud|vidstream|vidplay).*/e(mbed)?/").test(location.href)) return

    addStyle `
        .jw-button-container {
            padding-bottom: 0px !important;
        }
        .jw-skip, .jw-slider-skip, div[button=vidsrc] {
            display: none !important
        }
    `
    // move progressbar back together with other controls, below subtitles
    new MutationObserver(function(m, obs) {
        for (const el of m) {
            if (el.addedNodes[0] && el.addedNodes[0].className === "jw-preview jw-reset") {
                obs.disconnect()
                const controlbar = document.querySelector('.jw-button-container')
                controlbar.insertBefore(document.querySelector('.jw-slider-time'), controlbar.children[12])
            }
        }
    }).observe(document, {
        childList: true,
        subtree: true
    })

//     self.setInterval = new Proxy(self.setInterval, {
//         apply: function(target, thisArg, args) {
//             let fn, delay, extras
//             try {
//                 fn = String(args[0])
//                 delay = args[1]
//                 extras = args.slice(2)

//                 // calls debugger every run
//                 if (delay === 4000) {
//                     // console.debug(fn)
//                     return
//                 }

//                 // console.debug('interval on ' + location.href, `\nsetInterval(${fn}, ${delay}`, extras.join(', '), ')')
//             } catch (err) {
//                 console.debug(err)
//             }
//             return target.apply(thisArg, args)
//         }
//     })

    // pause with k and youtube-like frame by frame shortcuts
    self.addEventListener("keydown", (event) => {
        // press Esc to return to top window
        if (event.key === "Escape") parent.focus()
        const vid = document.querySelector("video");
        if (!vid) return
        if (event.key === "k") vid.paused ? vid.play() : vid.pause()
        if (event.key === ".") vid.currentTime += 1 / 24
        if (event.key === ",") vid.currentTime -= 1 / 24
    })
    self.addEventListener("message", (event) => {
        const vid = document.querySelector("video");
        if (!vid) return
        if (event.data === "FT-kpause" || event.data === "FT- pause") vid.paused ? vid.play() : vid.pause()
    })
}();
! function mcloudTweaks() {
    if (location.hostname !== "mcloud.to" && location.hostname !== "mcloud.bz") return

    addStyle `
        .jw-button-container {
            padding-bottom: 0px !important;
        }
        .jw-skip, .jw-slider-skip {
            display: none !important
        }
    `
    // move progressbar back together with other controls, below subtitles
    new MutationObserver(function(m, obs) {
        for (const el of m) {
            if (el.addedNodes[0] && el.addedNodes[0].className === "jw-preview jw-reset") {
                obs.disconnect()
                const controlbar = document.querySelector('.jw-button-container')
                controlbar.insertBefore(document.querySelector('.jw-slider-time'), controlbar.children[12])
            }
        }
    }).observe(document, {
        childList: true,
        subtree: true
    })

//     self.setInterval = new Proxy(self.setInterval, {
//         apply: function(target, thisArg, args) {
//             let fn, delay, extras
//             try {
//                 fn = String(args[0])
//                 delay = args[1]
//                 extras = args.slice(2)

//                 // calls debugger every run
//                 if (delay === 4000) {
//                     // console.debug(fn)
//                     return
//                 }

//                 // console.debug('interval on ' + location.href, `\nsetInterval(${fn}, ${delay}`, extras.join(', '), ')')
//             } catch (err) {
//                 console.debug(err)
//             }
//             return target.apply(thisArg, args)
//         }
//     })

    // pause with k and youtube-like frame by frame shortcuts
    self.addEventListener("keydown", (event) => {
        // press Esc to return to top window
        if (event.key === "Escape") parent.focus()
        const vid = document.querySelector("video");
        if (!vid) return
        if (event.key === "k") vid.paused ? vid.play() : vid.pause()
        if (event.key === ".") vid.currentTime += 1 / 24
        if (event.key === ",") vid.currentTime -= 1 / 24
    })
    self.addEventListener("message", (event) => {
        const vid = document.querySelector("video");
        if (!vid) return
        if (event.data === "FT-kpause" || event.data === "FT- pause") vid.paused ? vid.play() : vid.pause()
    })
}();
! function filemoonTweaks() {
    if (location.hostname !== "filemoon.sx") return

    addStyle `
        .jw-button-container {
            padding-bottom: 0px !important;
        }
        .jw-skip {
            display: none !important
        }
        `
    // move progressbar back together with other controls, below subtitles
    new MutationObserver(function(m, obs) {
        for (const el of m) {
            if (el.addedNodes[0] && el.addedNodes[0].className === "jw-preview jw-reset") {
                obs.disconnect()
                const controlbar = document.querySelector('.jw-button-container')
                controlbar.insertBefore(document.querySelector('.jw-slider-time'), controlbar.children[13])
            }
        }
    }).observe(document, {
        childList: true,
        subtree: true
    })

    // pause with k and youtube-like frame by frame shortcuts
    self.addEventListener("keydown", (event) => {
        // press Esc to return to top window
        if (event.key === "Escape") parent.focus()
        const vid = document.querySelector("video");
        if (!vid) return
        if (event.key === "k") vid.paused ? vid.play() : vid.pause()
        if (event.key === ".") vid.currentTime += 1 / 24
        if (event.key === ",") vid.currentTime -= 1 / 24
    })
    self.addEventListener("message", (event) => {
        const vid = document.querySelector("video");
        if (!vid) return
        if (event.data === "FT-kpause" || event.data === "FT- pause") vid.paused ? vid.play() : vid.pause()
    })
}();
! function mp4uploadTweaks() {
    const domains = [
        'www.mp4upload.com',
        'mp4upload.com',
    ]
    // if (location.hostname !== "www.mp4upload.com") return
    if (!domains.includes(location.hostname)) return
    // mp4upload does something strange with window focus, somehow focusing itself sometimes, when scrolling comments or when on a completely different tab.

    addStyle `
        .vjs-logo {
            display: none !important
        }
        body:not(.no-touch) {
            color: red; font-size: xx-large;
        }

        div#player {
            overflow: hidden;
        }
        `
    self.EventTarget.prototype.addEventListener = new Proxy(self.EventTarget.prototype.addEventListener, {
        apply: function(target, thisArg, args) {
            let type, handler, extras
            try {
                type = String(args[0])
                handler = String(args[1])
                extras = args[2]
                // disable the event listener that turns scrolling into volume control; works in ff, doesn't seem to be enough in chrome
                if (type === "mousewheel" || type === "DOMMouseScroll") return
                // this is set on a bunch of elements, removing it doesn't seem to break anything and makes arrowkey rewind/forward the usual 5sec
                // if (type === "keydown") {
                //     const no = "function(e,t){if(!o.disabled){e=ue(e);var i=o.handlers[e.type];if(i)for(var n=i.slice(0),r=0,s=n.length;" +
                //         "r<s&&!e.isImmediatePropagationStopped();r++)try{n[r].call(a,e,t)}catch(e){p.error(e)}}}"
                //     if (handler === no) return
                // }
                // console.debug("listener on " + location.href, thisArg, `.addEventListener("${type}", ${handler},`, extras || " ", ')')
            } catch (e) {
                console.debug(e)
            }
            return target.apply(thisArg, args)
        }
    })
    // pause with k and youtube-like frame by frame shortcuts
    self.addEventListener("keydown", (event) => {
        // press Esc to return to top window
        if (event.key === "Escape") parent.focus()
        const vid = document.querySelector("video");
        if (!vid) return
        if (event.key === "k") vid.paused ? vid.play() : vid.pause()
        if (event.key === ".") vid.currentTime += 1 / 24
        if (event.key === ",") vid.currentTime -= 1 / 24
    })
    self.addEventListener("message", (event) => {
        const vid = document.querySelector("video");
        if (!vid) return
        if (event.data === "FT-kpause" || event.data === "FT- pause") vid.paused ? vid.play() : vid.pause()
    })
}();
! function aniwatchTweaks() {
    if (location.hostname !== "aniwatch.to") return

    defuseSharedDetector1()
}();
! function megacloudTweaks() {
    if (location.hostname !== "megacloud.tv") return

    defuseSharedDetector1()
}();
! function watchsbTweaks() {
    if (location.hostname !== "watchsb.com") return

    Object.defineProperty(self, "minimalUserResponseInMiliseconds", {
        set(value) {
            throw new Error("potato") // error here to crash the inline script that calls debugger and reloads page
            // it still gets to fire once sometimes, just press continue
            this[Symbol.for("Fantastic Tweaks")] = value
        },
        get() {
            this[Symbol.for("Fantastic Tweaks")]
        }
    })

}();
