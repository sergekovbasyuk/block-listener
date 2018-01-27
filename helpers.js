const R = require('ramda')

exports.makeUrl = addrs =>
	`https://blockchain.info/ru/multiaddr?active=${R.join('|', addrs)}`