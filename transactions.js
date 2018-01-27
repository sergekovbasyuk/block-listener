const axios = require('axios')
const R = require('ramda')
const winston = require('winston')
const { makeUrl } = require('./helpers')

const getNewTxs = async (addrHashes, collection) => {
	try {
		const txsFromDb = await collection.find({}).sort({ time: -1 }).toArray()
		const getLastTxTime = x => R.not(R.isEmpty(x)) ? R.prop('time', R.head(x)) : 0
		const lastTxTime = getLastTxTime(txsFromDb)
		const url = makeUrl(addrHashes)
		const request = await axios.get(url)
		const isNew = x => R.lt(lastTxTime, R.prop('time', x))
		const getNewTxs = R.compose(R.filter(isNew), R.path(['data', 'txs']))
		const newTxs = getNewTxs(request)

		R.isEmpty(newTxs)
			? winston.info('No new transactions')
			: collection.insertMany(newTxs)
				.then(r => winston.info('New transactions saved to DB: ', R.prop('insertedCount', r)))
	}
	catch (error) {
		winston.info('Failed to add transactions to DB:', error)
	}
}

module.exports = getNewTxs


