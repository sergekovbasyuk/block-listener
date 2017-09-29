const axios = require('axios')
const R = require('ramda')
const { MongoClient } = require('mongodb')

const addresses = [
  '1DeZBwwgxgeYH3ttEHGxQ2JW6KSeV4UvdK',
  '1MdvCCWicgid1tmdjw9HrfkT3es3pL4TU6',
  '13cVZhAXNx5k5uUzKL9BH6NjwMTWkKbXmu'
]

const makeUrl = addrs =>
  `https://blockchain.info/ru/multiaddr?active=${R.join('|', addrs)}`

MongoClient.connect('mongodb://localhost:27017/applicature')
  .then(db => axios.get(makeUrl(addresses))
    .then(R.path(['data', 'addresses']))
    .then(addrs => db.collection('addresses')
      // create index to avoid duplicates
      .createIndex({ address: 1 }, { unique: true })
        .then(db.collection('addresses').insertMany(addrs)
          .then(r => db.close()
            .then(console.log('Addresses saved to DB:', R.prop('insertedCount', r))))
          .catch(e => db.close()
            .then(console.log('Failed to add addresses to DB:', R.prop('message', e)))))))
  .catch(e => console.log('Error:', e))
