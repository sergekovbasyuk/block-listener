const Agenda = require('agenda')
const axios = require('axios')
const { MongoClient } = require('mongodb')
const R = require('ramda')

async function getTxsJob() {
  const db = await MongoClient.connect('mongodb://localhost:27017/applicature')
  const agenda = new Agenda().mongo(db, 'jobs')
  const addrCollection = db.collection('addresses')
  const txsCollection = db.collection('transactions')
  const networkCollection = db.collection('network')

  // functions
  const getNetworkData = () =>
    axios.get('https://blockchain.info/q/latesthash')
      .then(r => networkCollection.updateOne(
          { type: 'bitcoin' },
          { $set: { lastProcessedBlock: R.prop('data', r) } },
          { upsert: true })
        .then(r => console.log('Network data update:', r.result))
        .catch(e => console.log(e)))

  const makeUrl = addrs =>
    `https://blockchain.info/ru/multiaddr?active=${R.join('|', addrs)}`

  const getAddrHashes = () =>
    addrCollection.find({}).toArray()
      .then(R.map(R.prop('address')))

  const getlastTx = () =>
    txsCollection.find({}).sort({ time: -1 }).toArray()
      .then(x => R.not(R.isEmpty(x)) ? R.prop('time', R.head(x)) : 0)

  const getTxs = () =>
    getAddrHashes()
      .then(makeUrl)
      .then(url => axios.get(url)
        .then(R.path(['data', 'txs']))
        .then(txs => getlastTx()
          // filter transactions based on last transaction from DB
          .then(lastTxTime => R.filter(x => R.prop('time', x) > lastTxTime, txs))
          .then(newTxs => R.not(R.isEmpty(newTxs))
            // create index to avoid duplicates
            ? txsCollection.createIndex({ hash: 1 }, { unique: true })
              .then(txsCollection.insertMany(newTxs)
                .then(r => console.log('New transactions saved to DB: ', R.prop('insertedCount', r)))
                .catch(e => console.log('Failed to add transactions to DB:', R.prop('message', e))))
            : console.log('No new transactions'))))

  // job definition
  agenda.define('get new transactions', () => {
    getNetworkData()
    getTxs()
  })

  // Wait for agenda to connect
  await new Promise(resolve => agenda.once('ready', resolve()))

  agenda.on('ready', () => {
    console.log('Starting job...')
    agenda.every('5 seconds', 'get new transactions')
    agenda.start()
  })
}

getTxsJob().catch(e => {
  console.error(e)
  process.exit(-1)
})
