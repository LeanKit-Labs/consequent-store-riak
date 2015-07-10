/*
	var eventDoc = {
		aggregate_id: "",
		vectorClock: "", // ???
		payload: []
	};

	var eventPackDoc = {
		aggregate_id: "",
		vectorClock: "",
		events: []
	};
*/

var util = require( "util" );
var _ = require( "lodash" );
var when = require( "when" );
var sliver = require( "./sliver.js" )();

/**
 * Storage mechanism for events
 * @constructor
 * @param {object} db - Instance of Riaktive
 * @param {string} type - Name of event store
 * @params {object} _config - Configuration options for event store
*/

function EventStore( db, type, _config ) {
	this.db = db;
	this.name = type;

	var config = _config || {};

	var eventBucketName = config.eventBucket || util.format( "%s_events", this.name.toLowerCase() );
	var eventPackBucketName = config.eventPackBucket || util.format( "%s_event_packs", this.name.toLowerCase() );

	var bucketConfig = {
		bucket_type: config.eventBucketType || "default" // jshint ignore:line
	};

	this.eventBucket = this.db.bucket( eventBucketName, bucketConfig );
	this.eventPackBucket = this.db.bucket( eventPackBucketName, bucketConfig );

	this.getEventBucket = function() {
		return this.eventBucket;
	};

	this.getEventPackBucket = function() {
		return this.eventPackBucket;
	};
}

/**
 * Queries events for an actor since a given event id.
 * @param {string} aggregateId - The actor's id
 * @param {string} lastEventId - The lower bound for the event id query
 * @returns {array} Events since the last id, not including the last id
*/

EventStore.prototype.getEventsFor = function( aggregateId, lastEventId ) {
	var indexValue = aggregateId + "-" + lastEventId;

	var onSuccess = function( results ) {
		var docs = results.docs.slice( 1 );
		return _.sortBy( docs, function( d ) {
			return d.id;
		} );
	};

	return this.eventBucket.getByIndex( "aggregate_event_id", indexValue, "~" )
		.then( onSuccess );
};

/**
 * Stores a list of events as individual records related to the actor id
 * @param {string} aggregatId - The related actor's id
 * @params {array} events - Collection of events to store
 * @returns {array} Riak id's for inserted records
*/

EventStore.prototype.storeEvents = function( aggregateId, events ) {
	var doc;
	var indexes;

	var inserts = _.map( events, function( event ) {
		doc = {
			id: sliver.getId(),
			aggregate_id: aggregateId, // jshint ignore:line
			event: event
		};

		indexes = {
			aggregate_id: aggregateId, // jshint ignore:line
			aggregate_event_id: aggregateId + "-" + doc.id // jshint ignore:line
		};

		return this.eventBucket.put( doc, indexes );
	}.bind( this ) );

	return when.all( inserts );
};

/**
 * Queries an event pack for a specific version of an actor.
 * @param {string} aggregateId - The actor's id
 * @param {string} vectorClock - Actor version
 * @returns {array} Events from the retrieved event pack
*/

EventStore.prototype.getEventPackFor = function( aggregateId, vectorClock ) {
	var indexValue = aggregateId + "-" + vectorClock;

	var onSuccess = function( results ) {
		var events = results.docs[ 0 ].events;

		return _.sortBy( events, function( d ) {
			return d.id;
		} );
	};

	return this.eventPackBucket.getByIndex( "aggregate_clock", indexValue )
		.then( onSuccess );
};

/**
 * Stores a collection of events as a single record associated with a version of an actor
 * @param {string} aggregateId - The actor's id
 * @param {string} vectorClock - The actor's version
 * @param {array} events - Collection of events to store
 * @returns {string} Id of created recorded
*/

EventStore.prototype.storeEventPack = function( aggregateId, vectorClock, events ) {
	var doc = {
		id: sliver.getId(),
		aggregate_id: aggregateId, // jshint ignore:line
		events: events
	};

	var indexes = {
		aggregate_id: aggregateId, // jshint ignore:line
		aggregate_clock: aggregateId + "-" + vectorClock, // jshint ignore:line
		aggregate_pack_id: aggregateId + "-" + doc.id // jshint ignore:line
	};

	return this.eventPackBucket.put( doc, indexes );
};

module.exports = EventStore;
