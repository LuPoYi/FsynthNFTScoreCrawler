process.env.NTBA_FIX_319 = 1

const puppeteer = require('puppeteer')
const cheerio = require('cheerio')

// lowdb
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('db.json')
const db = low(adapter)
db.defaults({ scores: {} }).write()

URL = 'https://nft.fsynth.io/#/rarity/'

async function retry(promiseFactory, retryCount) {
  try {
    return await promiseFactory()
  } catch (error) {
    console.log('error', retryCount)
    if (retryCount <= 0) throw error

    return await retry(promiseFactory, retryCount - 1)
  }
}

async function getData(id) {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.goto(`${URL}${id}`)
  const data = await page.content()
  await browser.close()
  processData(id, data)
}

function processData(id, data) {
  const $ = cheerio.load(data)

  let score = $('#contents .label-large.label-aqua-rarity').text() // PUNK Score: 1681.228

  score = score.replace(/[^\d.]/g, '')
  console.log(id, score)

  let scores = db.get('scores').value()
  scores[id] = score

  db.set('scores', scores).write()
  db.set('lastID', id).write()
}

const forLoop = async () => {
  for (let i = 1; i < 9991; i++) {
    const scores = await db.get('scores').value()
    if (Object.keys(scores).includes(i.toString())) continue

    await retry(
      () => getData(i),
      10 // retry 10 times
    )
  }
}

forLoop()
