import { app, BrowserWindow, ipcMain } from "electron"
import { exec } from 'child_process'
import { EventEmitter } from "events";

let authInf: auth = null

type auth = {
    port: number,
    token: string
}

async function isProcessRunning(processName: string): Promise<boolean> {
    const cmd = (() => {
        switch (process.platform) {
            case 'win32': return `tasklist`
            case 'darwin': return `ps -ax | grep ${processName}`
            case 'linux': return `ps -A`
            default: return false
        }
    })()

    return new Promise((resolve, reject) => {
        require('child_process').exec(cmd, (err: Error, stdout: string, stderr: string) => {
            if (err) reject(err)

            resolve(stdout.toLowerCase().indexOf(processName.toLowerCase() + (process.platform === "win32") ? ".exe" : "") > -1)
        })
    })
};

(async () => {
    if (await isProcessRunning("LeagueClientUx")) {
        authInf = await getAuth()
    }
})()


ipcMain.on("ready", async event => {
    event.returnValue = {
        isRunning: await isProcessRunning("LeagueClientUx")
    }
})

function getAuth(): Promise<auth> {
    return new Promise((res, rej) => {
        exec((process.platform === "win32") ? "wmic PROCESS WHERE name='LeagueClientUx.exe' GET commandline" : "ps -A | grep LeagueClientUx", (err, out) => {
            res({
                port: parseInt(out.match(/--app-port=([0-9]*)/)[1]),
                token: out.match(/--remoting-auth-token=([\w-_]*)/)[1]
            })
        })
    })
}



app.allowRendererProcessReuse = true

app.on("ready", async () => {
    const win = new BrowserWindow({
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
    })

    win.loadFile(__dirname + '/../views/loading/index.html')
    
    let loaded = false

    while (!loaded) {
        loaded = await isProcessRunning("LeagueClientUx")
        if (loaded) load()
    }

    function load() {
        win.loadFile(__dirname + '/../views/main/index.html')
    }

})