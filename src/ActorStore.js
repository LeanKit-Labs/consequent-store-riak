var util = require( 'util' );
var _ = require( 'lodash' );
var when = require( 'when' );
var sliver = require( './sliver.js' )();

function ActorStore( db, type, _config ) {

	this.db = db;
	this.name = type;

	var config = _config || {};

	var eventBucketName = config.eventBucket || util.format( "%s_events", this.name.toLowerCase() );
	var eventPackBucketName = config.eventPackBucket || util.format( "%s_event_packs", this.name.toLowerCase() );

	var bucketConfig = {
		write_once: true
	};

	this.eventBucket = this.db.bucket( eventBucketName, bucketConfig );
	this.eventPackBucket = this.db.bucket( eventPackBucketName, bucketConfig );
}

ActorStore.prototype.getEventsFor = function( aggregateId, lastEventId ) {
	var indexValue = aggregateId + "-" + lastEventId;

	var onSuccess = function( results ) {
		var docs = results.docs.slice( 1 );
		return _.sortBy( docs, function( d ) {
			return d.id;
		} );
	};

	return this.eventBucket.getByIndex( "aggregate_event_id", indexValue, '~' )
		.then( onSuccess );
};

ActorStore.prototype.getEventPackFor = function( aggregateId, vectorClock ) {
	var indexValue = aggregateId + "-" + vectorClock;

	var onSuccess = function( results ) {
		var doc = results.docs;
		console.log( doc );
		return doc;
	// return _.sortBy( docs, function( d ) {
	// 	return d.id;
	// } );
	};

	return this.eventPackBucket.getByIndex( "aggregate_clock", indexValue )
		.then( onSuccess );
};

ActorStore.prototype.storeEvents = function( aggregateId, events ) {
	var doc;
	var indexes;

	var inserts = _.map( events, function( event ) {
		doc = {
			id: sliver.getId(),
			aggregate_id: aggregateId,
			event: event
		};

		indexes = {
			aggregate_id: aggregateId,
			aggregate_event_id: aggregateId + "-" + doc.id
		};

		return this.eventBucket.put( doc, indexes );
	}.bind( this ) );

	return when.all( inserts );
};

ActorStore.prototype.storeEventPack = function( aggregateId, vectorClock, events ) {
	var doc = {
		id: sliver.getId(),
		aggregate_id: aggregateId,
		events: events
	};

	var indexes = {
		aggregate_id: aggregateId,
		aggregate_clock: aggregateId + "-" + vectorClock,
		aggregate_pack_id: aggregateId + "-" + doc.id
	};

	return this.eventPackBucket.put( doc, indexes );
};

module.exports = ActorStore;
