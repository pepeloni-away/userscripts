// ==UserScript==
// @name        No Debugger Abuse
// @namespace   https://github.com/pepeloni-away
// @author      pploni
// @run-at      document-start
// @insert-into page
// @version     1.6
// @description Disable and optinally log calls to javascript debugger
// @grant       GM_log
// @match       *://*/*
// ==/UserScript==

const logs = false
const protectConsole = false // attempt to disable console.clear
const here = location.href.length < 88 ? location.href.substring(8) : location.href.substring(8, 88) + "..."
let clearw
let lastCall

if (protectConsole) {
    try { // this will fail if ublock runs first and its filters set console.clear to undefined
        clearw = new Proxy(Function.prototype.bind.call(console.clear, console), {
            apply(target, thisArg, args) {
                if (args[0] === "please") return Reflect.apply(...arguments)
            }
        })
        Object.defineProperties(self.console, {
            "clear": {
                configurable: false,
                set() {
                    return
                },
                get() {
                    return clearw
                }
            }
        })
    } catch {}
}
unsafeWindow.Function.prototype.constructor = unsafeWindow.Function = new Proxy(unsafeWindow.Function, {
    apply(target, thisArg, args) {
        /* https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/caller#browser_compatibility
        * Function.prototype.caller is non-standard but supported by everything
        * When not in strict mode caller may access arguments object and its own caller.
        * You can write thing.caller.caller.caller ... */
       let fnContent, caller, callerContent, now, diff
       try {
           try { caller = this.apply.caller } catch { caller = thisArg }
           fnContent = args[0]
           try { callerContent = String(caller) } catch(e) { callerContent = e.toString() }
           now = new Date().getTime()
           lastCall ? diff = now - lastCall : diff = 0
           if (logs) {
               GM_log(`likey debugger call on ${here}`, diff, `ms since last call\ncalled by`, caller, `caller content:\n${callerContent}`)
           }
           lastCall = now
       } catch (err) {
           if (logs) GM_log(err, `\ndebugger logger failed on ${here}\narguments:`, arguments)
       }
       /* They call debugger by returning a function to the global context, followed by javascript bullshit, looks kinda like this:
        * `(function() {return}["constructor"]("debugger"))`
        * Doing it like this opens the debugger to the function the line above creates, not to their code that returns the line above,
        * otherwise you would be able to debug their obfuscated code in the debugger.
        * With that said, the single if below will catch most if not all of them,
        * you can uncomment the next line that uses includes() if you need this to be more agressive */
       if ('debugger' === fnContent) return
       // if (fnContent.includes('debugger')) return
       return Reflect.apply(...arguments)
    }
})
