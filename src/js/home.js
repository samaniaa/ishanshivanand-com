import './main.js'
import * as day from './modules/day.js'
import * as chapters from './modules/chapters.js'
import * as video from './modules/video.js'

day.init()
chapters.init()
document.querySelectorAll('[data-video]').forEach((el) => video.init(el))
