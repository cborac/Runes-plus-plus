import { app, BrowserWindow, ipcMain, dialog, shell, App } from "electron"
import { exec } from 'child_process'
import { existsSync, writeFileSync, readFileSync } from 'fs'
import https from "https"


async function fetch(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
        https.get(url, {
            headers: {
                "User-Agent": "Mozilla/ 5.0(Windows NT 6.1; Win64; x64; rv: 47.0) Gecko / 20100101 Firefox / 47.0"
            }
        } , (res) => {
            res.setEncoding('utf8');
            let rawData = '';
            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(rawData))
                } catch (e) {
                    reject(e)
                }
            });
        }).on('error', reject)

    })
}

const currentVer = "v1.0.0"


let authInf: auth = null

type auth = {
    port: number,
    token: string
}

async function isProcessRunning(processName: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        switch (process.platform) {
            case 'win32':
                exec('tasklist', async (err: Error, stdout: string, stderr: string) => {
                if (err) reject(err)
    
                resolve(stdout.split(processName).length !== 1 && !!((await getAuth()).token))
                })
            break;
            case 'darwin': 
            exec('ps -ax | grep LeagueClientUx', async (err: Error, stdout: string, stderr: string) => {
                if (err) reject(err)
    
                resolve(stdout.split('riotclient-app').length !== 1 && !!((await getAuth()).token))
            })
        }
    })
};


ipcMain.on("first", async event => {
    event.returnValue = await getAuth()
})



async function getAuth(): Promise<auth> {
    return new Promise((res, rej) => {
        exec((process.platform === "win32") ? "wmic PROCESS WHERE name='LeagueClientUx.exe' GET commandline" : "ps -A | grep LeagueClientUx", (err, out) => {
            res({
                port: parseInt(out.match(/--app-port=([0-9]*)/)[1]),
                token: out.match(/--remoting-auth-token=([\w-_]*)/)[1]
            })
        })
    })
}

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    event.preventDefault();
    callback(true);
});


ipcMain.on("cacheAdd", (event, data) => {
    const file = JSON.parse(readFileSync("./runes.json").toString())

    file.main.push(data)

    writeFileSync("./runes.json", JSON.stringify(file, null, 2))

    event.returnValue = file
})


ipcMain.on("cacheRemove", (event, nonce) => {
    const file = JSON.parse(readFileSync("./runes.json").toString())

    file.main.splice(file.main.findIndex((x: any) => x.nonce === nonce), 1)

    writeFileSync("./runes.json", JSON.stringify(file, null, 2))

    event.returnValue = file
})

ipcMain.on("cacheRequest", (event) => {
    event.returnValue = JSON.parse(readFileSync("./runes.json").toString())
})

function handleSquirrelEvent(application: App) {
    if (process.argv.length === 1) {
        return false;
    }

    const ChildProcess = require('child_process');
    const path = require('path');

    const appFolder = path.resolve(process.execPath, '..');
    const rootAtomFolder = path.resolve(appFolder, '..');
    const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
    const exeName = path.basename(process.execPath);

    const spawn = function (command: any, args: any) {
        let spawnedProcess, error;

        try {
            spawnedProcess = ChildProcess.spawn(command, args, {
                detached: true
            });
        } catch (error) { }

        return spawnedProcess;
    };

    const spawnUpdate = function (args: any) {
        return spawn(updateDotExe, args);
    };

    const squirrelEvent = process.argv[1];
    switch (squirrelEvent) {
        case '--squirrel-install':
        case '--squirrel-updated':
            spawnUpdate(['--createShortcut', exeName]);

            setTimeout(application.quit, 1000);
            return true;

        case '--squirrel-uninstall':
            spawnUpdate(['--removeShortcut', exeName]);

            setTimeout(application.quit, 1000);
            return true;

        case '--squirrel-obsolete':
            application.quit();
            return true;
    }
};



app.allowRendererProcessReuse = true



app.on("ready", async () => {


    const win = new BrowserWindow({
        width: 400,
        height: 600,
        fullscreenable: false,
        frame: (process.platform !== "win32"),
        icon: "logo/Icon.ico",
        resizable: false,
        title: "Runes++",
        movable: true,
        webPreferences: {
            nodeIntegration: true
        }
    })


    if (!existsSync("./runes.json")) writeFileSync("./runes.json", `{"main":[{"name": "Example", "nonce": "0", "perks":[8128, 8126, 8138, 8135, 8226, 8232, 5008, 5008, 5001]}], "ignoreUpdate": false, "currentVer": "${currentVer}"}`)  

    const file = JSON.parse(readFileSync("./runes.json").toString())

    if (file.currentVer !== currentVer) writeFileSync("./runes.json", JSON.stringify(Object.assign(file, { ignoreUpdate: false, currentVer }), null, 2))


    fetch("https://api.github.com/repos/Sardonyx78/runes-plus-plus/releases/latest").then(r => {

        if (file.ignoreUpdate) return

        if (r.name !== currentVer) dialog.showMessageBox(win, {
            type: 'warning',
            buttons: ['Yes', 'No'],
            defaultId: 2,
            title: 'Question',
            message: 'There\'s an update',
            detail: 'Would you like to update?',
            checkboxLabel: 'Remember my answer',
            checkboxChecked: false,
        }).then(resp => {
            if (resp.response === 1) {
                if (resp.checkboxChecked) {
                    file.ignoreUpdate = true
                    writeFileSync("./runes.json", JSON.stringify(file, null, 2))
                }
            } else if (resp.response === 0) shell.openExternal('https://github.com/Sardonyx78/runes-plus-plus/releases') 
        });
    })

    if (process.env.NODE_ENV === "DEVELOPMENT") win.webContents.openDevTools()

    let loaded = false

    async function unload() {
        win.loadFile('views/loading/index.html')
        while (!loaded) {
            loaded = await isProcessRunning("LeagueClientUx")
            if (loaded) {
                authInf = await getAuth()
                load()
            }
        }
    }

    unload()

    

    async function load() {
        win.loadFile('views/main/index.html')
        while (loaded) {
            loaded = await isProcessRunning("LeagueClientUx")
            if (!loaded) {
                unload()
            }
        }
    }
})