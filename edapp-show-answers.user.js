// ==UserScript==
// @name        Edapp Show Answers
// @namespace   https://github.com/pepeloni-away
// @author      pploni
// @run-at      document-start
// @insert-into page
// @version     1.0
// @description Show answers on edapp, toggle with Ctrl + h
// @grant       none
// @match       https://engine.edapp.com/*
// ==/UserScript==

const css = `
/* drag and drop */
.droppy::after { content: attr(data-name); opacity: 0.25; }
/* choice list */
.correct { border: thin double green; }
`,
      style = document.createElement("style"),
      toggle = () => style.innerText === "" ? style.innerText = css : style.innerText = ""

window.addEventListener("keydown", function(e) {
    if (e.ctrlKey && e.key === "h") {
        e.preventDefault()
        toggle()
    }
}, true)

document.documentElement.append(style)
