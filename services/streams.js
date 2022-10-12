
const EventEmitter = require('events')
const fetch = require('node-fetch')
const Key = require('./gunDB/contact-api/key')
const StreamLiveManager = new EventEmitter()

const startedStream = (data) => {
  StreamLiveManager.emit('awaitStream',data)
}
const endStream = (data) => {
  StreamLiveManager.emit('endStream',data)
}
module.exports = {startedStream,endStream}

//-----------------------------------------

const intervalsWaitingAlive = {}
const intervalsStreamingViewers = {}
const intervalsWaitingMp4 = {}

const clearStreamInterval = (postId, map) => {
  if(!postId){
    return
  }
  if(map === "intervalsWaitingAlive"){
    if(!intervalsWaitingAlive[postId]){
      return
    }
    clearInterval(intervalsWaitingAlive[postId])
    delete intervalsWaitingAlive[postId]
  }
  if(map === "intervalsStreamingViewers"){
    if(!intervalsStreamingViewers[postId]){
      return
    }
    clearInterval(intervalsStreamingViewers[postId])
    delete intervalsStreamingViewers[postId]
  }
  if(map === "intervalsWaitingMp4"){
    if(!intervalsWaitingMp4[postId]){
      return
    }
    clearInterval(intervalsWaitingMp4[postId])
    delete intervalsWaitingMp4[postId]
  }
}

StreamLiveManager.on('awaitStream', data => {
  const { postId, contentId, statusUrl } = data
  if(intervalsWaitingAlive[postId]){
    clearStreamInterval(intervalsWaitingAlive[postId])
  }
  const user = require('../services/gunDB/Mediator').getUser()
  intervalsWaitingAlive[postId] = setInterval(async () => {
    try {
      const res = await fetch(statusUrl)
      const j = await res.json()
      if (!j.isLive) {
        return
      }
      user
        .get(Key.POSTS_NEW)
        .get(postId)
        .get('contentItems')
        .get(contentId)
        .get('liveStatus')
        .put('live')
      clearStreamInterval(postId,"intervalsWaitingAlive")
      StreamLiveManager.emit('followStream', data)
      //eslint-disable-next-line no-empty
    } catch{}
  }, 2 * 1000)
  //kill sub after 10 minutes
  setTimeout(()=>{
    clearStreamInterval(postId,"intervalsWaitingAlive")
  },10 * 60 * 1000)
})

StreamLiveManager.on('followStream', data => {
  const { postId, contentId, statusUrl } = data
  if(intervalsStreamingViewers[postId]){
    clearStreamInterval(postId,"intervalsStreamingViewers")
  }
  const user = require('../services/gunDB/Mediator').getUser()
  intervalsStreamingViewers[postId] = setInterval(async () => {
    try {
      const res = await fetch(statusUrl)
      const j = await res.json()
      if (typeof j.viewers !== 'number') {
        return
      }
      user
        .get(Key.POSTS_NEW)
        .get(postId)
        .get('contentItems')
        .get(contentId)
        .get('viewersCounter')
        .put(j.viewers)
      //eslint-disable-next-line no-empty
    } catch{}
  }, 5 * 1000)
})

StreamLiveManager.on('endStream', data => {
  const { postId, contentId, endUrl, urlForMagnet, obsToken } = data
  console.log("ending stream!")
  clearStreamInterval(postId,"intervalsStreamingViewers")
  if(intervalsWaitingMp4[postId]){
    clearStreamInterval(postId,"intervalsWaitingMp4")
  }
  const user = require('../services/gunDB/Mediator').getUser()
  user
    .get(Key.POSTS_NEW)
    .get(postId)
    .get('contentItems')
    .get(contentId)
    .get('liveStatus')
    .put('waiting')
  fetch(endUrl,{
    headers: {
      'Authorization': `Bearer ${obsToken}`
    },
  })
  intervalsWaitingMp4[postId] = setInterval(async () => {
    try {
      const res = await fetch(urlForMagnet)
      const j = await res.json()
      if (!j.magnet) {
        return
      }
      user
        .get(Key.POSTS_NEW)
        .get(postId)
        .get('contentItems')
        .get(contentId)
        .get('liveStatus')
        .put('wasLive')
      user
        .get(Key.POSTS_NEW)
        .get(postId)
        .get('contentItems')
        .get(contentId)
        .get('playbackMagnet')
        .put(j.magnet)
      clearStreamInterval(postId,"intervalsWaitingMp4")
      //eslint-disable-next-line no-empty
    } catch{}
  }, 5 * 1000)
})

