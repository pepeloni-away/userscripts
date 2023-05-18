// ==UserScript==
// @name        MAL Chiaki Shortcut
// @namespace   https://github.com/pepeloni-away
// @author      pploni
// @run-at      document-end
// @insert-into page
// @version     1.0
// @description 3/10/2023, 9:38:45 PM
// @grant       none
// @match       https://myanimelist.net/anime/*
// ==/UserScript==

const id = location.href.match(/(?<=anime\/)\d+/)[0]
const a = document.createElement("a")
a.style.float = "right"
a.innerText = "Chiaki"
a.href = "https://chiaki.site/?/tools/watch_order/id/" + id
document.querySelector(".breadcrumb").append(a)
