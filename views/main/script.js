const { ipcRenderer } = require('electron')


document.getElementById("summonerName").innerHTML = ipcRenderer.sendSync("ready").isRunning