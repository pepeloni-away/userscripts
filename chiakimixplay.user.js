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
        btn.style.cssText = "border: medium none; background: transparent; color: inherit; cursor: pointer; padding: 0px;"
        btn.onclick = function() {
            this.previousSibling.remove()
            this.style.display = "none"
            const xhr = GM_xmlhttpRequest({
                url: `https://animixplay.to/assets/rec/${malId}.json`,
                // they actually updated the api after the site shut down? --- nevermind, /search has newer links but doesn't work for every anime like the old one
                /*url: "https://animixplay.to/api/search",
                method: "POST",
                data: "recgen=" + malId,*/
                responseType: "json",
                onload: function(rsp) {
                    if (rsp.status !== 200) return e.append(" | rip")
                    for (let [provider, links] of Object.entries(rsp.responseXML)) {
                        links.forEach(obj => {
                            if (provider === "AniMixPlay") return // the streaming part of animix is dead
                            if (provider === "Crunchyroll") return
                            if (provider === "Vrv") return
                            if (provider === "Funimation") return
                            if (provider === "Hulu") return
                            if (provider === "Netflix") return
                            if (provider === "Hidive") return

                            if (provider === "Tenshi") {
                                // it's just the domain that changed, hashes are the same
                                provider = "Marin"
                                obj.url = obj.url.replace("tenshi", "marin")
                            }
                            if (provider === "Zoro") {
                                provider = "Aniwatch"
                                obj.url = obj.url.replace("zoro.to", "aniwatch.to")
                            }
                            if (provider === "9anime") {
                                provider = "Aniwave"
                                const temp = new URL(obj.url)
                                temp.hostname = "aniwave.to"
                                obj.url = temp.href
                            }

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
        const malId = i.parentElement.parentElement.getAttribute("data-id")
        const themes = document.createElement("div")
        const infoDiv = document.createElement("div")
        const synopsisDiv = document.createElement("div")
        const br = () => document.createElement("br")
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
                        // themes button, with api from themes.moe
                        themes.innerText = "themes"
                        themes.style.cssText = "display: table; margin: 20% auto; cursor: pointer;"
                        themes.onclick = function() {
                            if (themes.themes) {
                                showThemes(themes.themes)
                            } else {
                                console.log('requesting')
                                GM_xmlhttpRequest({
                                    // url: `https://themes.moe/api/themes/857/OP/mirrors`,
                                    url: "https://themes.moe/api/themes/" + malId,
                                    responseType: "json",
                                    onload: function(rsp) {
                                        themes.themes = rsp.responseXML
                                        showThemes(themes.themes)
                                    }
                                })
                            }
                            function showThemes(array) {
                                if (!document.querySelector(".thaames")) {
                                    const div = document.createElement("div")
                                    div.className = "thaames"
                                    div.style.cssText = "position: fixed; left: 0px; top: 0px; overflow: auto; background-color: rgba(0, 0, 0, 0.4); width: 100%; height: 100%;"
                                    document.body.append(div)

                                    self.addEventListener("click", function(e) {
                                        if (e.target === div) div.style.display = "none"
                                    })
                                    self.addEventListener("keydown", function(e) {
                                        if (e.key === "Escape") div.style.display = "none"
                                    })

                                    const text = document.createElement("div")
                                    text.className = "thaames_text"
                                    text.style.cssText = "margin: 15% auto; padding: 20px; border: 1px solid rgb(136, 136, 136); width: 80%; background-color: black;"
                                    div.append(text)
                                }
                                document.querySelector(".thaames").style.display = "block"
                                document.querySelector(".thaames").firstChild
                                    .innerHTML = array[0]["themes"].map(e => `<a href=${e.mirror.mirrorURL} style="padding: 7px;">${e.themeType} - ${e.themeName}</a>`).join("\n")

                            }
                        }

                        i.parentElement.nextElementSibling.append(infoDiv)
                        i.parentElement.append(synopsisDiv)
                        i.parentElement.append(themes)
                        infoDiv.style.display = ""
                    }
                })
            }
            infoDiv.style.display === "" ? infoDiv.style.display = "none" : infoDiv.style.display = ""
            synopsisDiv.style.display === "table" ? synopsisDiv.style.display = "none" : synopsisDiv.style.display = "table"
            themes.style.display === "table" ? themes.style.display = "none" : themes.style.display = "table"
        }
    }
})



