// ==UserScript==
// @name        Youtube Iframe Fullscreen Everywhere
// @namespace   https://github.com/pepeloni-away
// @author      pploni
// @run-at      document-start
// @insert-into page
// @version     1.1
// @description Allow fullscreen for youtube iframes embedded on any page
// @grant       none
// @match       *://*/*
// ==/UserScript==

const urls = [ // based on https://github.com/mwisnicki/userscripts/blob/master/allowfullscreen-youtube-embed.user.js
  "https://www.youtube.com/embed/",
  "https://youtube.com/embed/",
  "https://www.youtube-nocookie.com/embed/"
].join("|"),
      allowFullscreen = (iframe) => iframe.setAttribute("allowFullscreen", "")

Object.defineProperty(HTMLIFrameElement.prototype, "src", {
    set: new Proxy(Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, "src").set, {
        apply(target, thisArg, args) {
            // console.log("set iframe src to:", ...arguments)
            if (RegExp(urls).test(args[0])) allowFullscreen(thisArg)
            return target.apply(thisArg, args)
        }
    }),
    get: Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, "src").get,
    configurable: true
})
HTMLIFrameElement.prototype.setAttribute = new Proxy(HTMLIFrameElement.prototype.setAttribute, {
    apply(target, thisArg, args) {
        if (args[0] === "src") {
            // console.log("set iframe src attribute to:", ...arguments)
            if (RegExp(urls).test(args[1])) allowFullscreen(thisArg)
        }
        return target.apply(thisArg, args)
    }
})

// for iframes that are already part of page html
const interval = setInterval(_ => {
    const a = [...document.querySelectorAll("iframe")].filter(e => e.getAttribute("allowFullscreen") !== "" && RegExp(urls).test(e.src))
    console.log(a)
    for (const i of a) {
        allowFullscreen(i)
        i.src = i.src
    }
}, 1e3)
setTimeout(_ => {
    clearInterval(interval)
}, 5e3)
