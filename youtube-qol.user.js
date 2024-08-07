// ==UserScript==
// @name        Youtube QoL
// @namespace   https://github.com/pepeloni-away
// @author      pploni
// @run-at      document-start
// @insert-into page
// @version     1.4
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
    const mode = "single", // "single" -> only show save button | "flip" -> flip buttons so that save is first instead of last
        // flip will sometimes not show buttons at all when navigating youtube, but will work if you press back and forward page buttons....flip
        // ===
        // i think it's because youtube will just remove buttons from the array without checking, so when you go from a video that
        // originally had clip, thanks and save, to one that only has save, youtube will remove the last 2 buttons, but since the script
        // removed them already, youtube will remove the last button, save.
        // ====
        // don't feel like dealing with that
        descriptor = Object.getOwnPropertyDescriptor(
            Object.prototype,
            "playerResponse"
        ) ?? {
            set(value) {
                this._YRNAB_playerResponse = value;
            },
            get() {
                return this._YRNAB_playerResponse;
            },
        };
    Object.defineProperty(Object.prototype, "playerResponse", {
        set: descriptor.set,
        get: new Proxy(descriptor.get, {
            apply(target, thisArg, args) {
                const { response } = thisArg;
                rm: if (response !== null && typeof response === "object") {
                    // console.log(response)
                    let arr
                    // there are some other response objects with different structure we don't want to mess with, for example on search page
                    try {
                        arr =
                            response.contents.twoColumnWatchNextResults.results.results
                                .contents[0].videoPrimaryInfoRenderer.videoActions.menuRenderer
                                .flexibleItems;

                        // remove share
                        const s = response.contents.twoColumnWatchNextResults.results.results
                        .contents[0].videoPrimaryInfoRenderer.videoActions.menuRenderer
                        .topLevelButtons
                        s.length === 2 && s.pop()
                    } catch (e) {
                        break rm;
                    }
                    // console.log(arr)
                    if (mode === "single")
                        arr.length > 1 && arr.splice(0, arr.length - 1);
                    // if (mode === "flip") !arr.flipped && (arr.flipped = true, arr.reverse()) // fix flip
                    // if (mode === "flip") arr.length > 1 && arr[0].menuFlexibleItemRenderer.topLevelButton.buttonRenderer.tooltip !== "Save" && arr.reverse()
                    /*if (mode === "flip") arr = arr.sort((a, b) => {
                                  // console.log(a, b); return 1
                                  if (b.menuFlexibleItemRenderer.topLevelButton.buttonRenderer.tooltip === "Save") return 1
                                  return -1
                              })
                              console.log("after", arr.map(e => e.menuFlexibleItemRenderer.topLevelButton.buttonRenderer.tooltip))*/
                }
                return Reflect.apply(...arguments);
            },
        }),
        configurable: true,
    });
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
