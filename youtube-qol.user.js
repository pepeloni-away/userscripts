// ==UserScript==
// @name        Youtube QoL
// @namespace   https://github.com/pepeloni-away
// @author      pploni
// @run-at      document-start
// @insert-into page
// @version     1.6
// @description 2/26/2023, 5:22:33 PM
// @grant       none
// @match       https://www.youtube.com/*
// ==/UserScript==

(function redirectShorts() {
    function code() {
        if (!location.pathname.startsWith("/shorts")) return;
        let vidID = location.pathname.split("/")[2];
        window.location.replace(`https://www.youtube.com/watch?v=${vidID}`);
    }
    code();
    window.addEventListener("yt-navigate-finish", code, true);

    // turn shorts hrefs into normal videos. yt still opens them as shorts unless you open them in new tabs
    HTMLAnchorElement.prototype.setAttribute = new Proxy(
        HTMLAnchorElement.prototype.setAttribute,
        {
            apply(target, thisArg, args) {
                if (args[0] === "href" && args[1].startsWith('/shorts')) {
                    const id = args[1].split('/')[2]
                    args[1] = '/watch?v=' + id
                    // console.log('unshorted', thisArg)
                    // could also use this to hide every short
                }
                return Reflect.apply(...arguments);
            },
        }
    );
})();

(function removeTimeParmOnPlay() {
    HTMLMediaElement.prototype.play = new Proxy(HTMLMediaElement.prototype.play, {
        apply(target, thisArg, args) {
            if (location.href.includes("&t"))
                history.pushState("", "", location.href.replace(/&t=\d+s/, ""));
            return Reflect.apply(...arguments);
        },
    });
})();

(function playlistFreeUrls() {
    /* .href is used to set the url for channels */
    // Object.defineProperty(HTMLAnchorElement.prototype, "href", {
    //     set: new Proxy(Object.getOwnPropertyDescriptor(HTMLAnchorElement.prototype, "href").set, {
    //         apply(target, thisArg, args) {
    //             // console.log(...arguments)
    //             return Reflect.apply(...arguments)
    //         }
    //     })
    // })

    /* setAttribute is used to set url for videos */
    HTMLAnchorElement.prototype.setAttribute = new Proxy(
        HTMLAnchorElement.prototype.setAttribute,
        {
            apply(target, thisArg, args) {
                if (args[0] === "href")
                    if (args[1].replace) {
                        args[1] = args[1].replace(/&list=[a-zA-Z0-9_-]+&index=[0-9]+/, "");
                        args[1] = args[1].replace(/&pp=\w+/, "");
                    }
                return Reflect.apply(...arguments);
            },
        }
    );
})();

(function watchLaterTweaks() {
    // close sidebar
    HTMLButtonElement.prototype.setAttribute = new Proxy(
        HTMLButtonElement.prototype.setAttribute,
        {
            apply(target, thisArg, args) {
                if (
                    location.href === "https://www.youtube.com/playlist?list=WL" &&
                    args[0] === "aria-pressed" &&
                    thisArg.closedOnce !== true
                ) {
                    thisArg.closedOnce = true;
                    thisArg.click();
                }
                return Reflect.apply(...arguments);
            },
        }
    );
    // add a shortcut to "Remove from Watch Later"
    document.createElement = new Proxy(document.createElement, {
        apply(target, thisArg, args) {
            if (
                args[0] === "ytd-playlist-video-renderer" &&
                location.href === "https://www.youtube.com/playlist?list=WL"
            ) {
                const result = Reflect.apply(...arguments);
                new MutationObserver(function (m, obs) {
                    // console.log(m) // triggers once
                    obs.disconnect();
                    // can also use .lastElementChild to get menu, is that faster?
                    const a = document.createElement("style");
                    a.id = "centerRmBtn";
                    a.innerText =
                        ".rmbtn:hover { fill: white; } .rmbtn { fill: transparent }";
                    if (!document.querySelector("style#centerRmBtn"))
                        document.head.appendChild(a);
                    const ref = result.querySelector("[id=menu] yt-icon-button");
                    ref.parentElement.style.display = "flex";
                    if (result.hasRmBtn) return; // don't add more buttons when playlist refreshes (every 100 vids)
                    ref.insertAdjacentHTML(
                        "beforebegin",
                        '<button class="rmbtn" style="width: 40px; height: 40px;background: transparent;border: 0px;cursor: pointer;">\
  <svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false" style="pointer-events: none; display: block; width: 75%;height: 75%;margin: auto;"\
  class="style-scope yt-icon"><g class="style-scope yt-icon" style=""><path d="M11,17H9V8h2V17z M15,8h-2v9h2V8z M19,4v1h-1v16H6V5H5V4h4V3h6v1H19z M17,5H7v15h10V5z"\
  class="style-scope yt-icon" style=""></path></g></svg></button>'
                    );
                    ref.parentElement.querySelector(".rmbtn").onclick = function () {
                        // console.log('click')
                        this.nextSibling.click()
                        // need a bit of delay after the click
                        requestAnimationFrame(_ => {
                            let ytRmBtn = [
                                ...document.querySelectorAll("yt-formatted-string"),
                            ].find(e => e.innerText === 'Remove from Watch later')
                            // console.log(ytRmBtn)
                            ytRmBtn ? ytRmBtn.click() : console.log('ytrmbtn doko?')
                        })

                        // yt doesn't recreate the popup menu every time we press the option button anymore
                        /* new MutationObserver(function (m, obs) {
                            // console.log(m)
                            const ytRmBtn = [
                                ...document.querySelectorAll("yt-formatted-string"),
                            ].filter((e) => e.innerText === "Remove from Watch later")[0];
                            if (!ytRmBtn) return; // ytRmBtn is not yet part of dom the first time this runs; will be added next mutation
                            obs.disconnect();
                            // document.querySelector("tp-yt-iron-dropdown.style-scope.ytd-popup-container").style.visibility = "hidden"
                            if (ytRmBtn) {
                                ytRmBtn.click();
                            } else {
                                console.log("failed to identify remove from playlist button");
                            }
                            // document.querySelector("tp-yt-iron-dropdown.style-scope.ytd-popup-container").style.visibility = ""
                        }).observe(document, { childList: true, subtree: true });
                        this.nextSibling.click(); */
                    };
                    result.hasRmBtn = true;
                }).observe(result, { childList: true });
                return result;
            }
            return Reflect.apply(...arguments);
        },
    });
})();

