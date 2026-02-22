// ==UserScript==
// @name        ChiakiMixPlay
// @namespace   https://github.com/pepeloni-away
// @author      pploni
// @run-at      document-start
// @insert-into page
// @version     2.1
// @description Adds some AniMixPlay features to Chiaki
// @grant       GM_xmlhttpRequest
// @match       https://chiaki.site/?/tools/watch_order/*
// ==/UserScript==

function keyboardFocusSearch() {
    document.addEventListener("keydown", function (event) {
        if (event.key === "/") {
            event.preventDefault()
            document.querySelector(".uk-input").focus()
        }
    })
}
keyboardFocusSearch()

function allowSearchResultMiddleClick() {
    function interceptSearchResult(proto, target, interceptor) {
        const ogTarget = proto[target]
        proto[target] = function a(child) {
            const isSearchResultPanel = this.parentElement === document.body
            return isSearchResultPanel ? ogTarget.call(this, interceptor(child)) : ogTarget.call(this, child)
        }
    }
    interceptSearchResult(HTMLUListElement.prototype, 'appendChild', modifyResult)

    function modifyResult(li) {
        const malId = li.firstChild.firstChild.style["background-image"].match(/(\d+).jpg/)[1]
        const overlay = document.createElement("a")

        overlay.href = "https://chiaki.site/?/tools/watch_order/id/" + malId

        overlay.append(li.firstChild.lastChild)
        li.firstChild.append(overlay)

        return li
    }
}
allowSearchResultMiddleClick()

function addExternalLinks() {
    self.addEventListener("load", pageLoaded)

    function pageLoaded() {
        const targets = document.querySelectorAll(".wo_meta")
        targets.forEach(addButtons)
        function addButtons(e) {
            const malId = e.parentElement.parentElement.dataset.id

            addAnimixButton(e, malId)
            addGrabButton(e, malId)
        }

        function addGrabButton(e, malId) {
            const btn = document.createElement("button")
            btn.innerText = "grab links"
            btn.style.cssText = "border: medium none; background: transparent; color: inherit; cursor: pointer; padding: 0px;"
            // btn.onclick = handleGrabButtonClick__animix(malId)
            btn.onclick = handleGrabButtonClick__kuroinu(malId)

            e.append(" | ", btn)

            function handleGrabButtonClick__animix(malId) {
                return function () {
                    this.style.display = "none"

                    const spinner = makeLoadingDots("display: inline; cursor: default;")
                    this.insertAdjacentElement("afterend", spinner)

                    GM_xmlhttpRequest({
                        url: `https://animixplay.to/assets/rec/${malId}.json`,
                        // responseType: "json",
                        onload: handleXhr.bind(this, spinner),
                    })

                    function handleXhr(spinner, responseObject) {
                        // console.log(responseObject)
                        if (responseObject.status !== 200) {
                            spinner.remove()

                            if (responseObject.status === 404) {
                                const gifRx = /(?<=")https:\/\/cdn.animixplay.to\/s\/404.gif(?=")/
                                const gifMatch = responseObject.responseText.match(gifRx)
                                const img = document.createElement("img")
                                // img.style.height = ".875rem"
                                img.style.height = "2rem"

                                if (gifMatch) {
                                    img.src = gifMatch[0]
                                    return this.parentElement.append(" ", img)
                                }
                            }
                            return this.parentElement.append(" rip")
                        }

                        const r = JSON.parse(responseObject.responseText)
                        const no = ["AniMixPlay", "Crunchyroll", "Vrv", "Funimation", "Hulu", "Netflix", "Hidive", "Marin"]

                        // [ '9anime', [ { url: 'https://....', title: 'anime title' } ] ]
                        const anchors = Object.entries(r)
                            .filter(o => !no.includes(o[0]))
                            .map(o => o[1].map(makeAnchor.bind(null, o[0])))
                            .flat()

                        function makeAnchor(name, urlObject) {
                            const a = document.createElement("a")
                            a.innerText = name
                            a.href = urlObject.url
                            return a
                        }

                        spinner.remove()
                        const separated = anchors.flatMap(e => [e, " | "]).slice(0, -1)
                        this.parentElement.append(...(separated.length > 0 ? separated : ["---"]))
                    }
                }
            }

            function handleGrabButtonClick__kuroinu(malId) {
                return function () {
                    this.style.display = "none"

                    const spinner = makeLoadingDots("display: inline; cursor: default;")
                    this.insertAdjacentElement("afterend", spinner)

                    GM_xmlhttpRequest({
                        url: 'https://kuroiru.co/backend/api',
                        method: 'POST',
                        data: `prompt=${malId}`,
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                        responseType: "json",
                        onload: handleXhr.bind(this, spinner),
                    })

                    function handleXhr(spinner, responseObject) {
                        if (responseObject.status !== 200) {
                            spinner.remove()
                            return this.parentElement.append(" rip")
                        }

                        // const links = responseObject.response.streams // they changed the api a bit
                        const links = Object.values(responseObject.response.streams).flat()
                        const no = ["AniMixPlay", "Crunchyroll", "Vrv", "Funimation", "Hulu", "Netflix", "Hidive"]

                        const anchors = links
                            .filter(a => !no.includes(a.site))
                            .map(fixEpisodePlacehoder)
                            .flatMap(makeAnchor)

                        function fixEpisodePlacehoder(linkObject) {
                            linkObject.links = linkObject.links.map(o => {
                                o.url = o.url.replace('{ep}', '1')
                                return o
                            })
                            return linkObject
                        }

                        function makeAnchor(linkObject) {
                            return linkObject.links.flatMap(o => {
                                const a = document.createElement('a')
                                a.innerText = linkObject.site
                                a.href = o.url
                                return a
                            })
                        }

                        spinner.remove()
                        const separated = anchors.flatMap(e => [e, " | "]).slice(0, -1)
                        this.parentElement.append(...(separated.length > 0 ? separated : ["---"]))
                    }
                }
            }
        }
        function addAnimixButton(e, malId) {
            const lastPic = [...e.querySelectorAll("span.uk-icon.uk-icon-image")].pop().parentElement
            lastPic.parentElement.insertBefore(makeAnimixButton(malId), lastPic.nextSibling)
            lastPic.parentElement.insertBefore(document.createTextNode(" "), lastPic.nextElementSibling)

            function makeAnimixButton(id) {
                const a = document.createElement("a")
                a.href = "https://animixplay.to/anime/" + id

                const span = document.createElement("span")
                span.className = "uk-icon uk-icon-image"
                span.style.backgroundImage = 'url("https://animixplay.to/icon.png")'

                a.append(span)
                return a
            }
        }
    }
}
addExternalLinks()

