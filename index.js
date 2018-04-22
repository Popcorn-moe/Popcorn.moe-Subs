import express from 'express'
import logger from 'morgan'
import Redis from 'ioredis'
import fs from 'fs'

const app = express()
const redis = new Redis()

app.use(logger('dev'))

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
	res.send(toSend)
})

const header = fs.readFileSync('header.txt').toString()

function insertHeader(content, info = {}) {
	const subber = (info.subber || 'Unknown') + (info.subber_link ? ' <' + info.subber_link + '>' : '')
	const insertion = header.replace('$INFO', info).replace('$SUBBER', subber)

	const index = content.indexOf('\n') + 1 //Insert after first \n\n
	return content.substring(0, index) + '\n' + insertion + content.substring(index)
}

function extractInfos(subs) {
	return JSON.parse(/{"info": {.+}}/.exec(subs)[0]).info;
}

app.listen(3333, () => console.log('Listening on port 3333'))

process.on('unhandledRejection', error =>
	console.error('unhandledRejection', error)
)
