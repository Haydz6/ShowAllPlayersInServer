// ==UserScript==
// @name         ShowAllPlayersInServer
// @version      1.0
// @description  Shows all players in a roblox server
// @author       Haydz6
// @match        https://www.roblox.com/games/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=roblox.com
// @grant        none
// @run-at       document-start
// ==/UserScript==

const sleep = ms => new Promise(r => setTimeout(r, ms));
let LastCursor = ""

async function RequestFunc(URL, Method, Headers, Body){
    return await (await fetch(URL, {method: Method, headers: Headers, body: Body})).json()
}

async function GetServers(PlaceId, Cursor){
    return await RequestFunc(`https://games.roblox.com/v1/games/${PlaceId}/servers/Public?limit=9&cursor=${Cursor}`, "GET")
}

async function GetImageUrlsFromTokens(Tokens){
    const Batch = []

    for (let i = 0; i < Tokens.length; i++){
        const Token = Tokens[i]

        Batch.push({
            requestId: Token,
            token: Token,
            type: "AvatarHeadShot",
            size: "150x150",
            format: "PNG",
            isCircular: true
        })
    }

    const Result = (await RequestFunc("https://thumbnails.roblox.com/v1/batch", "POST", {["Content-Type"]: "application/json"}, JSON.stringify(Batch)))?.data

    const Data = []

    for (let i = 0; i < Result.length; i++){
        const Item = Result[i]

        if (Item.state != "Completed") continue

        Data.push(Item.imageUrl)
    }

    return Data
}

async function GetNextServers(PlaceId){
    const Servers = await GetServers(PlaceId, LastCursor)
    LastCursor = Servers.nextPageCursor

    return Servers
}

//UI CREATION

async function WaitForId(Id){
    let Element = null
  
    while (true) {
      Element = document.getElementById(Id)
      if (Element) {
        break
      }
  
      await sleep(50)
    }
  
    return Element
}

async function WaitForClass(Class){
    let Element = null
  
    while (true) {
      Element = document.getElementsByClassName(Class)[0]
      if (Element) {
        break
      }
  
      await sleep(50)
    }
  
    return Element
}

async function CreateServerBox(Server, PlaceId){
    const ServerList = await WaitForId("rbx-game-server-item-container")

    const ServerItem = document.createElement("li")
    ServerItem.className = "rbx-game-server-item col-md-3 col-sm-4 col-xs-6"
    ServerItem.setAttribute("data-gameid", Server.id)
    ServerItem.setAttribute("data-placeid", PlaceId)

    const CardItem = document.createElement("div")
    CardItem.className = "card-item"
    CardItem.style.border = "1px solid #17e84b"

    const PlayerThumbnailsContainer = document.createElement("div")
    PlayerThumbnailsContainer.className = "player-thumbnails-container"

    for (let i = 0; i < Server.ImageUrls.length; i++){
        const ImageUrl = Server.ImageUrls[i]

        const HeadshotItem = document.createElement("span")
        HeadshotItem.className = "avatar avatar-headshot-md player-avatar"

        const ThumbnailContainer = document.createElement("span")
        ThumbnailContainer.className = "thumbnail-2d-container avatar-card-image"

        const Image = document.createElement("img")
        Image.src = ImageUrl

        ThumbnailContainer.appendChild(Image)
        HeadshotItem.appendChild(ThumbnailContainer)
        PlayerThumbnailsContainer.appendChild(HeadshotItem)
    }

    const ServerDetailsItem = document.createElement("div")
    ServerDetailsItem.className = "rbx-game-server-details game-server-details"

    const PlayerCountItem = document.createElement("div")
    PlayerCountItem.className = "text-info rbx-game-status rbx-game-server-status text-overflow"
    PlayerCountItem.textContent = `${Server.playing} of ${Server.maxPlayers} people max`
    ServerDetailsItem.appendChild(PlayerCountItem)

    const PlayerCountBar = document.createElement("div")
    PlayerCountBar.className = "server-player-count-gauge border"

    const InnerPlayerCountBar = document.createElement("div")
    InnerPlayerCountBar.className = "gauge-inner-bar border"
    InnerPlayerCountBar.style.width = `${(Server.playing / Server.maxPlayers)*100}%`
    PlayerCountBar.appendChild(InnerPlayerCountBar)

    ServerDetailsItem.appendChild(PlayerCountBar)

    const JoinButtonContainer = document.createElement("span")
    JoinButtonContainer.setAttribute("data-placeid", PlaceId)

    const JoinButton = document.createElement("button")
    JoinButton.type = "button"
    JoinButton.className = "btn-full-width btn-control-xs rbx-game-server-join game-server-join-btn btn-primary-md btn-min-width"
    JoinButton.textContent = "Join"
    JoinButtonContainer.appendChild(JoinButton)

    ServerDetailsItem.appendChild(JoinButtonContainer)

    CardItem.appendChild(PlayerThumbnailsContainer)
    CardItem.appendChild(ServerDetailsItem)

    ServerItem.appendChild(CardItem)
    
    ServerList.insertBefore(ServerItem, ServerList.firstChild)

    return ServerItem
}

function GetPlaceIdFromURL(){
    return String(location.href.match(/\/(\d+)\//g)).match(/\d+/g)
}

async function InitInput(){
    const PlaceId = GetPlaceIdFromURL()

    let Debounce = false
    
    const Button = await WaitForClass("rbx-running-games-load-more btn-control-md btn-full-width")
    Button.addEventListener("click", async function(){
        if (Debounce) return
        Debounce = true

        await GetNextServers(PlaceId)

        Debounce = false
    })
}

InitInput()