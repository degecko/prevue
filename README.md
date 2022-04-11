# Prevue Popup

Browser Extension allowing users to preview links and images in-page. Get it from the [official Chrome Web Store](https://chrome.google.com/webstore/detail/prevue-popup/afencccmfcofdgnigbenkpplpanigajd) or from [Mozilla Add-ons](https://addons.mozilla.org/en-US/firefox/addon/prevue-popup/).

## Demo

[Click to View Demo](https://i.imgur.com/afmwg7G.mp4)

## Suggestions Welcome

This extension is still in early stage development, so if you have suggestions on how to improve it, but you can't contribute the changes yourself, please send me a message following the contact link from the extension's options page.

## Options Page

When you first install the extension, the options page will open automatically.

You can re-open the options page by right clicking the extension from within the extensions menu, and clicking "Options" to open them in a new tab. Simply clicking the extension will also open the options page, but in a popup instead of a new tab.

In there, you will find a bunch of options to customise the extension based on your needs. I encourage you to play around with them until you find something that works for you.

The options will be synced to your Chrome Sync account, if you use it. Meaning that once you edit them on one machine, they'll be available on all the others as well.

## Unpacked Loading

If you want to modify the extension, you'll need to load it as an "unpacked extension".

- Clone this repo or download a zip of it and unzip it on your machine
- Go to chrome://extensions in your browser
- Click "Load unpacked"
- Choose the "src" folder and confirm

You might want to disable the official extension while you're using the unpacked version, otherwise they will both work in parallel and will result in strange behavior.

## Dev Story

I've had a pretty hard time developing this following the relatively new Manifest V3 guidelines, and specifically the new declarativeNetRequest API, which replaced the webRequest and webRequestBlocking APIs.

If you're a Chrome extension developer, you might find the story behind building this extension somewhat educational.

I wrote about it on [my blog](https://www.codepicky.com/prevue-popup/).

## Author

- [Cosmin Gheorghita](https://gecko.dev)

<a href="https://www.buymeacoffee.com/degecko" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/arial-yellow.png" alt="Buy Me A Coffee" style="height: 40px !important;" target="_blank"></a>