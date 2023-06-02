// ==UserScript==
// @name        No Debugger Abuse
// @namespace   https://github.com/pepeloni-away
// @author      pploni
// @run-at      document-start
// @insert-into page
// @version     1.4
// @description Disable and optinally log calls to javascript debugger
// @grant       none
// @match       *://*/*
// ==/UserScript==

const logs = false
const protectConsole = true // attempt to disable console.clear and to prevent changes to console.log
const here = location.href.length < 88 ? location.href.substring(8) : location.href.substring(8, 88) + "..."
let logw
let clearw
let lastCall
try { // this will fail if ublock runs first and its filters set console.clear to undefined
    logw = Function.prototype.bind.call(console.log, console)
    clearw = new Proxy(Function.prototype.bind.call(console.clear, console), {
        apply(target, thisArg, args) {
            if (args[0] === "please") return Reflect.apply(...arguments)
            /* Throw error to break inline scripts, since the function constructor proxy doesn't catch debugger statements in them.
             * Try commenting the line if some page doesn't load, but i think absolutely nobody has any reason to use
             * console.clear inside an inline script (or at all, really), unless it's used together with debugger
             * and new Date().getTime() to try and block dev tools access. */
            throw new TypeError("Baaaaka! I'm not clearing it.")
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
        },
        "log": {
            configurable: false,
            set() {
                return
            },
            get() {
                return logw
            }
        }
    })
} catch {}
self.Function.prototype.constructor = new Proxy(self.Function.prototype.constructor, {
   apply: function(target, thisArg, args) {
       /* https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/caller#browser_compatibility
        * Function.prototype.caller is non-standard but supported by everything
        * When not in strict mode caller may access arguments object and its own caller.
        * You can write thing.caller.caller.caller ... */
       let fnContent, caller = this.apply?.caller, callerContent, now, diff
       // eval(caller = function() {debugger})
       try {
           fnContent = args[0]
           caller ||= thisArg // use thisArg if we dont't have access to caller; if thisArg is a function, it will include the caller somewhere
           try { callerContent = String(caller) } catch(e) { callerContent = e.toString() }
           now = new Date().getTime()
           lastCall ? diff = now - lastCall : diff = 0
           if (logs) {
               logw(`debugger call on ${here}`, diff, `ms since last call\ncalled by`, caller, `caller content:\n${callerContent}`)
           }
           lastCall = now
       } catch (err) {
           if (logs) logw(err, `\ndebugger logger failed on ${here}\narguments:`, arguments)
       }
       /* They call debugger by returning a function to the global context, followed by javascript bullshit, looks kinda like this:
        * `(function() {return}["constructor"]("debugger"))`
        * Doing it like this opens the debugger to the function the line above creates, not to their code that returns the line above,
        * otherwise you would be able to debug their obfuscated code in the debugger.
        * With that said, the single if below will catch most if not all of them,
        * you can uncomment the next line that uses includes() if you need this to be more agressive */
       if ('debugger' === fnContent) return
       // if (fnContent.includes('debugger')) return
       return target.apply(thisArg, args)
   }
})
// keep this equality because some libraries check if something is a function by comparing its constructor with Function
self.Function = self.Function.constructor
