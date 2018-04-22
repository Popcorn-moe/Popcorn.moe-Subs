import express from 'express'
import logger from 'morgan'
import Redis from 'ioredis'
import fs from 'fs'
import bodyParser from 'body-parser'
import srtToVtt from 'srt-to-vtt'
import assToVtt from 'ass-to-vtt'
import str from 'string-to-stream'
import toString from 'stream-to-string'

const app = express()
const redis = new Redis()

app.use(logger('dev'))
app.use(bodyParser.urlencoded({ extended: false }))

app.get('/:anime/:season/:episode/:lang', async (req, res) => {
	const { anime, season, episode, lang } = req.params
	const content = await redis.get(`${anime}/${season}/${episode}/${lang}`)

	if (!content) {
		res.sendStatus(404)
		return
	}

	const info = extractInfos(content)
	const toSend = insertHeader(content, info)

	res.set('info', JSON.stringify(info))
	res.type('text')
	res.end(toSend)
})

const conversion = {
	vtt: content => content,
	ass: content => toString(str(content).pipe(assToVtt())),
	srt: content => toString(str(content).pipe(srtToVtt())) //is there a better way?
}

app.post('/:anime/:season/:episode/:lang', async (req, res) => {
	const { anime, season, episode, lang } = req.params

	const { info, content, type } = req.body
	const conv = conversion[type]

	if (!content || !type || !conv) {
		res.sendStatus(400)
		return
	}

	const converted = await conv(content)

	const i = info || extractInfos(converted) || {}

	const withInfo = info ? insertInfo(converted, i) : converted

	redis.set(`${anime}/${season}/${episode}/${lang}`, withInfo)

	res.set('info', JSON.stringify(info))
	res.type('text')
	res.end(withInfo)
})

const header = fs.readFileSync('header.txt').toString()

function insertHeader(content, info = {}) {
	const subber =
		(info.subber || 'Unknown') +
		(info.subber_link ? ' <' + info.subber_link + '>' : '')

	return insertNote(content, header.replace('$INFO', info).replace('$SUBBER', subber))
}

function insertInfo(content, info = {}) {
	return insertNote(content, `NOTE ${JSON.stringify({ info })}\n`)
}

function insertNote(content, insertion) {
	const index = content.indexOf('\n') + 1 //Insert after first \n
	return (
		content.substring(0, index) + '\n' + insertion + content.substring(index)
	)
}

function extractInfos(subs) {
	const res = /{"info": ?{.+}}/.exec(subs)
	if (!res) return
	let o
	try {
		o = JSON.parse(res[0])
	} catch (e) {
		return
	}
	return o && o.info
}

app.listen(3333, () => console.log('Listening on port 3333'))

process.on('unhandledRejection', error =>
	console.error('unhandledRejection', error)
)