function addAnimeInfo() {
    self.addEventListener("load", pageLoaded)

    function pageLoaded() {
        const targets = document.querySelectorAll(".wo_avatar_big");
        targets.forEach((image) => (image.onclick = handleImageClick()));

        function handleImageClick() {
            let ranOnce = false
            let underPicDiv, detailsDiv

            return function (clickEvent) {
                if (ranOnce) {
                    return toggleVisibility()
                }

                const makeCenteredSpinner = _ => makeLoadingDots("text-align: center;")
                const synopsisSpinner = makeCenteredSpinner()
                const themesSpinner = makeCenteredSpinner()
                const detailsSpinner = makeCenteredSpinner()

                underPicDiv = document.createElement("div")
                const synopsisDiv = makeUnderPicButton()
                const themesDiv = makeUnderPicButton()
                detailsDiv = document.createElement("div")

                underPicDiv.append(synopsisDiv, themesDiv)
                clickEvent.target.parentElement.append(underPicDiv)
                clickEvent.target.parentElement.nextElementSibling.append(detailsDiv)
                synopsisDiv.append(synopsisSpinner)
                themesDiv.append(themesSpinner)
                detailsDiv.append(detailsSpinner)

                ranOnce = true

                const malId = clickEvent.target.parentElement.parentElement.dataset.id
                fillDetailsAndSynopsis(detailsDiv, synopsisDiv, detailsSpinner, synopsisSpinner, malId)
                fillThemes(themesDiv, themesSpinner, malId)

                function toggleVisibility() {
                    const a = underPicDiv.style.display === "" ? "none" : ""
                    underPicDiv.style.display = a
                    detailsDiv.style.display = a
                }

                function fillDetailsAndSynopsis(d, s, dSpinner, sSpinner, malId) {
                    GM_xmlhttpRequest({
                        url: `https://api.jikan.moe/v4/anime/${malId}/full`,
                        responseType: "json",
                        onload: handleXhr,
                    })

                    function handleXhr(responseObject) {
                        const r = responseObject.response.data

                        fillDetails(d, dSpinner, r)
                        fillSynopsis(s, sSpinner, r)

                        function fillDetails(e, spinner, data) {
                            const rating = ["Rating: ", data.rating, document.createElement("br")]
                            const generes = getGeneres(data)
                            const source = getSource(data)
                            const studio = getStudio(data)

                            spinner.remove()
                            e.append(...rating, ...generes, ...source, ...studio)

                            function getGeneres(dataObj) {
                                const g = [...dataObj.genres, ...dataObj.themes, ...dataObj.demographics]
                                return ["Generes: ", ...g.map(toAnchor).flatMap(addCommas), document.createElement("br")]
                            }
                            function getSource(dataObj) {
                                const adaptation = dataObj.relations.filter(e => e.relation === "Adaptation")
                                    .reduce((_, e) => e.entry[0].url, "")

                                const a = document.createElement("a")
                                a.innerText = dataObj.source
                                if (adaptation) {
                                    a.href = adaptation
                                }
                                return ["Source: ", a, document.createElement("br")]
                            }
                            function getStudio(dataObj) {
                                const s = dataObj.studios.map(toAnchor)
                                return ["Studios: ", ...s.flatMap(addCommas)]
                            }


                            function toAnchor(e) {
                                const a = document.createElement("a")
                                a.innerText = e.name
                                a.href = e.url
                                return a
                            }
                            function addCommas(item, index, array) {
                                return index < array.length - 1 ? [item, ', '] : [item]
                            }
                        }

                        function fillSynopsis(e, spinner, data) {
                            spinner.remove()
                            const modal = fillModal(makeModal())

                            e.innerText = "synopsis"
                            e.append(modal)
                            e.onclick = _ => modal.style.display = "flex"

                            function fillModal(modal) {
                                const content = data?.background ? data?.synopsis + "\n------------------\nBackground:\n" + data?.background : data?.synopsis
                                if (content) {
                                    modal.firstChild.firstChild.innerText = content
                                } else {
                                    const n = makeUnderPicButton()
                                    const s = document.createElement("s")
                                    s.innerText = "synopsis"
                                    n.append(s)
                                    e.outerHTML = n.outerHTML
                                }
                                return modal
                            }
                        }
                    }
                }

                function fillThemes(e, spinner, malId) {
                    GM_xmlhttpRequest({
                        // url: `https://animethemes.moe/_next/data/${buildId}/anime/${slug}.json`,
                        url: `https://api.animethemes.moe/anime?filter[has]=resources&filter[site]=MyAnimeList&filter[external_id]=${malId}&include=animethemes.animethemeentries.videos`,
                        responseType: "json",
                        onload: handleXhr,
                    })

                    function handleXhr(responseObject) {
                        spinner.remove()
                        const modal = fillModal(makeModal())

                        e.innerText = "themes"
                        e.append(modal)
                        e.onclick = _ => modal.style.display = "flex"
                        function fillModal(modal) {
                            const animeObject = responseObject.response.anime[0]
                            if (animeObject) {
                                modal.firstChild.firstChild.append(...makeThemeCards(animeObject))
                            } else {
                                const n = makeUnderPicButton()
                                const s = document.createElement("s")
                                s.innerText = "themes"
                                n.append(s)
                                e.outerHTML = n.outerHTML
                            }
                            return modal
                        }
                        function makeThemeCards(animeObject) {
                            const anchors = animeObject.animethemes.map(e => {
                                const a = document.createElement("a")
                                a.style.cssText = "text-decoration: none; margin-bottom: 10px; padding: 10px; border: 1px solid rgb(255, 255, 255); border-radius: 5px; display: inline-block;"
                                a.innerText = `${e.slug} - ${e.animethemeentries[0].videos[0].filename}`
                                a.href = e.animethemeentries[0].videos[0].link

                                a.onclick = e => {
                                    e.preventDefault()
                                    openVideo(e.target)
                                }

                                function openVideo(anchor) {
                                    const modal = makeModal()
                                    const video = document.createElement("video")
                                    video.controls = true
                                    video.style.maxHeight = "35rem"

                                    anchor.parentElement.append(modal)
                                    modal.firstChild.firstChild.append(video)
                                    modal.style.display = "flex"

                                    video.src = anchor.href

                                    modal.style.zIndex = 2
                                    self.addEventListener("click", e => e.target === modal && (modal.remove()))
                                }

                                return a
                            })
                            return anchors
                        }
                    }

                }

                function makeUnderPicButton(thing) {
                    const b = document.createElement("div")
                    if (thing) {
                        b.append(thing)
                    }
                    b.style.cssText = "display: table; margin: 20% auto; cursor: pointer;"
                    return b
                }

                function makeModal() {
                    const div1 = document.createElement("div")
                    const div2 = document.createElement("div")
                    const div3 = document.createElement("div")

                    div1.style.cssText = "display: none; position: fixed; top: 0px; left: 0px; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5);"
                        + " z-index: 1; align-items: center; justify-content: center;"
                    // div2.style.cssText = "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: rgb(255, 255, 255);"
                    div2.style.cssText = "background-color: rgb(255, 255, 255); max-width: 85%; text-align: center;"
                        + " padding: 20px; max-height: 80%; overflow-y: auto; min-height: 15%; min-width: 15%; background-color: #333; color: #fff;"

                    self.addEventListener("click", e => e.target === div1 && (div1.style.display = "none"))

                    div1.append(div2)
                    div2.append(div3)

                    return div1
                }
            }
        }
    }

}
addAnimeInfo()




