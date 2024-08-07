## [Fantastic Streamer](https://github.com/pepeloni-away/userscripts/raw/main/fantastic-streamer.user.js)
This is a userscript that will try to detect video streams and open them inside android video players.
By default it runs on some popular anime sites but it should work on most other sites by just adding them as additional matches in your userscript manager (the top page and the video iframes, if any).  
  
**write about players and headers here**

## [Fantastic Tweaks](https://github.com/pepeloni-away/userscripts/raw/main/fantastic-tweaks.user.js)
Visual and functional tweaks for a few anime streaming sites

## [No Debugger Abuse](https://github.com/pepeloni-away/userscripts/raw/main/no-debugger-abuse.user.js)
Stop websites from constantly calling the javascript debugger statement when browser dev tools are open.  
**This should only be on when needed, it proxies the standard Function object and might break some functionality on some pages. Breaks at least:
episode style buttons on kickassanime, creating wargaming.net support tickets**

## [Youtube Iframe Fullscreen Everywhere](https://github.com/pepeloni-away/userscripts/raw/main/youtube-iframe-fullscreen-everywhere.user.js)
A lot of wiki websites have small youtube embeds without fullscreen option.

## [Youtube QoL](https://github.com/pepeloni-away/userscripts/raw/main/youtube-qol.user.js)
This is made up of multiple individual scripts that run on different youtube pages, bundled together because navigating youtube doesn't refresh the tab.

So far it includes:
* redirect shorts to normal watch page.
* remove `&t` parameter from URLs- useful if you watch a long video on multiple devices;  Time parameter is still accessible by going back in tab history.
* remove the `&list` parameter from playlist URLs - so you can middle-click on videos to open them alone in a new tab.
* watch later tweaks - adds an invisible-unless-hovered button to the left of the 3 dots on each video. Click it to remove the video from the list.
* disable channel page autoplay.
* action button tweaks - reverse the order of action buttons so that "Save" is first, or remove the others completely.

## [Youtube Hls Enabler](https://github.com/pepeloni-away/userscripts/raw/main/youtube-hls-enabler.user.js)
Fetch and play the hls manifest from the ios player response in the browser.

## [Edapp Show Answers](https://github.com/pepeloni-away/userscripts/raw/main/edapp-show-answers.user.js)
Supports drag & drop and choice list type of quizzes.
Always off by default, toggle with Ctrl+h.

## [MAL Chiaki Shortcut](https://github.com/pepeloni-away/userscripts/raw/main/mal-chiaki-shortcut.user.js)
Adds a shortcut to chiaki's watch order page on any myanimelist/anime page.

## [ChiakiMixPlay](https://github.com/pepeloni-away/userscripts/raw/main/chiakimixplay.user.js)
This adds the following to chiaki:
* animixplay's external streaming links.
* fetch anime info by clicking on it's picture.
* links to openings and endings from animethemes.moe using themes.moe api.
* the ability to open search results in new tabs via image middle click.

## [Twitch DVR player](https://github.com/pepeloni-away/userscripts/raw/main/twitch-dvr-player.user.js)
Full credits to the extension at https://github.com/caeleel/twitch-dvr#twitch-dvr-player.  
This is just a way to run the extension without manually loading it into each browser you use.

## [themes.moe updater](https://github.com/pepeloni-away/userscripts/raw/main/themes.moe-updater.user.js)
Insert updated themes from animethemes.moe into themes.moe's outdated api responses.
Fetching anime ids and updated themes is slow compared to the orignal outdated api responses and this userscript doesn't keep the original theme version structure because i didn't understand it.
  
Before i figured this out i made a minimalist themes.moe-inspired page [here](https://github.com/pepeloni-away/mes).
