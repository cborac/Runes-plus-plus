const { ipcRenderer } = require('electron')

const auth = ipcRenderer.sendSync("first")


let styles = fetch(`https://127.0.0.1:${auth.port}/lol-perks/v1/styles`, {
    headers: {
        Authorization: `Basic ${btoa(`riot:${auth.token}`)}`
    }
}).then(async res => res.json())



const select = () => document.getElementById("select")

function getRandomInt() {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (9999999 - 0 + 1)) + 0;
}
function randomString() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < 25; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}


let runes = fetch(`https://127.0.0.1:${auth.port}/lol-perks/v1/perks`, {
    headers: {
        Authorization: `Basic ${btoa(`riot:${auth.token}`)}`
    }
}).then(async res => res.json())

let cache = ipcRenderer.sendSync("cacheRequest")

function cacheReq(data, remove = false) {
    if (remove) {
        cache = ipcRenderer.sendSync("cacheRemove", data)
    } else {
        if (data) cache = ipcRenderer.sendSync("cacheAdd", data)
        else cache = ipcRenderer.sendSync("cacheRequest")   
    }
}

cacheReq()

let currentRune = null

cache.main.forEach(x => { 
    const option = document.createElement("option")
    option.text = x.name
    option.value = x.nonce
    select().options.add(option)
})

change(select())

function addNewRune() {
    fetch(`https://127.0.0.1:${auth.port}/lol-perks/v1/currentpage`, {
        headers: {
            Authorization: `Basic ${btoa(`riot:${auth.token}`)}`
        }
    }).then(async res => {
        const nonce = randomString()
        const body = await res.json()
        cacheReq({
            name: body.name,
            nonce,
            perks: body.selectedPerkIds
        })

        const option = document.createElement("option")
        option.text = body.name
        option.value = nonce
        option.selected = 'selected'
        select().options.add(option)
        document.getElementById("import").play()
        change(select())
    })
}

function change() {
    displayRune(cache.main.find(x => x.nonce === select().options[select().selectedIndex].value).perks)
}


async function displayRune(perks) {
    runes = await runes
    styles = await styles
    document.getElementById("keyRune").src = localToDDragon(runes.find(x => x.id === perks[0]).iconPath)
    document.getElementById("rune1").src = localToDDragon(runes.find(x => x.id === perks[1]).iconPath)
    document.getElementById("rune2").src = localToDDragon(runes.find(x => x.id === perks[2]).iconPath)
    document.getElementById("rune3").src = localToDDragon(runes.find(x => x.id === perks[3]).iconPath)
    document.getElementById("arune1").src = localToDDragon(runes.find(x => x.id === perks[4]).iconPath)
    document.getElementById("arune2").src = localToDDragon(runes.find(x => x.id === perks[5]).iconPath)
    document.getElementById("lrune1").src = localToDDragon(runes.find(x => x.id === perks[6]).iconPath)
    document.getElementById("lrune2").src = localToDDragon(runes.find(x => x.id === perks[7]).iconPath)
    document.getElementById("lrune3").src = localToDDragon(runes.find(x => x.id === perks[8]).iconPath)
}

/**
 * @param {string} path 
 */
function localToDDragon(path) {
    const array = path.split("/")
    array.splice(0, array.findIndex(x => x.match(/v([^0]*)/)) + 1)
    return __dirname + "/assets/" + array.join("/")
}

function deleteRune() {
    cacheReq(select().options[select().selectedIndex].value, true)
    select().remove(select().selectedIndex)
    document.getElementById("delete").play()
    change(select())
}


async function getPatchVer() {
    const res = await fetch("https://ddragon.leagueoflegends.com/api/versions.json")
    const body = await res.json()
    return body[0]
}

async function exportRune() {
    document.getElementById("export").play()
    const rune = cache.main.find(x => x.nonce === select().options[select().selectedIndex].value)

    const pStyle = styles.find(x => x.slots[0].perks.includes(rune.perks[0]))
    const sStyle = styles.find(x => x.slots[1].perks.includes(rune.perks[4]) || x.slots[2].perks.includes(rune.perks[4]) || x.slots[3].perks.includes(rune.perks[4]))

    if (styles instanceof Promise) styles = await styles

    const res = await fetch(`https://127.0.0.1:${auth.port}/lol-perks/v1/currentpage`, {
        headers: {
            Authorization: `Basic ${btoa(`riot:${auth.token}`)}`
        }
    })

    const body = await res.json()

    /*fetch(`https://127.0.0.1:${auth.port}/lol-perks/v1/pages/${body.id}`, {
        method: "DELETE",
        headers: {
            Authorization: `Basic ${btoa(`riot:${auth.token}`)}`
        }
    })*/
    
    fetch(`https://127.0.0.1:${auth.port}/lol-perks/v1/pages/${body.id}`, {
        method: "PUT",
        body: JSON.stringify(
            {
                /*"autoModifiedSelections": body.autoModifiedSelections,
                "current": true,
                "id": body.id,
                "isActive": body.active,
                "isDeletable": body.deletable,
                "isEditable": body.editable,
                "isValid": true,*/
                "lastModified": Date.now(),
                "name": "Runes++",
                //"order": body.order,
                "primaryStyleId": pStyle.id,
                "selectedPerkIds": rune.perks,
                "subStyleId": sStyle.id
            }),
        headers: {
            Authorization: `Basic ${btoa(`riot:${auth.token}`)}`,
            "Content-Type": "application/json"
        }
    })
}


fetch(`https://127.0.0.1:${auth.port}/lol-summoner/v1/current-summoner`, {
    headers: {
        Authorization: `Basic ${btoa(`riot:${auth.token}`)}`
    }
}).then(async res => {
    const body = await res.json()
    document.getElementById("summonerName").innerHTML = body.displayName
    document.getElementById("pfp").src = `http://ddragon.leagueoflegends.com/cdn/${await getPatchVer()}/img/profileicon/${body.profileIconId}.png`
})