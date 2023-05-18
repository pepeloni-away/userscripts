// ==UserScript==
// @name        ChiakiMixPlay
// @namespace   https://github.com/pepeloni-away
// @author      pploni
// @run-at      document-start
// @insert-into page
// @version     1.0
// @description Adds some AniMixPlay features to Chiaki
// @grant       GM_xmlhttpRequest
// @match       https://chiaki.site/?/tools/watch_order/*
// ==/UserScript==

// middle click image in search results to open in new tab
HTMLDivElement.prototype.setAttribute = new Proxy(HTMLDivElement.prototype.setAttribute, {
    apply(target, thisArg, args) {
        if (args[0] === "class" && args[1] === "ac_image") {
            new MutationObserver(function(m, obs) {
                const malId = thisArg.getAttribute("style").match(/(\d+).jpg/)[1]
                const a = document.createElement("a")
                a.href = "https://chiaki.site/?/tools/watch_order/id/" + malId
                a.style.backgroundColor = "transparent"
                a.className = "ac_image"
                thisArg.append(a)
                obs.disconnect()
            }).observe(thisArg, { attributes: true, attributeFilter: [ "style" ] })
        }
        return Reflect.apply(...arguments)
    }
})

// add animix to the list of external sites
self.addEventListener("load", function() {
    for (const e of document.querySelectorAll(".uk-text-muted.uk-text-small")) {
        const malId = e.parentElement.parentElement.getAttribute("data-id")
        const a = document.createElement("a")
        a.href = "https://animixplay.to/anime/" + malId
        a.innerText = "animix"
        e.append("| ", a)
        // add a button to request streaming links from animix, the api still works
        const btn = document.createElement("button")
        btn.innerText = "grab links"
        btn.style.cssText = "border: medium none; background: transparent; color: inherit; cursor: pointer;"
        btn.onclick = function() {
            this.previousSibling.remove()
            this.style.display = "none"
            const xhr = GM_xmlhttpRequest({
                url: `https://animixplay.to/assets/rec/${malId}.json`,
                responseType: "json",
                onload: function(rsp) {
                    if (rsp.status !== 200) return e.append(" | rip")
                    for (const [provider, links] of Object.entries(rsp.responseXML)) {
                        links.forEach(obj => {
                            if (provider === "AniMixPlay") return // the streaming part of animix is dead
                            if (provider === "Crunchyroll") return
                            if (provider === "Vrv") return
                            if (provider === "Funimation") return
                            if (provider === "Hulu") return
                            if (provider === "Netflix") return
                            if (provider === "Hidive") return

                            const a = document.createElement("a")
                            a.innerText = provider
                            a.href = obj.url
                            e.append(" | ", a)
                        })
                    }
                }
            })
        }
        e.append(" | ", btn)
    }
})

// focus search field with "/" key
document.addEventListener("keydown", function(event) {
    if (event.key === "/") {
        event.preventDefault()
        document.querySelector(".uk-input").focus()
    }
})

// option to grab anime info, click on entry picture
self.addEventListener("load", function() {
    for (const i of document.querySelectorAll(".wo_avatar_big")) {
        const malId = i.parentElement.parentElement.getAttribute("data-id"),
              infoDiv = document.createElement("div"),
              synopsisDiv = document.createElement("div"),
              br = () => document.createElement("br")
        i.onclick = function() {
            if (i._info === undefined) {
                const xhr = GM_xmlhttpRequest({
                    url: `https://api.jikan.moe/v4/anime/${malId}/full`,
                    responseType: "json",
                    onload: function(rsp) {
                        if (rsp.status !== 200) return console.log("not good", rsp)
                        i._info = true
                        const json = JSON.parse(rsp.responseText)

                        // add items to infodiv here
                        infoDiv.append("Rating: ", json.data.rating, br())
                        {
                            infoDiv.append("Generes: ")
                            const generes = [...json.data.genres, ...json.data.themes, ...json.data.demographics]
                            let last = 0
                            for (const i of generes) {
                                const a = document.createElement("a")
                                last++
                                a.href = i.url
                                a.innerText = i.name
                                infoDiv.append(a)
                                if (last < generes.length) infoDiv.append(", ")
                            }
                        }
                        infoDiv.append(br())
                        {
                            const a = document.createElement("a")
                            a.innerText = json.data.source
                            a.href = json.data.relations.filter(e => e.relation === "Adaptation").map(e => e.entry[0].url)[0]
                            a.href === "https://chiaki.site/undefined" ? infoDiv.append("Source: ", json.data.source) : infoDiv.append("Source: ", a)
                        }
                        infoDiv.append(br())
                        {
                            infoDiv.append("Studios: ")
                            const studios = json.data.studios
                            let last = 0
                            for (const i of studios) {
                                const a = document.createElement("a")
                                last++
                                a.href = i.url
                                a.innerText = i.name
                                infoDiv.append(a)
                                if (last < studios.length) infoDiv.append(", ")
                            }
                        }

                        // synopsis button below anime image, cuz there's empty space there
                        synopsisDiv.append("synopsis")
                        synopsisDiv.style.cssText = "display: table; margin: 20% auto; cursor: pointer;"
                        synopsisDiv.onclick = function() {
                            if (!document.querySelector(".synopsis_modal")) {
                                const div = document.createElement("div")
                                div.className = "synopsis_modal"
                                div.style.cssText = "position: fixed; left: 0px; top: 0px; overflow: auto; background-color: rgba(0, 0, 0, 0.4); width: 100%; height: 100%;"
                                document.body.append(div)

                                self.addEventListener("click", function(e) {
                                    if (e.target === div) div.style.display = "none"
                                })
                                self.addEventListener("keydown", function(e) {
                                    if (e.key === "Escape") div.style.display = "none"
                                })

                                const text = document.createElement("div")
                                text.style.cssText = "margin: 15% auto; padding: 20px; border: 1px solid rgb(136, 136, 136); width: 80%; background-color: black;"
                                div.append(text)
                            }
                            document.querySelector(".synopsis_modal").style.display = "block"
                            document.querySelector(".synopsis_modal").firstChild.innerText = json.data.background
                                ? json.data.synopsis + "\n------------------\nBackground:\n" + json.data.background : json.data.synopsis

                        }

                        i.parentElement.nextElementSibling.append(infoDiv)
                        i.parentElement.append(synopsisDiv)
                        infoDiv.style.display = ""
                    }
                })
            }
            infoDiv.style.display === "" ? infoDiv.style.display = "none" : infoDiv.style.display = ""
            synopsisDiv.style.display === "table" ? synopsisDiv.style.display = "none" : synopsisDiv.style.display = "table"
        }
    }
})