/* like https://greasyfork.org/en/scripts/29422-disable-youtube-channel-user-home-page-video-autoplay but with support for youtube's navigation */
(function noChannelPageAutoplay() {
    HTMLMediaElement.prototype.play = new Proxy(HTMLMediaElement.prototype.play, {
        apply(target, thisArg, args) {
            if (
                /https:\/\/www\.youtube\.com\/(channel|c|user|u|@\w+)/.test(
                    location.href
                ) &&
                !thisArg.blockedOnce
            ) {
                document.addEventListener(
                    "yt-navigate-start",
                    () => {
              /*console.log('cleared');*/ thisArg.blockedOnce = undefined;
                    },
                    { capture: true, once: true }
                );
                throw (thisArg.blockedOnce = true);
            }
            return Reflect.apply(...arguments);
        },
    });
})();

/* the save button should never be pushed to the overflow menu by the new ocasional purpose buttons they keep adding */
(function shitButtons() {
const descriptor = Object.getOwnPropertyDescriptor(Object.prototype, "response") ?? {
    get() {
        return this._set
    },
    set(value) {
        // console.log(this, 'this')
        this._set = value
    }
}

Object.defineProperty(Object.prototype, "response", {
    get: descriptor.get,
    set: new Proxy(descriptor.set, {
        apply(target, thisArg, args) {
            label: if (args[0] != null && typeof args[0] === "object"){
                // console.log(arguments)
                try {
                    const {
                        items,
                        flexibleItems
                    } = args[0].rawResponse.response.contents.twoColumnWatchNextResults.results.results.contents[0].videoPrimaryInfoRenderer.videoActions.menuRenderer
                    // console.log('items', items, 'flexibleitems', flexibleItems)
                    if (JSON.stringify([items, flexibleItems]).includes("PLAYLIST_ADD")) {
                        // console.log('we have add to playlist option')
                        if (JSON.stringify(items).includes("PLAYLIST_ADD")) {
                            // console.log('add to playlist in in the popup menu')
                            const playlist_add_button_index = items.findIndex(i => JSON.stringify(i).includes('PLAYLIST_ADD'))
                            const playlist_add_button_menuItem = items.splice(playlist_add_button_index, 1)[0]

                            const trackingParams = playlist_add_button_menuItem.menuServiceItemRenderer.trackingParams
                            const clickTrackingParams = playlist_add_button_menuItem.menuServiceItemRenderer.serviceEndpoint.clickTrackingParams
                            const uiType = playlist_add_button_menuItem.menuServiceItemRenderer.serviceEndpoint.commandMetadata.interactionLoggingCommandMetadata.screenVisualElement.uiType
                            const parms = playlist_add_button_menuItem.menuServiceItemRenderer.serviceEndpoint.showSheetCommand.panelLoadingStrategy.requestTemplate.params
                            // console.log(playlist_add_button_menuItem, trackingParams, clickTrackingParams, uiType)
                            const playlist_add_button_topLevelButton_template = `{"buttonViewModel":{"iconName":"PLAYLIST_ADD","title":"Save","onTap":{"serialCommand":{"commands":[{"logGestureCommand":{"gestureType":"GESTURE_EVENT_TYPE_LOG_GENERIC_CLICK","trackingParams":"${trackingParams}"}},{"innertubeCommand":{"clickTrackingParams":"${clickTrackingParams}","commandMetadata":{"interactionLoggingCommandMetadata":{"screenVisualElement":{"uiType":${uiType}}}},"showSheetCommand":{"panelLoadingStrategy":{"requestTemplate":{"panelId":"PAadd_to_playlist","params":"${parms}"},"screenVe":${uiType}},"contextualSheetPresentationConfig":{"expandToFullWidth":true}}}}]}},"accessibilityText":"Save to playlist","style":"BUTTON_VIEW_MODEL_STYLE_MONO","trackingParams":"${trackingParams}","isFullWidth":false,"type":"BUTTON_VIEW_MODEL_TYPE_TONAL","buttonSize":"BUTTON_VIEW_MODEL_SIZE_DEFAULT","tooltip":"Save"}}`
                            const playlist_add_button_flexibleItem = {
                                menuFlexibleItemRenderer: {
                                    menuItem: playlist_add_button_menuItem,
                                    topLevelButton: JSON.parse(playlist_add_button_topLevelButton_template)
                                }
                            }
                            playlist_add_button_flexibleItem.menuFlexibleItemRenderer.topLevelButton.buttonViewModel.title = "Säve"
                            const first_flexible_button_not_download_index = flexibleItems.findIndex(i => i.menuFlexibleItemRenderer.topLevelButton.downloadButtonRenderer === undefined)
                            const first_flexible_button_not_download = flexibleItems.splice(first_flexible_button_not_download_index, 1)[0]
                            flexibleItems.splice(0, 0, playlist_add_button_flexibleItem)
                            // console.log('moved add to playlist to top level buttons')
                            items.splice(0, 0, first_flexible_button_not_download.menuFlexibleItemRenderer.menuItem)
                            // console.log('moved original first top level button to pupup menu')

                        }
                    }
                }
                catch(e) {
                    console.log('failed', e)
                    break label
                }
            }
            return Reflect.apply(...arguments)
        }
    }),
    configurable: true,
})
// another option would be to make a fake top level save button that opens the popup and clicks the real one on click
})();

