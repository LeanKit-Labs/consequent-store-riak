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

	var riak = riaktive.connect( config.riak );

	return {
		events: {
			create: function( actorType, config ) {
				if ( cache.events[ actorType ] ) {
					return cache.events[ actorType ];
				}
				var store = new EventStore( riak, actorType, config );

				cache.events[ actorType ] = store;

				return store;
			}
		},
		actors: {
			create: function( actorType, config ) {
				if ( cache.actors[ actorType ] ) {
					return cache.actors[ actorType ];
				}
				var store = new ActorStore( riak, actorType, config );

				cache.actors[ actorType ] = store;

				return store;
			}
		},
		riak: riak
	};
};
