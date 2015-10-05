var riaktive = require( "riaktive" );
var sliver = require( "./sliver.js" )();
riaktive.setIdStrategy( sliver.getId.bind( sliver ) );

var EventStore = require( "./EventStore" );
var ActorStore = require( "./ActorStore" );

var cache = {
	events: {},
	actors: {}
};

module.exports = function( _config ) {
	var config = _config || {};

	var bucketPrefix = config.bucketPrefix || null;

	var riak;
	if ( config.db ) {
		riak = config.db;
	} else {
		riak = riaktive.connect( config.riak );
	}

	return {
		events: {
			create: function( actorType, config ) {
				config = config || {};
				if ( cache.events[ actorType ] ) {
					return cache.events[ actorType ];
				}

				config.bucketPrefix = bucketPrefix;

				var store = new EventStore( riak, actorType, config );

				cache.events[ actorType ] = store;

				return store;
			}
		},
		actors: {
			create: function( actorType, config ) {
				config = config || {};
				if ( cache.actors[ actorType ] ) {
					return cache.actors[ actorType ];
				}

				config.bucketPrefix = bucketPrefix;

				var store = new ActorStore( riak, actorType, config );

				cache.actors[ actorType ] = store;

				return store;
			}
		},
		riak: riak
	};
};
