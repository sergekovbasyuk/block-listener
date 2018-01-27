const Agenda = require('agenda')
const config = require('config')
const { MongoClient } = require('mongodb')
const addAddresses = require('./addresses')
const getNewTxs = require('./transactions')

const blockListener = async () => {
	const addrHashes = config.get('addresses')
	const dbUrl = config.get('db.url')
	const dbName = config.get('db.name')
	const client = await MongoClient.connect(dbUrl)
	const db = client.db(dbName)
	const address = 'localhost:27017/agenda'
	const agenda = new Agenda({ db: { address }})

	const addresses = db.collection('addresses')
	const transactions = db.collection('transactions')
	// create index to avoid duplicates
	await addresses.createIndex({ address: 1 }, { unique: true })
	await transactions.createIndex({ hash: 1 }, { unique: true })
	
	agenda.define('add addresses to DB', () => addAddresses(addrHashes, addresses))
	agenda.define('get new transactions', () => getNewTxs(addrHashes, transactions))

	await new Promise(resolve => agenda.once('ready', resolve()))

	agenda.on('ready', () => {
		agenda.now('add addresses to DB')
		agenda.every('15 seconds', 'get new transactions')
		agenda.start()
	})
}

module.exports = blockListener