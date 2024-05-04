// ==UserScript==
// @name        themes.moe updater
// @namespace   https://github.com/pepeloni-away
// @author      pploni
// @run-at      document-start
// @insert-into page
// @version     1.0
// @description 5/3/2024, 7:21:59 PM
// @grant       GM_xmlhttpRequest
// @match       https://themes.moe/*
// ==/UserScript==

let cachedEmulatedResponse = {}
XMLHttpRequest.prototype.open = new Proxy(XMLHttpRequest.prototype.open, {
    apply(target, thisArg, args) {
        if (location.href !== 'https://themes.moe/' && args[0] === 'GET' && (args[1].startsWith('/api/mal/') || args[1].startsWith('/api/anilist/'))) {
            const name = args[1].replace(/.*\//, '')
            thisArg._ogsend = thisArg.send.bind(thisArg)
            thisArg.send = function() {
                // console.log('send', thisArg.ogsend, name)
                args[1].startsWith('/api/mal/') ? fetchMalList(name, thisArg) : fetchAnilistList(name, thisArg)
            }

            thisArg.addEventListener('readystatechange', function(e) {
                if (this.readyState === 4 && this._emulatedResponse) {
                    // console.log(this, this.response, this.responseText)
                    this._ogresponse = JSON.parse(this.response)

                    Object.defineProperty(this, 'response', {
                        writable: true
                    })
                    Object.defineProperty(this, 'responseText', {
                        writable: true
                    })
                    this.response = JSON.stringify(this._emulatedResponse)
                    this.responseText = JSON.stringify(this._emulatedResponse)
                }
            })
        }

        if (args[0] === 'GET' && args[1].startsWith('/api/themes/') && (location.href.includes('mal') || location.href.includes('anilist'))) {
            thisArg.addEventListener('readystatechange', function(e) {
                if (this.readyState === 4) {
                    const theme = args[1].match(/(?<=\/)[^\/]+(?=\/mirrors)/)[0]
                    const malID = args[1].match(/(?<=api\/themes\/)\d+/)[0]
                    const infoObj = cachedEmulatedResponse.find(m => m.malID === parseInt(malID))
                    const themeInfo = infoObj.themes.find(m => m.themeType === theme)

                    const ogresponse = JSON.parse(this.response)
                    ogresponse.themeType = themeInfo.themeType
                    ogresponse.themeName = themeInfo.themeName
                    ogresponse.mirrors.push(themeInfo.mirror)

                    Object.defineProperty(this, 'response', {
                        writable: true
                    })
                    Object.defineProperty(this, 'responseText', {
                        writable: true
                    })
                    this.responseText = JSON.stringify(ogresponse)
                    this.response = JSON.stringify(ogresponse)
                }
            })
        }
        return Reflect.apply(...arguments)
    }
})


function fetchMalList(name, xhr, fullResponse = [], nextUrl = '') {
    // https://myanimelist.net/apiconfig/references/api/v2#operation/users_user_id_animelist_get
    // https://github.com/SuperMarcus/myanimelist-api-specification
    const url = nextUrl || `https://api.myanimelist.net/v2/users/${name}/animelist?fields=list_status&nsfw=true&sort=anime_title&limit=300`
    const headers = {
        'X-MAL-Client-ID': '6114d00ca681b7701d1e15fe11a4987e'
    }

    GM_xmlhttpRequest({
        url: url,
        headers: headers,
        onload: function(r) {
            if (r.status !== 200) {
                console.log('fail', r)
                return
            }

            // console.log(r)
            const response = JSON.parse(r.responseText)
            fullResponse = [...fullResponse, ...response.data]
            if (response.paging.next) {
                fetchMalList(name, xhr, fullResponse, response.paging.next)
            } else {
                xhr._malData = fullResponse
                getAnimethemes({database: 'MyAnimeList', ids: fullResponse.map(i => i.node.id)}, xhr)
                // console.log(fullResponse)
            }
        }
    })
}

function fetchAnilistList(name, xhr, infoElement = null, userId = null) {
    if (!userId) return getUserId()

    infoElement && (infoElement.textContent = `Getting ids from anilist`)

    const status = 'Completed'
    fetch("https://graphql.anilist.co/", {
            "headers": {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            "body": `{\"query\":\"{MediaListCollection(userId: ${userId}, type: ANIME, forceSingleCompletedList: true) {lists {name status entries {mediaId status score(format: POINT_10)}}}}\",\"variables\":null,\"operationName\":null}`,
            "method": "POST",
        })
        .then(response => response.json())
        .then(data => {
            const fullList = data.data.MediaListCollection.lists.map(i => i.entries).flat()
            xhr._anilistData = fullList
            requestAnimationFrame(_ => getAnimethemes({
                database: 'AniList',
                ids: fullList.map(i => i.mediaId)
            }, xhr))
        // console.log(fullList)
        })
        .catch(error => {
            infoElement && (infoElement.textContent = `Failed to get anime ids from anilist`)
            console.log("Failed to get anime ids from anilist", error)
        })

    function getUserId() {
        fetch("https://graphql.anilist.co/", {
                "headers": {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                "body": `{\"query\":\"{User(name: \\\"${name}\\\") {id name}}\",\"variables\":null,\"operationName\":null}`,
                "method": "POST",
            })
            .then(response => response.json())
            .then(data => {
                if (data.data.User) {
                    userId = data.data.User.id
                    fetchAnilistList(name, xhr, infoElement, userId)
                } else {
                    infoElement && (infoElement.textContent = `Anilist user is private or doesn't exist`)
                    console.log(`Anilist user "${name}" is private or doesn't exist`, data)
                }
            })
            .catch(error => {
                infoElement && (infoElement.textContent = `Failed to get anilist user`)
                console.log("Failed to get anilist user", error)
            })
    }
}

function getAnimethemes(o, xhr) {
    const url1 = `https://api.animethemes.moe/anime?filter[has]=resources&filter[site]=${o.database}&filter[external_id]=`
    const url2 = `&include=animethemes.animethemeentries.videos,animethemes.song,resources&page[size]=100`
    const ratelimit = 80 // the rate limit is 90 requests per minute
    const minTimeBewteenRequestsInMs = 60 / ratelimit * 1000
    let fullResponse = []
    let lastDate

    function getResponse(url, moreToCome = false) {
        fetch(url)
            .then(response => response.json())
            .then(data => {
                fullResponse = [...fullResponse, ...data.anime]
                if (data.links.next) {
                    getResponse(data.links.next)
                } else {
                    if (moreToCome) return getResponseInChunks()

                    xhr._animethemesData = fullResponse
                    // simulateOriginalResponse(xhr)
                    requestAnimationFrame(_ => simulateOriginalResponse(xhr)) // don't catch future errors here
                    // console.log(fullResponse)
                }
            })
            .catch(error => {
                console.log("getanimethemes fetch error", error)
            })
    }
    o.ids.length > 600 ? getResponseInChunks() : getResponse(url1 + o.ids.join() + url2)

    function getResponseInChunks() {
        const ids = o.ids.splice(0, 100)
        const date = new Date()
        const send = _ => o.ids.length > 0 ? getResponse(url1 + ids + url2, true) : getResponse(url1 + ids + url2)
        if (lastDate && date.getTime() - lastDate.getTime() < minTimeBewteenRequestsInMs) {
            // from my tests this is not needed since 90 requests of this kind per miniute aren't possible with the average response time
            // but maybe i'm rate limited since i spammed the api while working on this project
            // console.log(date.getTime() - lastDate.getTime())
            setTimeout(send, minTimeBewteenRequestsInMs - (date.getTime() - lastDate.getTime()))
        } else {
            send()
        }
        lastDate = date
    }
}

function simulateOriginalResponse(xhr) {
    // console.log(xhr)
    const thing = xhr._animethemesData.flatMap(i => [{
        malID: i.resources[0].external_id,
        name: i.name,
        year: i.year,
        season: i.season.toLowerCase(),
        // themes: i.animethemes.flatMap(t => [{
        //     themeType: t.slug,
        //     themeName: t.song.title,
        //     mirror: {
        //         mirrorURL: t.animethemeentries[0].videos[0].link,
        //         priority: 3, // these 2 are useless?
        //         notes: ''
        //     }
        // }]),
        /*themes: i.animethemes.flatMap(a => Object.values(a.animethemeentries).flatMap((t) => [{
            themeType: a.slug,
            themeName: a.song.title,
            mirror: {
                mirrorURL: t.videos[0].link,
                priority: 3,
                notes: '',
        //         a: t
            }
        }])),*/
        /*themes: i.animethemes.flatMap(a => Object.values(a.animethemeentries).flatMap((t, tindex, tarray) => t.videos.flatMap((v, vindex, varray) => vindex > 1 ? [] : [{
            // themeType: a.slug,//array.length === 1 ? a.type : a.slug + ' V' + (index + 1),
            themeType: tarray.length === 1 ? a.type : a.slug + ' V' + (tindex + 1),
            themeName: a.song.title,
            mirror: {
                mirrorURL: v.link,
                priority: 3,
                notes: '',
        //         a: t
                bb: {
                    t: [tindex, tarray],
                    v: [vindex, varray]
                }
            }
        }]))),*/
        themes: i.animethemes.flatMap(a => Object.values(a.animethemeentries).flatMap((t, tindex, tarray) => t.videos.flatMap((v, vindex, varray) => [{
            // i don't understand the orignal naming scheme here
            themeType: `${a.slug} V${tindex + 1}.${vindex}`,
            themeName: a.song.title,
            mirror: {
                mirrorURL: v.link,
                priority: 3,
                notes: '',
        //         a: t
                // bb: {
                //     t: [tindex, tarray],
                //     v: [vindex, varray]
                // }
            }
        }]))),
        score: (function(){
            const e = (xhr._malData || xhr._anilistData).find(m => (m?.node?.id || m.mediaId) === i.resources[0].external_id)
            return e.list_status ? e.list_status.score : e.score
            }()),
        watchStatus: (function() {
            const malStatuses = {
                'completed': 2,
                'dropped': 4,
                'on_hold': 3,
                'watching': 1,
                'plan_to_watch': 6
            }
            const anilistStatuses = {
                'COMPLETED': 2,
                'DROPPED': 4,
                'PAUSED': 3,
                'CURRENT': 1,
                'PLANNING': 6
            }
            return xhr._malData ? malStatuses[xhr._malData.find(m => m.node.id === i.resources[0].external_id).list_status.status] :
                anilistStatuses[xhr._anilistData.find(m => m.mediaId === i.resources[0].external_id).status]
        }())
    }])
    xhr._emulatedResponse = thing
    cachedEmulatedResponse = thing
    xhr._ogsend()
    // console.log(thing)
}
