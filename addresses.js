const axios = require('axios')
const R = require('ramda')
const winston = require('winston')
const { makeUrl } = require('./helpers')

const addSelectedAddresses = async (addrHashes, collection) => {
	try {
		const response = await axios.get(makeUrl(addrHashes))
		const addressesFromResponse = R.path(['data', 'addresses'], response)
		const added = await collection.insertMany(addressesFromResponse)
		winston.info('Addresses saved to DB:', R.prop('insertedCount', added))
	}
	catch (error) {
		winston.error('Failed to add addresses to DB:', R.prop('message', error))
	}
}

module.exports = addSelectedAddresses
