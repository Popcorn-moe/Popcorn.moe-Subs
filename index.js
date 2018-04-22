import express from 'express'
import { graphqlExpress } from 'apollo-server-express'
import bodyParser from 'body-parser'
import logger from 'morgan'
import { MongoClient } from 'mongodb'

import schema from './src/schema'

const mongoUrl = 'mongodb://localhost:27017/popcornmoe_subs'
const app = express()

app.use(logger('dev'))

MongoClient.connect(mongoUrl).then(db => {
	const rootValue = { db }

	app.use('/graphql', bodyParser.json(), graphqlExpress({ schema, rootValue }))

	console.log('Connected on mongodb')
})

app.listen(3333, () => console.log('Listening on port 3333'))

process.on('unhandledRejection', error =>
	console.error('unhandledRejection', error)
)