function makeLoadingDots(cssText = "") {
    if (!makeLoadingDots.ranOnce) {
        addSpinnerCss()
    }

    // thanks to https://codepen.io/AnoNewb/pen/JwypRN
    const spinnerDiv = document.createElement('div')
    spinnerDiv.className = 'spinner'
    spinnerDiv.style.cssText = cssText

    const bounce1 = document.createElement('div')
    bounce1.className = 'bounce1'

    const bounce2 = document.createElement('div')
    bounce2.className = 'bounce2'

    const bounce3 = document.createElement('div')
    bounce3.className = 'bounce3'

    spinnerDiv.appendChild(bounce1)
    spinnerDiv.appendChild(bounce2)
    spinnerDiv.appendChild(bounce3)

    return spinnerDiv
}

function addSpinnerCss() {
    makeLoadingDots.ranOnce = true
    const css = `
      /*Huge thanks to @tobiasahlin at http://tobiasahlin.com/spinkit/ */
  .spinner {
   /* margin: 100px auto 0;
    width: 70px;
    text-align: center; */
  }

  .spinner > div {
    width: 18px;
    height: 18px;
    background-color: #333;

    border-radius: 100%;
    display: inline-block;
    -webkit-animation: sk-bouncedelay 1.4s infinite ease-in-out both;
    animation: sk-bouncedelay 1.4s infinite ease-in-out both;
  }

  .spinner .bounce1 {
    -webkit-animation-delay: -0.32s;
    animation-delay: -0.32s;
  }

  .spinner .bounce2 {
    -webkit-animation-delay: -0.16s;
    animation-delay: -0.16s;
  }

  @-webkit-keyframes sk-bouncedelay {
    0%, 80%, 100% { -webkit-transform: scale(0) }
    40% { -webkit-transform: scale(1.0) }
  }

  @keyframes sk-bouncedelay {
    0%, 80%, 100% {
      -webkit-transform: scale(0);
      transform: scale(0);
    } 40% {
      -webkit-transform: scale(1.0);
      transform: scale(1.0);
    }
  }
    `
    const styleElement = document.createElement('style')
    styleElement.type = 'text/css'
    styleElement.appendChild(document.createTextNode(css))
    document.head.appendChild(styleElement)
}
