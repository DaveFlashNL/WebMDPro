# Web MiniDisc Pro*
(*mostly visually oriented fork by ddM/DaveFlash)<br/>
*Brings NetMD Devices to the Web*
### Differences between [Web Minidisc](https://github.com/cybercase/webminidisc) and Web Minidisc Pro
As per request of the original creator, all future changes by Asivery will be implemented on his [fork](https://github.com/asivery/webminidisc), and subsequently mirrored to this fork, while here, I, DaveFlash, as a webdeveloper, will focus mainly on the UI/UX side of things and less on the technical.

For now the extra features of Web Minidisc Pro are:
- The ability to connect to NetMD units available on the local network with the help of [Remote NetMD](https://github.com/asivery/remote-netmd-server)
- Downloading tracks straight from the player via NetMD (only for Sony MZ-RH1 users)
But there are more features on the way.

Live @ [webmdpro.ddw.nu](https://webmdpro.ddw.nu)</br>
and @ [web.minidisc.wiki](https://web.minidisc.wiki)</br>
How it works @ [https://www.youtube.com/watch?v=Frs8qhw0g9Y](https://www.youtube.com/watch?v=Frs8qhw0g9Y)</br>
Blogpost @ [https://stefano.brilli.me/blog/web-minidisc](https://stefano.brilli.me/blog/web-minidisc)

Requires *Chrome* or any other browser that supports both **WASM** and **WebUSB**

#### macOS
_it just works ®_ ... no need to download or install any software.

#### Linux
Follow the instructions here [https://github.com/glaubitz/linux-minidisc/tree/master/netmd/etc](https://github.com/glaubitz/linux-minidisc/tree/master/netmd/etc) to grant your user access to the device. If you skip this step you'll likely get an *Access denied* message when trying to connect.

#### Windows 10
The Windows USB stack requires a driver to be installed to communicate with any USB device. The bad news is that there are no official Windows 10 drivers for NetMD devices. The good news is that we don't need it!
We can just use a generic driver like *WinUSB* to access the device.

You can find installation instruction [here](https://docs.microsoft.com/en-us/windows-hardware/drivers/usbcon/winusb-installation), but the easiest way to install is to use [Zadig](https://zadig.akeo.ie/).<br/> Note: you'll need to restart your browser after installation.

#### Chrome OS
Works without any addtional set up - tested with 91 stable (91.0.4472.102). If your user account or device is managed (by your school or company) you may run into some issues. If you are using a personal google account on a personal chromebook you should be good to go.

### Don't know what is a MiniDisc?

- Where to start -> [https://en.wikipedia.org/wiki/MiniDisc](https://en.wikipedia.org/wiki/MiniDisc)
- Community -> [https://www.reddit.com/r/minidisc/](https://www.reddit.com/r/minidisc/)

### How to build

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app), so you can run:
- `npm start` to start the development server
- `npm build` to build for production

WASM modules are provided in the `public/` directory. However, if you wish to build those binaries yourself, instructions are provided in the `extra/` directory.


### How to Contribute
Every contribute is welcome but, please, reach out to me before working on any PR. I've built this app mainly for personal use and I wish to keep it as light as possible in terms of features.

### Bugs and Issues
There might be plenty of them, for sure :) . The thing is that I've not the time to fix all of them and to make sure this app works on every browser or device.

The best way to get a bug fixed, a feature implemented, or a device supported, is to fork the project and do it for yourself. I'll try to provide support as best as I can.

### Backstory
A few weeks ago I've found my old [MZ-N710](https://www.minidisc.org/part_Sony_MZ-N710.html) in the basement of my parents' house.

Determined to make it work on my modern Mac, after some googling, I found out about the [linux-minidisc](https://github.com/glaubitz/linux-minidisc) project. They've done an amazing job in reversing the NetMD protocol.

After a quick inspection to the source code I realized the project could be easily ported to javascript (either node and the browser) using the WebUSB api, so I created [netmd-js](https://github.com/cybercase/netmd-js). Then, on top of that I've built **Web MiniDisc** to manage the music on my device without the need of downloading and installing any dedicated software.

That's it. It was a LOT of fun :).

### Some OSS I've used
- [FFmpeg](https://www.ffmpeg.org/) and [ffmpegjs](https://github.com/ffmpegjs/FFmpeg), to read audio files (wav, mp3, ogg, mp4, etc...).
- [Atracdenc](https://github.com/dcherednik/atracdenc/), to support atrac3 encoding (lp2, lp4 audio formats).
- [Emscripten](https://emscripten.org/), to run both FFmpeg and Atracdenc in the browser.
- [netmd-js](https://github.com/cybercase/netmd-js), to send commands to NetMD devices using Javascript.
- [material-ui](https://material-ui.com/), to build the user interface.
- [linux-minidisc](https://github.com/linux-minidisc/linux-minidisc), to build the netmd-js library.
