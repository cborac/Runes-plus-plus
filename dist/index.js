"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const child_process_1 = require("child_process");
let authInf = null;
async function isProcessRunning(processName) {
    const cmd = (() => {
        switch (process.platform) {
            case 'win32': return `tasklist`;
            case 'darwin': return `ps -ax | grep ${processName}`;
            case 'linux': return `ps -A`;
            default: return false;
        }
    })();
    return new Promise((resolve, reject) => {
        require('child_process').exec(cmd, (err, stdout, stderr) => {
            if (err)
                reject(err);
            resolve(stdout.toLowerCase().indexOf(processName.toLowerCase() + (process.platform === "win32") ? ".exe" : "") > -1);
        });
    });
}
;
(async () => {
    if (await isProcessRunning("LeagueClientUx")) {
        authInf = await getAuth();
    }
})();
electron_1.ipcMain.on("ready", async (event) => {
    event.returnValue = {
        isRunning: await isProcessRunning("LeagueClientUx")
    };
});
function getAuth() {
    return new Promise((res, rej) => {
        child_process_1.exec((process.platform === "win32") ? "wmic PROCESS WHERE name='LeagueClientUx.exe' GET commandline" : "ps -A | grep LeagueClientUx", (err, out) => {
            res({
                port: parseInt(out.match(/--app-port=([0-9]*)/)[1]),
                token: out.match(/--remoting-auth-token=([\w-_]*)/)[1]
            });
        });
    });
}
electron_1.app.allowRendererProcessReuse = true;
electron_1.app.setName("Runes++");
electron_1.app.on("ready", async () => {
    const win = new electron_1.BrowserWindow({
        width: 400,
        height: 600,
        fullscreenable: false,
        icon: __dirname + "/R.png",
        resizable: false,
        title: "Runes++",
        movable: true,
        webPreferences: {
            nodeIntegration: true
        }
    });
    win.loadFile(__dirname + '/../views/loading/index.html');
    let loaded = false;
    while (!loaded) {
        loaded = await isProcessRunning("LeagueClientUx");
        if (loaded)
            load();
    }
    function load() {
        win.loadFile(__dirname + '/../views/main/index.html');
    }
});
//# sourceMappingURL=index.js.map