(function betterDvr() {
    let done = false
    HTMLMediaElement.prototype.play = new Proxy(HTMLMediaElement.prototype.play, {
        apply(target, thisArg, args) {
            if (!done) {
                go()
            }
            done = true
            return Reflect.apply(...arguments);
        },
    })

    document.addEventListener(
        "yt-navigate-start",
        () => {
              /*console.log('cleared');*/ done = false;
        },
        { capture: true, once: true }
    );

    function go() {
        const livestream = document.querySelector('.ytp-button.ytp-live-badge:not([disabled=true])')
        if (!livestream) {
            return
        }
        livestream.style.marginLeft = '5px'
        const ctime = document.querySelector('.ytp-time-current')
        ctime.style.display = 'inline'
        const bar = document.querySelector('.ytp-progress-bar')
        const ttime = document.querySelector('.ytp-time-duration')
        const separator = document.querySelector('.ytp-time-separator')
        bar.setAttribute = new Proxy(bar.setAttribute, {
            apply(target, thisArg, args) {
                args[0] === "aria-valuemax" &&
                    (ttime.textContent = a(args[1]))
                if (bar.getAttribute('aria-valuemax') === bar.getAttribute('aria-valuenow')) {
                    ttime.style.display = ''
                    separator.style.display = ''
                } else {
                    ttime.style.display = 'inline'
                    separator.style.display = 'inline'
                }
                return Reflect.apply(...arguments)
                function a(given_seconds) {
                    const days = Math.floor(given_seconds / 86400);
                    const hours = Math.floor((given_seconds % 86400) / 3600);
                    const minutes = Math.floor((given_seconds % 3600) / 60);
                    const seconds = given_seconds % 60;
                    let timeString = '';
                    if (days > 0) {
                        timeString += days.toString() + ":";
                    }
                    timeString += hours.toString().padStart(2, '0') + ':' +
                        minutes.toString().padStart(2, '0') + ':' +
                        seconds.toString().padStart(2, '0');
                    return timeString;
                }
            }
        })
    }
})();
