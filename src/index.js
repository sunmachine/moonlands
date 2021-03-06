const {Writable} = require('stream');
const EventEmitter = require('events');
const nanoid = require('nanoid');

const {
	/* eslint-disable no-unused-vars */
	TYPE_CREATURE,
	TYPE_MAGI,
	TYPE_RELIC,
	TYPE_SPELL,

	PREPARATION_ACTION_CHOOSE_MAGI,
	PREPARATION_ACTION_CHOOSE_STARTING_CARDS,

	ACTION_DRAW,
	ACTION_PASS,
	ACTION_PLAY,
	ACTION_POWER,
	ACTION_EFFECT,
	ACTION_SELECT,
	ACTION_CALCULATE,
	ACTION_ENTER_PROMPT,
	ACTION_RESOLVE_PROMPT,
	ACTION_GET_PROPERTY_VALUE,
	ACTION_ATTACK,
	ACTION_RESHUFFLE_DISCARD,
	ACTION_PLAYER_WINS,

	ACTION_PROPERTY,

	PROPERTY_ID,
	PROPERTY_TYPE,
	PROPERTY_CONTROLLER,
	PROPERTY_ENERGY_COUNT,
	PROPERTY_REGION,
	PROPERTY_COST,
	PROPERTY_ENERGIZE,
	PROPERTY_STARTING_ENERGY,
	PROPERTY_MAGI_STARTING_ENERGY,
	PROPERTY_ATTACKS_PER_TURN,
	PROPERTY_CAN_ATTACK_MAGI_DIRECTLY,

	CALCULATION_SET,
	CALCULATION_DOUBLE,
	CALCULATION_ADD,
	CALCULATION_SUBTRACT,
	CALCULATION_HALVE_ROUND_DOWN,
	CALCULATION_HALVE_ROUND_UP,
	CALCULATION_MIN,
	CALCULATION_MAX,

	SELECTOR_CREATURES,
	SELECTOR_MAGI,
	SELECTOR_CREATURES_AND_MAGI,
	SELECTOR_RELICS,
	SELECTOR_OWN_MAGI,
	SELECTOR_ENEMY_MAGI,
	SELECTOR_ACTIVE_MAGI_OF_PLAYER,
	SELECTOR_CREATURES_OF_REGION,
	SELECTOR_CREATURES_NOT_OF_REGION,
	SELECTOR_OWN_CREATURES,
	SELECTOR_ENEMY_CREATURES,
	SELECTOR_TOP_MAGI_OF_PILE,
	SELECTOR_MAGI_OF_REGION,
	SELECTOR_OPPONENT_ID,
	SELECTOR_MAGI_NOT_OF_REGION,
	SELECTOR_OWN_CARDS_WITH_ENERGIZE_RATE,
	SELECTOR_CARDS_WITH_ENERGIZE_RATE,
	SELECTOR_OWN_CARDS_IN_PLAY,
	SELECTOR_CREATURES_OF_TYPE,
	SELECTOR_CREATURES_NOT_OF_TYPE,
	SELECTOR_OWN_CREATURES_OF_TYPE,

	PROMPT_TYPE_NUMBER,
	PROMPT_TYPE_SINGLE_CREATURE,
	PROMPT_TYPE_SINGLE_MAGI,
	PROMPT_TYPE_ANY_CREATURE_EXCEPT_SOURCE,
	PROMPT_TYPE_OWN_SINGLE_CREATURE,
	PROMPT_TYPE_SINGLE_CREATURE_FILTERED,
	PROMPT_TYPE_SINGLE_CREATURE_OR_MAGI,
	PROMPT_TYPE_CHOOSE_CARDS,
	PROMPT_TYPE_CHOOSE_N_CARDS_FROM_ZONE,

	NO_PRIORITY,
	PRIORITY_PRS,
	PRIORITY_ATTACK,
	PRIORITY_CREATURES,

	EFFECT_TYPE_DRAW,
	EFFECT_TYPE_RESHUFFLE_DISCARD,
	EFFECT_TYPE_MOVE_ENERGY,
	EFFECT_TYPE_ROLL_DIE,
	EFFECT_TYPE_PLAY_CREATURE,
	EFFECT_TYPE_PLAY_RELIC,
	EFFECT_TYPE_PLAY_SPELL,
	EFFECT_TYPE_DAMAGE_STEP,
	EFFECT_TYPE_CREATURE_ENTERS_PLAY,
	EFFECT_TYPE_RELIC_ENTERS_PLAY,
	EFFECT_TYPE_MAGI_IS_DEFEATED,
	EFFECT_TYPE_DISCARD_ENERGY_FROM_MAGI,
	EFFECT_TYPE_PAYING_ENERGY_FOR_CREATURE,
	EFFECT_TYPE_PAYING_ENERGY_FOR_RELIC,
	EFFECT_TYPE_PAYING_ENERGY_FOR_SPELL,
	EFFECT_TYPE_MOVE_CARD_BETWEEN_ZONES,
	EFFECT_TYPE_CARD_MOVED_BETWEEN_ZONES,
	EFFECT_TYPE_STARTING_ENERGY_ON_CREATURE,
	EFFECT_TYPE_ADD_ENERGY_TO_CREATURE_OR_MAGI,
	EFFECT_TYPE_ADD_ENERGY_TO_CREATURE,
	EFFECT_TYPE_ADD_ENERGY_TO_MAGI,
	EFFECT_TYPE_ENERGIZE,
	EFFECT_TYPE_DEFEAT_MAGI,
	EFFECT_TYPE_DISCARD_ENERGY_FROM_CREATURE,
	EFFECT_TYPE_DISCARD_CREATURE_OR_RELIC,
	EFFECT_TYPE_DISCARD_CREATURE_FROM_PLAY,
	EFFECT_TYPE_DISCARD_RELIC_FROM_PLAY,
	EFFECT_TYPE_RESTORE_CREATURE_TO_STARTING_ENERGY,
	EFFECT_TYPE_PAYING_ENERGY_FOR_POWER,
	EFFECT_TYPE_DISCARD_ENERGY_FROM_CREATURE_OR_MAGI,
	EFFECT_TYPE_CREATURE_DEFEATS_CREATURE,
	EFFECT_TYPE_CREATURE_IS_DEFEATED, // Possibly redundant
	EFFECT_TYPE_BEFORE_DAMAGE,
	EFFECT_TYPE_ATTACKER_DEALS_DAMAGE,
	EFFECT_TYPE_DEFENDER_DEALS_DAMAGE,
	EFFECT_TYPE_DEAL_DAMAGE,
	EFFECT_TYPE_AFTER_DAMAGE,
	EFFECT_TYPE_CREATURE_ATTACKS,
	EFFECT_TYPE_CREATURE_IS_ATTACKED,
	EFFECT_TYPE_START_OF_TURN,
	EFFECT_TYPE_END_OF_TURN,
	EFFECT_TYPE_MAGI_FLIPPED,
	EFFECT_TYPE_FIND_STARTING_CARDS,
	EFFECT_TYPE_DRAW_REST_OF_CARDS,
	EFFECT_TYPE_DISCARD_CARDS_FROM_HAND,

	REGION_UNIVERSAL,

	COST_X,
	
	ZONE_TYPE_HAND,
	ZONE_TYPE_IN_PLAY,
	ZONE_TYPE_DISCARD,
	ZONE_TYPE_ACTIVE_MAGI,
	ZONE_TYPE_MAGI_PILE,
	ZONE_TYPE_DECK,
	ZONE_TYPE_DEFEATED_MAGI,
	/* eslint-enable no-unused-vars */
} = require('./const');

const {showAction} = require('./logAction');
const {byName} = require('./cards');
const CardInGame = require('./classes/CardInGame');
const Zone = require('./classes/Zone');

function clone(item) {
	if (!item) { return item; } // null, undefined values check

	var types = [ Number, String, Boolean ], 
		result;

	// normalizing primitives if someone did new String('aaa'), or new Number('444');
	types.forEach(function(type) {
		if (item instanceof type) {
			result = type( item );
		}
	});

	if (typeof result == 'undefined') {
		if (Object.prototype.toString.call( item ) === '[object Array]') {
			result = [];
			item.forEach(function(child, index) { 
				result[index] = clone( child );
			});
		} else if (typeof item == 'object') {
			// testing that this is DOM
			if (item.nodeType && typeof item.cloneNode == 'function') {
				result = item.cloneNode( true );    
			} else if (!item.prototype) { // check that this is a literal
				if (item instanceof Date) {
					result = new Date(item);
				} else {
					// it is an object literal
					result = {};
					for (var i in item) {
						result[i] = clone( item[i] );
					}
				}
			} else {
				// depending what you would like here,
				// just keep the reference, or create new object
				// if (false && item.constructor) {
				// 	// would not advice to do that, reason? Read below
				// 	result = new item.constructor();
				// } else {
				result = item;
				// }
			}
		} else {
			result = item;
		}
	}

	return result;
}

const steps = [
	{
		name: 'Energize',
		priority: NO_PRIORITY,
		automatic: true,
		effects: [
			{
				type: ACTION_SELECT,
				selector: SELECTOR_OWN_CARDS_WITH_ENERGIZE_RATE,
				variable: 'energize', 
			},
			{
				type: ACTION_EFFECT,
				effectType: EFFECT_TYPE_ENERGIZE,
				target: '$energize',
			},
		],
	},
	{
		name: 'Powers/Relics/Spells',
		priority: PRIORITY_PRS,
	},
	{
		name: 'Attack',
		priority: PRIORITY_ATTACK,
	},
	{
		name: 'Play Dream Creatures',
		priority: PRIORITY_CREATURES,
	},
	{
		name: 'Powers/Relics/Spells',
		priority: PRIORITY_PRS,
	},
	{
		name: 'Draw',
		priority: NO_PRIORITY,
		automatic: true,
		effects: [
			{
				type: ACTION_EFFECT,
				effectType: EFFECT_TYPE_DRAW,
			},
			{
				type: ACTION_EFFECT,
				effectType: EFFECT_TYPE_DRAW,
			},
		],
	},
];

const defaultState = {
	actions: [],
	savedActions: [],
	activePlayer: 0,
	prompt: false,
	promptType: null,
	promptParams: {},
	step: 0,
	zones: [],
	players: [],
};

const oneOrSeveral = (targets, callback) => {
	if (targets instanceof Array) {
		if (targets.length > 0) {
			targets.forEach(target => callback(target));
		}
	} else {
		callback(targets);
	}
};

class State {
	constructor(state) {
		this.state = {
			...clone(defaultState),
			spellMetaData: {},
			...state,
		};

		this.players = [0, 1]; // For simple testing
		this.decks = [];
		this.winner = false;
		this.debug = false;
		this.actionsOne = [];
		this.actionsTwo = [];

		this.actionStreamOne = new EventEmitter();
		this.actionStreamTwo = new EventEmitter();

		this.commandStream = new Writable({
			encoding: 'utf-8',
			objectMode: true,
			write: command => {
				if (Object.prototype.hasOwnProperty.call(command, 'type')) {
					this.update(command);
				}
			},
		});
	}

	closeStreams() {
		this.actionStreamOne.destroy();
		this.commandStream.destroy();
	}

	addActionToStream(action) {

		this.actionsOne.unshift(action);
		this.actionsTwo.unshift(action);

		// Do not send outside CALCULATE, SELECT and so on
		if (![ACTION_CALCULATE, ACTION_SELECT, ACTION_GET_PROPERTY_VALUE].includes(action.type)) {
			this.actionStreamOne.emit('action', action);
			this.actionStreamTwo.emit('action', action);
		}
	}

	enableDebug() {
		this.debug = true;
	}

	setWinner(player) {
		this.winner = player;
	}

	hasWinner() {
		return this.winner === null;
	}

	setPlayers(player1, player2) {
		this.players = [player1, player2];

		return this;
	}

	setDeck(player, cardNames) {
		if (this.players.includes(player)) {
			const deck = cardNames.map(card => new CardInGame(byName(card), player));
			this.decks.push({
				player,
				deck,
			});
		} else {
			throw new Error(`Non-existing player: ${player}`);
		}
	}

	createZones() {
		const [playerOne, playerTwo] = this.players;

		return [
			new Zone('Player 1 hand', ZONE_TYPE_HAND, playerOne),
			new Zone('Player 2 hand', ZONE_TYPE_HAND, playerTwo),
			new Zone('Player 1 deck', ZONE_TYPE_DECK, playerOne),
			new Zone('Player 2 deck', ZONE_TYPE_DECK, playerTwo),
			new Zone('Player 1 discard', ZONE_TYPE_DISCARD, playerOne),
			new Zone('Player 2 discard', ZONE_TYPE_DISCARD, playerTwo),
			new Zone('Player 1 active magi', ZONE_TYPE_ACTIVE_MAGI, playerOne),
			new Zone('Player 2 active magi', ZONE_TYPE_ACTIVE_MAGI, playerTwo),
			new Zone('Player 1 magi pile', ZONE_TYPE_MAGI_PILE, playerOne),
			new Zone('Player 2 magi pile', ZONE_TYPE_MAGI_PILE, playerTwo),
			new Zone('Player 1 magi pile', ZONE_TYPE_DEFEATED_MAGI, playerOne),
			new Zone('Player 2 magi pile', ZONE_TYPE_DEFEATED_MAGI, playerTwo),
			new Zone('In play', ZONE_TYPE_IN_PLAY, null),
		];		
	}

	serializeData(playerId) {
		return {
			zones: this.serializeZones(playerId),
			step: this.state.step,
			turn: this.state.turn,
			goesFirst: this.state.goesFirst,
			activePlayer: this.state.activePlayer,
			prompt: this.state.prompt,
			promptType: this.state.promptType,
			promptMessage: this.state.promptMessage,
			promptPlayer: this.state.promptPlayer,
			promptGeneratedBy: this.state.promptGeneratedBy,
			promptParams: this.state.promptParams,
		};
	}

	serializeZones(playerId) {
		const opponentId = this.getOpponent(playerId);
		return {
			playerHand: this.getZone(ZONE_TYPE_HAND, playerId).serialize(),
			opponentHand: this.getZone(ZONE_TYPE_HAND, opponentId).serialize(),
			playerDeck: this.getZone(ZONE_TYPE_DECK, playerId).serialize(),
			opponentDeck: this.getZone(ZONE_TYPE_DECK, opponentId).serialize(),
			playerActiveMagi: this.getZone(ZONE_TYPE_ACTIVE_MAGI, playerId).serialize(),
			opponentActiveMagi: this.getZone(ZONE_TYPE_ACTIVE_MAGI, opponentId).serialize(),
			playerMagiPile: this.getZone(ZONE_TYPE_MAGI_PILE, playerId).serialize(),
			opponentMagiPile: this.getZone(ZONE_TYPE_MAGI_PILE, opponentId).serialize(),
			playerInPlay: this.getZone(ZONE_TYPE_IN_PLAY).cards.filter(c => c.data.controller == playerId).map(c => c.serialize()),
			opponentInPlay: this.getZone(ZONE_TYPE_IN_PLAY).cards.filter(c => c.data.controller == opponentId).map(c => c.serialize()),
			playerDefeatedMagi: this.getZone(ZONE_TYPE_DEFEATED_MAGI, playerId).serialize(),
			opponentDefeatedMagi: this.getZone(ZONE_TYPE_DEFEATED_MAGI, opponentId).serialize(),
			playerDiscard: this.getZone(ZONE_TYPE_DISCARD, playerId).serialize(),
			opponentDiscard: this.getZone(ZONE_TYPE_DISCARD, opponentId).serialize(),
		};
	}

	setup() {
		if (this.players.length < 2) {
			throw new Error('Not enough players');
		}
		if (this.decks.length < 2) {
			throw new Error('Not enough decks for players');
		}

		const zones = this.state.zones.length == 0 ? this.createZones() : this.state.zones;

		this.state.zones = zones;

		this.decks.forEach(({player, deck}) => {
			const magi = deck.filter(card => card.card.type === TYPE_MAGI);
			const rest = deck.filter(card => card.card.type != TYPE_MAGI);

			this.getZone(ZONE_TYPE_MAGI_PILE, player).add(magi);
			this.getZone(ZONE_TYPE_DECK, player).add(rest).shuffle();
		});
		
		const goesFirst = this.players[(Math.random() > 0.5 ? 0: 1)];

		this.state = {
			...this.state,
			zones,
			step: null,
			turn: 1,
			goesFirst,
			activePlayer: goesFirst,
		};
	}

	getOpponent(player) {
		return this.players.find(pl => pl != player);
	}

	getZone(type, player = null) {
		return this.state.zones.find(zone => zone.type === type && (zone.player == player || player == null)) || {cards: []};
	}

	getCurrentStep() {
		return this.state.step;
	}

	getActivePlayer() {
		return this.state.activePlayer;
	}

	getCurrentPriority() {
		return steps[this.state.step].priority;
	}

	addActions() {
		this.state.actions.push(...arguments);
	}

	transformIntoActions() {
		this.state.actions.unshift(...arguments);
	}

	getNextAction() {
		return this.state.actions.shift();
	}
    
	hasActions() {
		return this.state.actions.length > 0;
	}

	setSpellMetadata(metadata, spellId) {
		this.state = {
			...this.state,
			spellMetaData: {
				...this.state.spellMetaData,
				[spellId]: metadata,
			}
		};
	}

	getSpellMetadata(spellId) {
		return this.state.spellMetaData[spellId] ? this.state.spellMetaData[spellId] : {};
	}

	setSpellMetaDataField(field, value, spellId) {
		if (!spellId) {
			throw new Error('Saving spell metadata field without spellId');
		}
		const metaData = this.getSpellMetadata(spellId);
		this.setSpellMetadata({
			...metaData,
			[field]: value,			
		}, spellId);
	}

	getMetaValue(value, spellId) {
		if (
			typeof value == 'string' &&
            value[0] == '$'
		) {
			const variableName = value.slice(1);
			const spellMetaData = this.getSpellMetadata(spellId);
			return Object.prototype.hasOwnProperty.call(spellMetaData,variableName) ? spellMetaData[variableName] : null;
		} else {
			return value;
		}
	}

	/**
     * Same as getMetaValue, but instead of $-variables it uses %-variables
     * $-variables are kept intact, we probably need them
     * %-variables include usual "self": link to trigger source
     */
	prepareMetaValue(value, action, self, spellId) {
		if (value === '%self') return self;

		if (
			typeof value == 'string' &&
            value[0] == '%'
		) {
			const variableName = value.slice(1);

			// %-variables first refer to action's properties
			if (action[variableName]) return action[variableName];

			// if not, we use spellMetaData
			const spellMetaData = this.getSpellMetadata(spellId);
			return Object.prototype.hasOwnProperty.call(spellMetaData,variableName) ? spellMetaData[variableName] : null;
		} else {
			return value;
		}
	}

	useSelector(selector, player, argument) {
		switch (selector) {
			case SELECTOR_OWN_CARDS_IN_PLAY: {
				return this.getZone(ZONE_TYPE_IN_PLAY).cards
					.filter(card => this.modifyByStaticAbilities(card, PROPERTY_CONTROLLER) == player);
			}
			case SELECTOR_RELICS: {
				return this.getZone(ZONE_TYPE_IN_PLAY).cards.filter(card => card.card.type == TYPE_RELIC);
			}
			case SELECTOR_OWN_CARDS_WITH_ENERGIZE_RATE: {
				return [
					...this.getZone(ZONE_TYPE_IN_PLAY).cards
						.filter(card => this.modifyByStaticAbilities(card, PROPERTY_CONTROLLER) == player && this.modifyByStaticAbilities(card, PROPERTY_ENERGIZE) > 0),
					...this.getZone(ZONE_TYPE_ACTIVE_MAGI, player).cards
						.filter(card => this.modifyByStaticAbilities(card, PROPERTY_ENERGIZE) > 0),
				];
			}
			case SELECTOR_CARDS_WITH_ENERGIZE_RATE: {
				return [
					...this.getZone(ZONE_TYPE_IN_PLAY).cards.filter(card => this.modifyByStaticAbilities(card, PROPERTY_ENERGIZE) > 0),
					...this.getZone(ZONE_TYPE_ACTIVE_MAGI, this.players[0]).cards.filter(card => this.modifyByStaticAbilities(card, PROPERTY_ENERGIZE) > 0),
					...this.getZone(ZONE_TYPE_ACTIVE_MAGI, this.players[1]).cards.filter(card => this.modifyByStaticAbilities(card, PROPERTY_ENERGIZE) > 0),
				];
			}
			case SELECTOR_OPPONENT_ID:
				return this.players.find(id => id != argument);
			case SELECTOR_CREATURES:
				return this.getZone(ZONE_TYPE_IN_PLAY).cards.filter(card => card.card.type == TYPE_CREATURE);
			case SELECTOR_MAGI:
				return [
					...this.getZone(ZONE_TYPE_ACTIVE_MAGI, this.players[0]).cards,
					...this.getZone(ZONE_TYPE_ACTIVE_MAGI, this.players[1]).cards,
				].filter(Boolean);
			case SELECTOR_TOP_MAGI_OF_PILE: {
				const topMagi = this.getZone(ZONE_TYPE_MAGI_PILE, player).cards[0];
				return [topMagi]; // Selectors always have to return array
			}
			case SELECTOR_OWN_MAGI:
				return this.getZone(ZONE_TYPE_ACTIVE_MAGI, player).cards;
			case SELECTOR_ENEMY_MAGI:
				return this.getZone(ZONE_TYPE_ACTIVE_MAGI, this.getOpponent(player)).cards;
			case SELECTOR_OWN_CREATURES:
				return this.getZone(ZONE_TYPE_IN_PLAY).cards.filter(card => this.modifyByStaticAbilities(card, PROPERTY_CONTROLLER) == player && card.card.type == TYPE_CREATURE);
			case SELECTOR_ENEMY_CREATURES:
				return this.getZone(ZONE_TYPE_IN_PLAY).cards.filter(card => this.modifyByStaticAbilities(card, PROPERTY_CONTROLLER) != player && card.card.type == TYPE_CREATURE);
			case SELECTOR_CREATURES_OF_REGION:
				return this.getZone(ZONE_TYPE_IN_PLAY).cards.filter(card => this.modifyByStaticAbilities(card, PROPERTY_REGION) == argument && card.card.type == TYPE_CREATURE);
			case SELECTOR_CREATURES_NOT_OF_REGION:
				return this.getZone(ZONE_TYPE_IN_PLAY).cards.filter(card => this.modifyByStaticAbilities(card, PROPERTY_REGION) != argument && card.card.type == TYPE_CREATURE);
			case SELECTOR_CREATURES_OF_TYPE:
				return this.getZone(ZONE_TYPE_IN_PLAY).cards.filter(card => card.card.name.split(' ').includes(argument) && card.card.type == TYPE_CREATURE);
			case SELECTOR_CREATURES_NOT_OF_TYPE:
				return this.getZone(ZONE_TYPE_IN_PLAY).cards.filter(card => !card.card.name.split(' ').includes(argument) && card.card.type == TYPE_CREATURE);
			case SELECTOR_OWN_CREATURES_OF_TYPE:
				return this.getZone(ZONE_TYPE_IN_PLAY).cards.filter(card =>
					this.modifyByStaticAbilities(card, PROPERTY_CONTROLLER) == player &&
					card.card.type == TYPE_CREATURE &&
					card.card.name.split(' ').includes(argument)
				);
		}
	}

	getByProperty(target, property) {
		switch(property) {
			case PROPERTY_ID:
				return target.id;
			case PROPERTY_TYPE:
				return target.card.type;
			case PROPERTY_CONTROLLER:
				return target.data.controller;
			case PROPERTY_ENERGY_COUNT:
				return target.data.energy;
			case PROPERTY_ATTACKS_PER_TURN:
				return target.card.data.attacksPerTurn;
			case PROPERTY_COST:
				return target.card.cost;
			case PROPERTY_ENERGIZE:
				return target.card.data.energize;
			case PROPERTY_REGION:
				return target.card.region;
			case PROPERTY_CAN_ATTACK_MAGI_DIRECTLY:
				return target.card.data.canAttackMagiDirectly;
			case PROPERTY_MAGI_STARTING_ENERGY:
				return target.card.data.startingEnergy;
		}
	}

	modifyByStaticAbilities(target, property) {
		const PLAYER_ONE = this.players[0];
		const PLAYER_TWO = this.players[1];

		// gathering static abilities from the field, adding players to them
		const allZonesCards = [
			...this.getZone(ZONE_TYPE_IN_PLAY).cards,
			...this.getZone(ZONE_TYPE_ACTIVE_MAGI, PLAYER_ONE).cards,
			...this.getZone(ZONE_TYPE_ACTIVE_MAGI, PLAYER_TWO).cards,
		];

		const zoneAbilities = allZonesCards.reduce(
			(acc, cardInPlay) => cardInPlay.card.data.staticAbilities ? [
				...acc,
				...(cardInPlay.card.data.staticAbilities.filter(a => a.property == property).map(a => ({...a, player: cardInPlay.data.controller})))
			] : acc,
			[],
		);
		const staticAbilities = [...zoneAbilities]; // @TODO static abilities of Magi

		let initialValue = this.getByProperty(target, property);

		staticAbilities.forEach(staticAbility => {
			const selected = this.useSelector(staticAbility.selector, staticAbility.player, staticAbility.selectorParameter);
			if (selected.includes(target) && staticAbility.modifier) {
				const {operator, operandOne} = staticAbility.modifier;
				initialValue = this.performCalculation(operator, operandOne, initialValue);
			}
		});

		return initialValue;
	}

	getObjectOrSelf(action, self, object, property) {
		if (object == 'self') {
			return self;
		}

		return property ? this.getMetaValue(action[object], action.generatedBy) : object;
	}

	replaceByReplacementEffect(action) {
		const PLAYER_ONE = this.players[0];
		const PLAYER_TWO = this.players[1];
		const allZonesCards = [
			...(this.getZone(ZONE_TYPE_IN_PLAY) || {cards: []}).cards,
			...(this.getZone(ZONE_TYPE_ACTIVE_MAGI, PLAYER_ONE)).cards,
			...(this.getZone(ZONE_TYPE_ACTIVE_MAGI, PLAYER_TWO)).cards,
		];

		const zoneReplacements = allZonesCards.reduce(
			(acc, cardInPlay) => cardInPlay.card.data.replacementEffects ? [
				...acc,
				...cardInPlay.card.data.replacementEffects.map(effect => ({...effect, self: cardInPlay})),
			] : acc,
			[],
		);

		let replacementFound = false;
		let appliedReplacerId = null;
		let replaceWith = null;
		zoneReplacements.forEach(replacer => {
			const replacerId = replacer.self.id; // Not really, but will work for now
            
			if (action.replacedBy && action.replacedBy.includes(replacerId)) {
				return false;
			}

			if (this.matchAction(action, replacer.find, replacer.self)) {
				replacementFound = true;
				appliedReplacerId = replacerId;
				replaceWith = replacer.replaceWith;
			}
		});

		const previouslyReplacedBy = action.replacedBy || [];

		if (replacementFound) {
			return {
				type: ACTION_EFFECT,
				...replaceWith,
				replacedBy: [
					...previouslyReplacedBy,
					appliedReplacerId,
				],
			};
		}

		return action;
	}

	matchAction(action, find, self) {
		if (action.effectType !== find.effectType) {
			return false;
		}

		const conditions = find.conditions.map(condition => {
			const objectOne = this.getObjectOrSelf(action, self, condition.objectOne, condition.propertyOne);
			const objectTwo = this.getObjectOrSelf(action, self, condition.objectTwo, condition.propertyTwo);

			const operandOne = (condition.propertyOne && condition.propertyOne !== ACTION_PROPERTY) ? this.modifyByStaticAbilities(objectOne, condition.propertyOne) : objectOne;

			const operandTwo = (condition.propertyTwo && condition.propertyTwo !== ACTION_PROPERTY) ? this.modifyByStaticAbilities(objectTwo, condition.propertyTwo) : objectTwo;

			switch (condition.comparator) {
				case '!=':
					return operandOne !== operandTwo;
				case '=':
					return operandOne == operandTwo;
				case '>':
					return operandOne > operandTwo;
				case '<':
					return operandOne < operandTwo;
				case '>=':
					return operandOne >= operandTwo;
				case '<=':
					return operandOne <= operandTwo;
			}

			return false;
		});

		return conditions.every(result => result === true);
	}

	triggerAbilities(action) {
		const PLAYER_ONE = this.players[0];
		const PLAYER_TWO = this.players[1];
		const allZonesCards = [
			...(this.getZone(ZONE_TYPE_IN_PLAY) || {cards: []}).cards,
			...(this.getZone(ZONE_TYPE_ACTIVE_MAGI, PLAYER_ONE) || {cards: []}).cards,
			...(this.getZone(ZONE_TYPE_ACTIVE_MAGI, PLAYER_TWO) || {cards: []}).cards,
		];

		const triggerEffects = allZonesCards.reduce(
			(acc, cardInPlay) => cardInPlay.card.data.triggerEffects ? [
				...acc,
				...cardInPlay.card.data.triggerEffects.map(effect => ({...effect, self: cardInPlay})),
			] : acc,
			[],
		);
		triggerEffects.forEach(replacer => {
			const triggeredId = replacer.self.id; // Not really, but will work for now

			if (this.matchAction(action, replacer.find, replacer.self)) {
				// Turn effect-templates into actual effect actions by preparing meta-values
				const preparedEffects = replacer.effects.map(effect => {
					let resultEffect =  {
						type: effect.type || ACTION_EFFECT,
						effectType: effect.effectType, // Do we need to replace this? Maybe later
						generatedBy: action.generatedBy,
						triggeredId: [triggeredId],
						player: replacer.self.data.controller,
					};

					// prepare %-values on created action
					Object.keys(effect)
						.filter(key => !['type', 'effectType'].includes(key))
						.forEach(key => {
							const value = this.prepareMetaValue(effect[key], action, replacer.self, action.generatedBy);
							resultEffect[key] = value;
						});
                    
					return resultEffect;
				});

				this.transformIntoActions(...preparedEffects);
			}
		});
	}

	performCalculation(operator, operandOne, operandTwo) {
		let result;
		switch (operator) {
			case CALCULATION_SET: {
				result = operandOne;
				break;
			}
			case CALCULATION_DOUBLE: {
				result = operandOne * 2;
				break;
			}
			case CALCULATION_ADD: {
				result = operandOne + operandTwo;
				break;
			}
			case CALCULATION_SUBTRACT: {
				result = operandOne - operandTwo;
				break;
			}
			case CALCULATION_HALVE_ROUND_DOWN: {
				result = Math.floor(operandOne / 2);
				break;
			}
			case CALCULATION_HALVE_ROUND_UP: {
				result = Math.ceil(operandOne / 2);
				break;
			}
			case CALCULATION_MIN: {
				result = Math.min(operandOne, operandTwo);
				break;
			}
			case CALCULATION_MAX: {
				result = Math.max(operandOne, operandTwo);
				break;
			}
		}

		return result;
	}

	update(initialAction) {
		if (this.hasWinner()) {
			return false;
		}
		this.addActions(initialAction);
		while (this.hasActions()) {
			const rawAction = this.getNextAction();
			const action = this.replaceByReplacementEffect(rawAction);

			if (this.debug) {
				showAction(action);
			}

			this.addActionToStream(action);

			this.triggerAbilities(action);

			switch (action.type) {
				case ACTION_PLAYER_WINS: {
					this.setWinner(action.player);
					this.state.actions = [];
					break;
				}
				case ACTION_ATTACK: {
					/*
							source
							target

							---

							BEFORE_DAMAGE,
							DEAL_DAMAGE,
							DEAL_DAMAGE,
							AFTER_DAMAGE,
						*/
					const attackSource = this.getMetaValue(action.source, action.generatedBy);
					const attackTarget = this.getMetaValue(action.target, action.generatedBy);

					const sourceAttacksPerTurn = this.modifyByStaticAbilities(attackSource, PROPERTY_ATTACKS_PER_TURN);
					const sourceHasAttacksLeft = attackSource.data.attacked < sourceAttacksPerTurn;
					const targetIsMagi = attackTarget.card.type == TYPE_MAGI;
					const magiHasCreatures = this.useSelector(SELECTOR_OWN_CREATURES, attackTarget.owner).length > 0;

					const attackApproved = !targetIsMagi || ( // Either we attack a creature
						targetIsMagi && ( // Or we are attacking a magi, but then...
							!magiHasCreatures || // ...he either shouldn't have creatures
								this.modifyByStaticAbilities(attackSource, PROPERTY_CAN_ATTACK_MAGI_DIRECTLY) // ...or we can just trample through
						)
					);

					if (sourceHasAttacksLeft && attackApproved && this.getCurrentPriority() == PRIORITY_ATTACK) {
						const attackSequence = [
							{
								type: ACTION_EFFECT,
								effectType: EFFECT_TYPE_CREATURE_ATTACKS,
								source: attackSource,
								sourceAtStart: attackSource.copy(),
								target: attackTarget,
								targetAtStart: attackTarget.copy(),
								generatedBy: attackSource.id,
							},
							{
								type: ACTION_EFFECT,
								effectType: EFFECT_TYPE_BEFORE_DAMAGE,
								source: attackSource,
								sourceAtStart: attackSource.copy(),
								target: attackTarget,
								targetAtStart: attackTarget.copy(),
								generatedBy: attackSource.id,
							},
							{
								type: ACTION_EFFECT,
								effectType: EFFECT_TYPE_DAMAGE_STEP,
								source: attackSource,
								sourceAtStart: attackSource.copy(),
								target: attackTarget,
								targetAtStart: attackTarget.copy(),
								generatedBy: attackSource.id,
							},
							{
								type: ACTION_EFFECT,
								effectType: EFFECT_TYPE_AFTER_DAMAGE,
								source: attackSource,
								target: attackTarget,
								generatedBy: attackSource.id,
							},
						].filter(Boolean);

						this.transformIntoActions(...attackSequence);
					}
					break;
				}
				case ACTION_GET_PROPERTY_VALUE: {
					const multiTarget = this.getMetaValue(action.target, action.generatedBy);
					// Sometimes we can only pass here results of a selector. 
					// If so, work on first element of result.
					const target = (multiTarget instanceof Array) ? multiTarget[0] : multiTarget;
					const property = this.getMetaValue(action.property, action.generatedBy);

					const modifiedResult = this.modifyByStaticAbilities(target, property);

					const variable = action.variable || 'result';
					this.setSpellMetaDataField(variable, modifiedResult, action.generatedBy);
					break;
				}
				case ACTION_CALCULATE: {
					const operandOne = this.getMetaValue(action.operandOne, action.generatedBy);
					const operandTwo = this.getMetaValue(action.operandTwo, action.generatedBy);
					const result = this.performCalculation(action.operator, operandOne, operandTwo);

					const variable = action.variable || 'result';
					this.setSpellMetaDataField(variable, result, action.generatedBy);
					break;
				}
				case ACTION_POWER: {
					if (!action.source.wasActionUsed(action.power.name)) {
						const source = action.source;
						const effects = action.power.effects;
							
						const preparedActions = effects.map(effect => ({...effect, generatedBy: source.id, player: action.player}));

						let currentPowerMetaData = {
							source,
							sourceCreature: source,
						}; // No retrieving old metadata from old activations

						source.setActionUsed(action.power.name);

						if (action.power.cost == COST_X) {
							this.addActions(
								{
									type: ACTION_ENTER_PROMPT,
									promptType: PROMPT_TYPE_NUMBER,
									player: action.player,
									generatedBy: source.id,
								},
								{
									type: ACTION_CALCULATE,
									operator: CALCULATION_SET,
									operandOne: '$number',
									variable: 'chosen_cost',
									generatedBy: source.id,
								},
								{
									type: ACTION_EFFECT,
									effectType: EFFECT_TYPE_PAYING_ENERGY_FOR_POWER,
									target: source,
									amount: '$number',
									generatedBy: source.id,
								},
							);
						} else if (action.power.cost > 0) {
							this.addActions({
								type: ACTION_EFFECT,
								effectType: EFFECT_TYPE_PAYING_ENERGY_FOR_POWER,
								target: source,
								amount: action.power.cost,
								generatedBy: source.id,
							});
						}
						this.addActions(...preparedActions);
						this.setSpellMetadata(currentPowerMetaData, source.id);
					}
					break;
				}
				case ACTION_ENTER_PROMPT: {
					if (!Object.prototype.hasOwnProperty.call(action, 'player')) {
						throw new Error('Prompt without player!');
					}
					const savedActions = this.state.actions;
					let promptParams = {};
					const promptPlayer = this.getMetaValue(action.player, action.generatedBy);

					switch (action.promptType) {
						case PROMPT_TYPE_ANY_CREATURE_EXCEPT_SOURCE: {
							promptParams = {
								source: this.getMetaValue(action.source, action.generatedBy),
							};
							break;
						}
						case PROMPT_TYPE_CHOOSE_N_CARDS_FROM_ZONE: {
							promptParams = {
								zone: this.getMetaValue(action.zone, action.generatedBy),
								zoneOwner: this.getMetaValue(action.zoneOwner, action.generatedBy),
								numberOfCards: this.getMetaValue(action.numberOfCards, action.generatedBy),
							};
							break;
						}
						case PROMPT_TYPE_SINGLE_CREATURE_FILTERED: {
							promptParams = {
								restriction: action.restriction,
								restrictionValue: action.restrictionValue,
							};
							break;
						}
						case PROMPT_TYPE_CHOOSE_CARDS: {
							promptParams = action.promptParams;
							break;
						}
						case PROMPT_TYPE_NUMBER: {
							promptParams = {
								min: this.getMetaValue(action.min, action.generatedBy),
								max: this.getMetaValue(action.max, action.generatedBy),
							};
							break;
						}
					}
					this.state = {
						...this.state,
						actions: [],
						savedActions,
						prompt: true,
						promptMessage: action.message,
						promptPlayer,
						promptType: action.promptType,
						promptVariable: action.variable,
						promptGeneratedBy: action.generatedBy,
						promptParams,
					};
					break;
				}
				case ACTION_RESOLVE_PROMPT: {
					const generatedBy = action.generatedBy || this.state.promptGeneratedBy;
					const variable = action.variable || this.state.promptVariable;
					let currentActionMetaData = this.state.spellMetaData[generatedBy] || {};
					switch (this.state.promptType) {
						case PROMPT_TYPE_CHOOSE_N_CARDS_FROM_ZONE:
							currentActionMetaData[variable || 'targetCards'] = action.cards;
							break;
						case PROMPT_TYPE_NUMBER:
							currentActionMetaData[variable || 'number'] = action.number;
							break;
						case PROMPT_TYPE_ANY_CREATURE_EXCEPT_SOURCE:
							if (this.state.promptParams.source.id === action.target.id) {
								throw new Error('Got forbidden target on prompt');
							}
							currentActionMetaData[variable || 'target'] = action.target;
							break;
						case PROMPT_TYPE_OWN_SINGLE_CREATURE: {
							if (this.state.promptPlayer !== action.target.data.controller) {
								throw new Error('Not-controlled creature supplied to Own Creatures prompt');
							}
							currentActionMetaData[variable || 'target'] = action.target;
							break;
						}
						case PROMPT_TYPE_SINGLE_CREATURE_FILTERED: {
							currentActionMetaData[variable || 'target'] = action.target;
							break;
						}
						case PROMPT_TYPE_SINGLE_CREATURE:
							currentActionMetaData[variable || 'target'] = action.target;
							break;
						case PROMPT_TYPE_SINGLE_CREATURE_OR_MAGI:
							currentActionMetaData[variable || 'target'] = action.target;
							break;
						case PROMPT_TYPE_SINGLE_MAGI:
							currentActionMetaData[variable || 'targetMagi'] = action.target;
							break;
						case PROMPT_TYPE_CHOOSE_CARDS:
							currentActionMetaData[variable || 'selectedCards'] = action.cards || [];
							break;
					}
					const actions = this.state.savedActions || [];
					this.state = {
						...this.state,
						actions,
						savedActions: [],
						prompt: false,
						promptType: null,
						promptMessage: null,
						promptGeneratedBy: null,
						promptVariable: null,
						promptParams: {},
						spellMetaData: {
							...this.state.spellMetaData,
							[generatedBy]: currentActionMetaData,
						},
					};
					break;
				}
				case ACTION_SELECT: {
					let result;
					switch (action.selector) {
						case SELECTOR_MAGI: {
							result = this.useSelector(SELECTOR_MAGI);
							break;
						}
						case SELECTOR_RELICS: {
							result = this.useSelector(SELECTOR_RELICS);
							break;
						}
						case SELECTOR_OWN_CARDS_IN_PLAY: {
							result = this.useSelector(SELECTOR_OWN_CARDS_IN_PLAY, action.player);
							break;
						}
						case SELECTOR_OWN_CREATURES_OF_TYPE: {
							result = this.useSelector(SELECTOR_OWN_CREATURES_OF_TYPE, action.player, this.getMetaValue(action.creatureType, action.generatedBy));
							break;
						}
						case SELECTOR_CREATURES_OF_TYPE: {
							result = this.useSelector(SELECTOR_CREATURES_OF_TYPE, null, this.getMetaValue(action.creatureType, action.generatedBy));
							break;
						}
						case SELECTOR_CREATURES_NOT_OF_TYPE: {
							result = this.useSelector(SELECTOR_CREATURES_NOT_OF_TYPE, null, this.getMetaValue(action.creatureType, action.generatedBy));
							break;
						}
						case SELECTOR_CARDS_WITH_ENERGIZE_RATE: {
							result = this.useSelector(SELECTOR_CARDS_WITH_ENERGIZE_RATE, action.player);
							break;
						}
						case SELECTOR_OPPONENT_ID: {
							result = this.useSelector(
								SELECTOR_OPPONENT_ID,
								action.player,
								this.getMetaValue(action.opponentOf || action.player, action.generatedBy)
							);
							break;
						}
						case SELECTOR_OWN_CARDS_WITH_ENERGIZE_RATE: {
							result = this.useSelector(SELECTOR_OWN_CARDS_WITH_ENERGIZE_RATE, action.player);
							break;
						}
						case SELECTOR_CREATURES_AND_MAGI: {
							result = [
								...this.useSelector(SELECTOR_OWN_MAGI, action.player),
								...this.useSelector(SELECTOR_ENEMY_MAGI, action.player),
								...this.useSelector(SELECTOR_CREATURES),
							];
							break;
						}
						case SELECTOR_TOP_MAGI_OF_PILE: {
							result = this.useSelector(SELECTOR_TOP_MAGI_OF_PILE, action.player);
							break;
						}
						case SELECTOR_OWN_MAGI: {
							result = this.useSelector(SELECTOR_OWN_MAGI, action.player);
							break;
						}
						case SELECTOR_OWN_CREATURES: {
							result = this.useSelector(SELECTOR_OWN_CREATURES, action.player);
							break;
						}
						case SELECTOR_ENEMY_CREATURES: {
							result = this.useSelector(SELECTOR_ENEMY_CREATURES, action.player);
							break;
						}
						case SELECTOR_ENEMY_MAGI: {
							result = this.useSelector(SELECTOR_ENEMY_MAGI, action.player);
							break;
						}
						case SELECTOR_CREATURES_OF_REGION: {
							result = this.useSelector(SELECTOR_CREATURES_OF_REGION, action.player, action.region);
							break;
						}
						case SELECTOR_CREATURES_NOT_OF_REGION: {
							result = this.getZone(ZONE_TYPE_IN_PLAY).cards.filter(card => this.modifyByStaticAbilities(card, PROPERTY_REGION) != action.region);
							break;
						}
						case SELECTOR_MAGI_OF_REGION: {
							result = [
								...this.useSelector(SELECTOR_OWN_MAGI, action.player),
								...this.useSelector(SELECTOR_ENEMY_MAGI, action.player),
							].filter(magi => this.modifyByStaticAbilities(magi, PROPERTY_REGION) === action.region);
							break;
						}
						case SELECTOR_MAGI_NOT_OF_REGION: {
							result = [
								...this.useSelector(SELECTOR_OWN_MAGI, action.player),
								...this.useSelector(SELECTOR_ENEMY_MAGI, action.player),
							].filter(magi => this.modifyByStaticAbilities(magi, PROPERTY_REGION) != action.region);
							break;
						}
					}
					const variable = action.variable || 'selected';
					this.setSpellMetaDataField(variable, result, action.generatedBy);
					break;
				}
				case ACTION_PASS: {
					var newStep, activePlayer;
					if (this.state.step === null) {
						newStep = 0;
						activePlayer = this.state.activePlayer;
					} else {
						newStep = (this.state.step + 1) % steps.length;
						activePlayer = (newStep === 0) ? this.getOpponent(this.state.activePlayer) : this.state.activePlayer;
					}
					// Maybe point out that these are generated by game rules?
					const generatedBy = nanoid(); 
					if (newStep === 0) {
						this.transformIntoActions(
							{
								type: ACTION_EFFECT,
								effectType: EFFECT_TYPE_END_OF_TURN,
								player: this.state.activePlayer,
								generatedBy,
							},
							{
								type: ACTION_EFFECT,
								effectType: EFFECT_TYPE_START_OF_TURN,
								player: activePlayer,
								generatedBy,
							}
						);
					}
					if (steps[newStep].effects) {
						const transformedActions = steps[newStep].effects.map(action => ({...action, player: activePlayer, generatedBy}));
						this.addActions(...transformedActions);
					}
					if (steps[newStep].automatic) {
						this.addActions({
							type: ACTION_PASS,
						});
					}
					this.state = {
						...this.state,
						step: newStep,
						activePlayer,
					};
					break;
				}
				case ACTION_PLAY: {
					const player = action.payload.player;
					const playerHand = this.getZone(ZONE_TYPE_HAND, player);
					const cardInHand = playerHand.containsId(action.payload.card.id);
					if (cardInHand) {
						// baseCard is "abstract" card, CardInPlay is concrete instance
						const baseCard = action.payload.card.card;

						const currentPriority = this.getCurrentPriority();
						const cardType = baseCard.type;
						if (
							(cardType == TYPE_CREATURE && currentPriority == PRIORITY_CREATURES) ||
							(cardType == TYPE_RELIC && currentPriority == PRIORITY_PRS) ||
							(cardType == TYPE_SPELL && currentPriority == PRIORITY_PRS)
						) {
							// Здесь должен быть полный шаг определения стоимости
							const activeMagi = this.getZone(ZONE_TYPE_ACTIVE_MAGI, player).card;
							const regionPenalty = (activeMagi.card.region == baseCard.region || baseCard.region == REGION_UNIVERSAL) ? 0 : 1;
							switch (cardType) {
								case TYPE_CREATURE: {
									if (activeMagi.data.energy >= baseCard.cost + regionPenalty) {
										this.transformIntoActions(
											{
												type: ACTION_EFFECT,
												effectType: EFFECT_TYPE_PAYING_ENERGY_FOR_CREATURE,
												from: activeMagi,
												amount: baseCard.cost + regionPenalty,
												player: action.payload.player,
												generatedBy: action.payload.card.id,
											},
											{
												type: ACTION_EFFECT,
												effectType: EFFECT_TYPE_PLAY_CREATURE,
												card: action.payload.card,
												player: action.payload.player,
												generatedBy: action.payload.card.id,
											},
											{
												type: ACTION_EFFECT,
												effectType: EFFECT_TYPE_CREATURE_ENTERS_PLAY,
												target: '$creature_created',
												player: action.payload.player,
												generatedBy: action.payload.card.id,
											},
											{
												type: ACTION_EFFECT,
												effectType: EFFECT_TYPE_STARTING_ENERGY_ON_CREATURE,
												target: '$creature_created',
												player: action.payload.player,
												amount: baseCard.cost,
												generatedBy: action.payload.card.id,
											}
										);
									}
									break;
								}
								case TYPE_RELIC: {
									const alreadyHasOne = this.getZone(ZONE_TYPE_IN_PLAY).cards
										.some(card => card.data.controller === player && card.card.name === baseCard.name);
									const relicRegion = baseCard.region;
									const magiRegion = activeMagi.card.region;
									const regionAllows = relicRegion === magiRegion || relicRegion === REGION_UNIVERSAL;

									if (!alreadyHasOne && regionAllows && activeMagi.data.energy > baseCard.cost) {
										this.transformIntoActions(
											{
												type: ACTION_EFFECT,
												effectType: EFFECT_TYPE_PAYING_ENERGY_FOR_RELIC,
												from: activeMagi,
												amount: baseCard.cost,
												player,
												generatedBy: action.payload.card.id,
											},
											{
												type: ACTION_EFFECT,
												effectType: EFFECT_TYPE_PLAY_RELIC,
												card: action.payload.card,
												player,
												generatedBy: action.payload.card.id,
											},
											{
												type: ACTION_EFFECT,
												effectType: EFFECT_TYPE_RELIC_ENTERS_PLAY,
												card: '$relic_created',
												player,
												generatedBy: action.payload.card.id,
											}
										);
									}
									break;
								}
								case TYPE_SPELL: {
									if (activeMagi.data.energy >= baseCard.cost + regionPenalty) {
										const preparedEffects = baseCard.data.effects
											.map(effect => ({
												player: action.payload.player, // Spell can rewrite this to make opponent do something - draw a card, for example
												...effect,
												generatedBy: action.payload.card.id,
											}));

										this.transformIntoActions(
											{
												type: ACTION_EFFECT,
												effectType: EFFECT_TYPE_PLAY_SPELL,
												card: action.payload.card,
												player: action.payload.player,
												generatedBy: action.payload.card.id,
											},
											{
												type: ACTION_EFFECT,
												effectType: EFFECT_TYPE_PAYING_ENERGY_FOR_SPELL,
												from: activeMagi,
												amount: baseCard.cost + regionPenalty,
												player: action.payload.player,
												generatedBy: action.payload.card.id,
											},
											{
												type: ACTION_CALCULATE,
												operator: CALCULATION_SET,
												operandOne: action.payload.player,
												variable: 'player',
												generatedBy: action.payload.card.id,
											},
											{
												type: ACTION_EFFECT,
												effectType: EFFECT_TYPE_MOVE_CARD_BETWEEN_ZONES,
												target: action.payload.card,
												sourceZone: ZONE_TYPE_HAND,
												destinationZone: ZONE_TYPE_DISCARD,
												player: player,
												generatedBy: action.payload.card.id,											
											},
											...preparedEffects,
										);
									}
									break;
								}
							}
						} else {
							console.log(`Wrong Priority: current is ${currentPriority} (step ${this.getCurrentStep()}, type is ${cardType})`);
						}
					} else {
						console.log('No card to play');
					}
					break;
				}
				case ACTION_EFFECT: {
					switch(action.effectType) {
						case EFFECT_TYPE_START_OF_TURN: {
							if (
								this.getZone(ZONE_TYPE_ACTIVE_MAGI, action.player).length == 0 &&
								this.getZone(ZONE_TYPE_MAGI_PILE, action.player).length > 0
							) {
								const topMagi = this.getZone(ZONE_TYPE_MAGI_PILE, action.player).cards[0];
								const startingEnergy = this.modifyByStaticAbilities(topMagi, PROPERTY_MAGI_STARTING_ENERGY);
								const firstMagi = this.getZone(ZONE_TYPE_DEFEATED_MAGI, action.player).length == 0;

								const actionsToTake = [
									{
										type: ACTION_EFFECT,
										effectType: EFFECT_TYPE_MAGI_FLIPPED,
										target: topMagi,
									}, 
									{
										type: ACTION_SELECT,
										selector: SELECTOR_OWN_MAGI,
										variable: 'ownMagi',
									}, 
									{
										type: ACTION_EFFECT,
										effectType: EFFECT_TYPE_ADD_ENERGY_TO_MAGI,
										target: '$ownMagi',
										amount: startingEnergy,
									},
									{
										type: ACTION_ENTER_PROMPT,
										promptType: PROMPT_TYPE_CHOOSE_CARDS,
										promptParams: {
											cards: topMagi.card.data.startingCards,
										},
										variable: 'startingCards',
									},
									{
										type: ACTION_EFFECT,
										effectType: EFFECT_TYPE_FIND_STARTING_CARDS,
										cards: '$startingCards',
									}
								];

								if (firstMagi) {
									actionsToTake.push({
										type: ACTION_EFFECT,
										effectType: EFFECT_TYPE_DRAW_REST_OF_CARDS,
										drawnCards: '$foundCards',
									});
								}

								const actions = actionsToTake.map(preAction => ({
									...preAction,
									player: action.player,
									generatedBy: action.generatedBy,
								}));

								this.transformIntoActions(...actions);
							}
							const creatures = this.getZone(ZONE_TYPE_IN_PLAY).cards
								.filter(card => card.card.type === TYPE_CREATURE && card.data.controller === action.player);
							if (creatures.length > 0) {
								creatures.forEach(creature => {
									creature.clearAttackMarkers();
									creature.clearActionsUsed();
								});
							}
							// if magi is active, reset its actions used too
							if (this.getZone(ZONE_TYPE_ACTIVE_MAGI, action.player).length == 1) {
								this.getZone(ZONE_TYPE_ACTIVE_MAGI, action.player).card.clearActionsUsed();
							}
							break;
						}
						case EFFECT_TYPE_FIND_STARTING_CARDS: {
							const cardsToFind = this.getMetaValue(action.cards, action.generatedBy);
							const deck = this.getZone(ZONE_TYPE_DECK, action.player);
							const discard = this.getZone(ZONE_TYPE_DISCARD, action.player);
							const hand = this.getZone(ZONE_TYPE_HAND, action.player);
							let foundCards = [];
							if (cardsToFind.length) {
								cardsToFind.forEach(cardName => {
									if (discard.cards.some(({card}) => card.name == cardName)) {
										const card = discard.cards.find(({card}) => card.name == cardName);
										hand.add([new CardInGame(card.card, action.player)]);
										discard.removeById(card.id);
										foundCards.push(cardName);
									} else if (deck.cards.some(({card}) => card.name == cardName)) {
										const card = deck.cards.find(({card}) => card.name == cardName);
										hand.add([new CardInGame(card.card, action.player)]);
										deck.removeById(card.id);
										foundCards.push(cardName);
									}
								});
							}

							this.setSpellMetaDataField('foundCards', foundCards, action.generatedBy);
							break;
						}
						case EFFECT_TYPE_DRAW_REST_OF_CARDS: {
							const foundCards = this.getMetaValue(action.drawnCards, action.generatedBy) || [];
							const number = 5 - foundCards.length;
							if (number > 0) { // who knows
								for (let i = 0; i < number; i++) { 
									this.transformIntoActions({
										type: ACTION_EFFECT,
										effectType: EFFECT_TYPE_DRAW,
										player: action.player,
										generatedBy: action.generatedBy,
									});
								}
							}
							break;
						}
						case EFFECT_TYPE_MAGI_FLIPPED: {
							this.transformIntoActions({
								type: ACTION_EFFECT,
								effectType: EFFECT_TYPE_MOVE_CARD_BETWEEN_ZONES,
								sourceZone: ZONE_TYPE_MAGI_PILE,
								destinationZone: ZONE_TYPE_ACTIVE_MAGI,
								target: action.target,
								generatedBy: action.generatedBy,
							});
							break;
						}
						/* End of starting actions */
						case EFFECT_TYPE_DISCARD_CARDS_FROM_HAND: {
							const targets = this.getMetaValue(action.target, action.generatedBy);
							oneOrSeveral(targets, target =>
								target && this.transformIntoActions({
									type: ACTION_EFFECT,
									effectType: EFFECT_TYPE_MOVE_CARD_BETWEEN_ZONES,
									sourceZone: ZONE_TYPE_HAND,
									destinationZone: ZONE_TYPE_DISCARD,
									target,
									generatedBy: action.generatedBy,
								})
							);
							break;
						}
						case EFFECT_TYPE_DRAW: {
							const player = this.getMetaValue(action.player, action.generatedBy);

							const deck = this.getZone(ZONE_TYPE_DECK, player);
							const discard = this.getZone(ZONE_TYPE_DISCARD, player);

							if (deck.length > 0) {
								const card = deck.cards[0];

								this.transformIntoActions({
									type: ACTION_EFFECT,
									effectType: EFFECT_TYPE_MOVE_CARD_BETWEEN_ZONES,
									target: card,
									sourceZone: ZONE_TYPE_DECK,
									destinationZone: ZONE_TYPE_HAND,
									player: player,
									generatedBy: action.generatedBy,
								});
							} else if (discard.length > 0) {
								this.transformIntoActions({
									type: ACTION_EFFECT,
									effectType: EFFECT_TYPE_RESHUFFLE_DISCARD,
									player: player,
								},
								action);
							}
							break;
						}
						case EFFECT_TYPE_RESHUFFLE_DISCARD: {
							const player = this.getMetaValue(action.player, action.generatedBy);
							const deck = this.getZone(ZONE_TYPE_DECK, player);
							const discard = this.getZone(ZONE_TYPE_DISCARD, player);

							const newCards = discard.cards.map(card => new CardInGame(card.card, card.owner));
							deck.add(newCards);
							deck.shuffle();
							discard.empty();
							break;
						}
						// Attack sequence
						case EFFECT_TYPE_BEFORE_DAMAGE: {
							action.source.markAttackDone();
							action.target.markAttackReceived();
							break;
						}
						case EFFECT_TYPE_DAMAGE_STEP: {
							// Here we finalize damage amount from both creatures' energy
							const attackSource = action.source;
							const attackTarget = action.target;

							const damageByAttacker = attackSource.data.energy;
							const damageByDefender = (attackTarget.card.type === TYPE_CREATURE) ?
								attackTarget.data.energy :
								0
							;
							const damageActions = [
								{  // from source to target
									type: ACTION_EFFECT,
									effectType: EFFECT_TYPE_ATTACKER_DEALS_DAMAGE,
									source: attackSource,
									sourceAtStart: action.sourceAtStart,
									target: attackTarget,
									targetAtStart: action.targetAtStart,
									amount: damageByAttacker,
									generatedBy: attackSource.id,
								}, // from target to source (if attacking a creature)
								(attackTarget.card.type === TYPE_CREATURE) ? {
									type: ACTION_EFFECT,
									effectType: EFFECT_TYPE_DEFENDER_DEALS_DAMAGE,
									source: attackTarget,
									sourceAtStart: attackTarget.copy(),
									target: attackSource,
									amount: damageByDefender,
									targetAtStart: attackSource.copy(),
									generatedBy: attackSource.id,
								} : null,
							].filter(Boolean);

							this.transformIntoActions(...damageActions);
							break;
						}
						case EFFECT_TYPE_ATTACKER_DEALS_DAMAGE: {
							this.transformIntoActions({
								type: ACTION_EFFECT,
								effectType: EFFECT_TYPE_DEAL_DAMAGE,
								source: action.source,
								sourceAtStart: action.sourceAtStart,
								target: action.target,
								targetAtStart: action.targetAtStart,
								amount: action.amount,
								attack: true,
								generatedBy: action.generatedBy,
							});
							break;
						}
						case EFFECT_TYPE_DEFENDER_DEALS_DAMAGE: {
							this.transformIntoActions({
								type: ACTION_EFFECT,
								effectType: EFFECT_TYPE_DEAL_DAMAGE,
								source: action.source,
								sourceAtStart: action.sourceAtStart,
								target: action.target,
								targetAtStart: action.targetAtStart,
								amount: action.amount,
								attack: true,
								generatedBy: action.generatedBy,
							});
							break;
						}
						case EFFECT_TYPE_DEAL_DAMAGE: {
							this.transformIntoActions({
								type: ACTION_EFFECT,
								effectType: EFFECT_TYPE_DISCARD_ENERGY_FROM_CREATURE_OR_MAGI,
								target: action.target,
								amount: action.amount,
								attack: true,
								generatedBy: action.generatedBy,
							});
							break;
						}
						case EFFECT_TYPE_AFTER_DAMAGE: {
							if (action.source.data.energy === 0) {
								this.transformIntoActions({
									type: ACTION_EFFECT,
									effectType: EFFECT_TYPE_MOVE_CARD_BETWEEN_ZONES,
									target: action.source,
									sourceZone: ZONE_TYPE_IN_PLAY,
									destinationZone: ZONE_TYPE_DISCARD,
									attack: true,
									generatedBy: action.generatedBy,
								});
							}
							if (action.target.data.energy === 0 && action.target.card.type === TYPE_CREATURE) {
								this.transformIntoActions({
									type: ACTION_EFFECT,
									effectType: EFFECT_TYPE_CREATURE_DEFEATS_CREATURE,
									source: action.source,
									target: action.target,
									attack: true,
									generatedBy: action.generatedBy,
								}, {
									type: ACTION_EFFECT,
									effectType: EFFECT_TYPE_CREATURE_IS_DEFEATED,
									target: action.target,
									attack: true,
									generatedBy: action.generatedBy,
								});
							}
							break;
						}
						case EFFECT_TYPE_CREATURE_DEFEATS_CREATURE: {
							if (action.target.data.energy === 0) {
								this.transformIntoActions({
									type: ACTION_EFFECT,
									effectType: EFFECT_TYPE_MOVE_CARD_BETWEEN_ZONES,
									target: action.target,
									sourceZone: ZONE_TYPE_IN_PLAY,
									destinationZone: ZONE_TYPE_DISCARD,
									attack: true,
									generatedBy: action.generatedBy,
								});
							}
							break;
						}
						case EFFECT_TYPE_ROLL_DIE: {
							const result = action.result || (Math.floor(Math.random() * 6) + 1);

							this.setSpellMetaDataField('roll_result', result, action.generatedBy);
							break;
						}
						case EFFECT_TYPE_ENERGIZE: {
							const targets = this.getMetaValue(action.target, action.generatedBy);

							oneOrSeveral(targets, target => {
								const amount = this.modifyByStaticAbilities(target, PROPERTY_ENERGIZE);
								const type = target.card.type;
								this.transformIntoActions({
									type: ACTION_EFFECT,
									effectType: (type == TYPE_CREATURE) ? EFFECT_TYPE_ADD_ENERGY_TO_CREATURE : EFFECT_TYPE_ADD_ENERGY_TO_MAGI,
									target,
									amount,
									generatedBy: action.generatedBy,
								});
							});
							break;
						}
						case EFFECT_TYPE_PAYING_ENERGY_FOR_RELIC: {
							action.from.removeEnergy(this.getMetaValue(action.amount, action.generatedBy));
							break;
						}
						case EFFECT_TYPE_PAYING_ENERGY_FOR_SPELL: {
							action.from.removeEnergy(this.getMetaValue(action.amount, action.generatedBy));
							break;
						}
						case EFFECT_TYPE_PAYING_ENERGY_FOR_CREATURE: {
							action.from.removeEnergy(this.getMetaValue(action.amount, action.generatedBy));
							break;
						}
						case EFFECT_TYPE_PLAY_RELIC: {
							this.transformIntoActions({
								type: ACTION_EFFECT,
								effectType: EFFECT_TYPE_MOVE_CARD_BETWEEN_ZONES,
								sourceZone: ZONE_TYPE_HAND,
								destinationZone: ZONE_TYPE_IN_PLAY,
								target: action.card,
								player: action.player,
								generatedBy: action.generatedBy,
							}, {
								type: ACTION_GET_PROPERTY_VALUE,
								property: PROPERTY_ID,
								target: '$new_card',
								variable: 'relic_created',
								generatedBy: action.generatedBy,
							});
							break;
						}
						case EFFECT_TYPE_PLAY_CREATURE: {
							this.transformIntoActions({
								type: ACTION_EFFECT,
								effectType: EFFECT_TYPE_MOVE_CARD_BETWEEN_ZONES,
								sourceZone: ZONE_TYPE_HAND,
								destinationZone: ZONE_TYPE_IN_PLAY,
								target: action.card,
								player: action.player,
								generatedBy: action.generatedBy,
							}, {
								type: ACTION_CALCULATE,
								operator: CALCULATION_SET,
								operandOne: '$new_card',
								variable: 'creature_created',
								generatedBy: action.generatedBy,
							});
							break;
						}
						case EFFECT_TYPE_MOVE_CARD_BETWEEN_ZONES: {
							if (!action.sourceZone || !action.destinationZone) {
								console.log('Source zone or destination zone invalid');
								throw new Error('Invalid params for EFFECT_TYPE_MOVE_CARD_BETWEEN_ZONES');
							}
							const zoneChangingTarget = this.getMetaValue(action.target, action.generatedBy);
							const zoneChangingCard = (zoneChangingTarget instanceof Array) ? zoneChangingTarget[0] : zoneChangingTarget;
							const sourceZoneType = this.getMetaValue(action.sourceZone, action.generatedBy);
							const destinationZoneType = this.getMetaValue(action.destinationZone, action.generatedBy);
							const destinationZone = this.getZone(destinationZoneType, destinationZoneType === ZONE_TYPE_IN_PLAY ? null : zoneChangingCard.owner);
							const sourceZone = this.getZone(sourceZoneType, sourceZoneType === ZONE_TYPE_IN_PLAY ? null : zoneChangingCard.owner);
							const newObject = new CardInGame(zoneChangingCard.card, zoneChangingCard.owner);
							if (action.bottom) {
								destinationZone.add([newObject]);
							} else {
								destinationZone.addToTop([newObject]);
							}
							sourceZone.removeById(zoneChangingCard.id);

							this.setSpellMetaDataField('new_card', newObject, action.generatedBy);
							this.transformIntoActions({
								type: ACTION_EFFECT,
								effectType: EFFECT_TYPE_CARD_MOVED_BETWEEN_ZONES,
								sourceCard: zoneChangingTarget,
								sourceZone: sourceZoneType,
								destinationCard: newObject,
								destinationZone: destinationZoneType,
								generatedBy: action.generatedBy,
							});
							break;
						}
						case EFFECT_TYPE_CARD_MOVED_BETWEEN_ZONES: {
							// we should check if it was the last creature in play and Magi loses
							if (action.sourceZone === ZONE_TYPE_IN_PLAY) {
								const newCard = this.getMetaValue(action.destinationCard, action.generatedBy);
								const magi = this.getZone(ZONE_TYPE_ACTIVE_MAGI, newCard.data.owner).card;
								const numberOfCreatures = this.useSelector(SELECTOR_OWN_CREATURES, newCard.data.owner).length;
								if (magi && magi.data.energy === 0 && numberOfCreatures === 0) {
									this.transformIntoActions({
										type: ACTION_EFFECT,
										effectType: EFFECT_TYPE_MAGI_IS_DEFEATED,
										target: magi,
										generatedBy: action.generatedBy,
									});
								}
							}
							break;
						}
						case EFFECT_TYPE_CREATURE_ENTERS_PLAY:
							break;
						case EFFECT_TYPE_STARTING_ENERGY_ON_CREATURE: {
							const target = this.getMetaValue(action.target, action.generatedBy);
							this.transformIntoActions({
								type: ACTION_EFFECT,
								effectType: EFFECT_TYPE_ADD_ENERGY_TO_CREATURE,
								target,
								amount: this.getMetaValue(action.amount, action.generatedBy),
								generatedBy: action.generatedBy,
							});
							break;
						}
						case EFFECT_TYPE_MOVE_ENERGY: {
							const moveMultiSource = this.getMetaValue(action.source, action.generatedBy);
							const moveSource = (moveMultiSource instanceof Array) ? moveMultiSource[0] : moveMultiSource;
							const moveMultiTarget = this.getMetaValue(action.target, action.generatedBy);
							const moveTarget = (moveMultiTarget instanceof Array) ? moveMultiTarget[0] : moveMultiTarget;
							const amountToMove = this.getMetaValue(action.amount, action.generatedBy);

							moveSource.removeEnergy(amountToMove);
							moveTarget.addEnergy(amountToMove);
							if (moveSource.data.energy === 0) {
								switch (moveSource.card.type) {
									case TYPE_CREATURE: {
										// Creature goes to discard
										this.transformIntoActions({
											type: ACTION_EFFECT,
											effectType: EFFECT_TYPE_MOVE_CARD_BETWEEN_ZONES,
											sourceZone: ZONE_TYPE_IN_PLAY,
											destinationZone: ZONE_TYPE_DISCARD,
											target: moveSource,
											player: action.player,
											generatedBy: action.generatedBy,
										});
										break;
									}
									case TYPE_MAGI: {
										break;
									}
								}
							}
							break;
						}
						case EFFECT_TYPE_ADD_ENERGY_TO_CREATURE_OR_MAGI: {
							const addMiltiTarget = this.getMetaValue(action.target, action.generatedBy);

							oneOrSeveral(addMiltiTarget, target => {
								switch (target.card.type) {
									case TYPE_CREATURE:
										this.transformIntoActions({
											type: ACTION_EFFECT,
											effectType: EFFECT_TYPE_ADD_ENERGY_TO_CREATURE,
											amount: action.amount,
											target,
											generatedBy: action.generatedBy,
										});
										break;
									case TYPE_MAGI:
										this.transformIntoActions({
											type: ACTION_EFFECT,
											effectType: EFFECT_TYPE_ADD_ENERGY_TO_MAGI,
											amount: action.amount,
											target,
											generatedBy: action.generatedBy,
										});
										break;
								}
							});
							break;
						}
						case EFFECT_TYPE_DISCARD_ENERGY_FROM_CREATURE_OR_MAGI: {
							const discardMiltiTarget = this.getMetaValue(action.target, action.generatedBy);

							oneOrSeveral(discardMiltiTarget, target => {
								switch (target.card.type) {
									case TYPE_CREATURE:
										this.transformIntoActions({
											type: ACTION_EFFECT,
											effectType: EFFECT_TYPE_DISCARD_ENERGY_FROM_CREATURE,
											amount: action.amount,
											attack: action.attack || false,
											target,
											generatedBy: action.generatedBy,
										});
										break;
									case TYPE_MAGI:
										this.transformIntoActions({
											type: ACTION_EFFECT,
											effectType: EFFECT_TYPE_DISCARD_ENERGY_FROM_MAGI,
											amount: action.amount,
											target,
											generatedBy: action.generatedBy,
										});
										break;
								}
							});
							break;
						}
						case EFFECT_TYPE_DISCARD_ENERGY_FROM_MAGI: {
							oneOrSeveral(
								this.getMetaValue(action.target, action.generatedBy),
								target => {
									target.removeEnergy(this.getMetaValue(action.amount, action.generatedBy));

									const hisCreatures = this.useSelector(SELECTOR_OWN_CREATURES, target.data.controller);
									if (target.data.energy === 0 && hisCreatures.length === 0) {
										this.transformIntoActions({
											type: ACTION_EFFECT,
											effectType: EFFECT_TYPE_MAGI_IS_DEFEATED,
											target,
											generatedBy: action.generatedBy,
										});
									}
								},
							);
							break;
						}
						case EFFECT_TYPE_DEFEAT_MAGI: {
							const magiMiltiTarget = this.getMetaValue(action.target, action.generatedBy);

							oneOrSeveral(magiMiltiTarget, target => {
								this.transformIntoActions({
									type: ACTION_EFFECT,
									effectType: EFFECT_TYPE_MAGI_IS_DEFEATED,
									target,
									generatedBy: action.generatedBy,
								});
							});
							break;
						}
						case EFFECT_TYPE_MAGI_IS_DEFEATED: {
							const {target, generatedBy} = action;
							const stillHasMagi = this.getZone(ZONE_TYPE_MAGI_PILE, target.data.controller).length > 0;
							
							if (stillHasMagi) {
								this.transformIntoActions({
									type: ACTION_EFFECT,
									effectType: EFFECT_TYPE_MOVE_CARD_BETWEEN_ZONES,
									target: target,
									sourceZone: ZONE_TYPE_ACTIVE_MAGI,
									destinationZone: ZONE_TYPE_DEFEATED_MAGI,
									generatedBy,
								}, {
									type: ACTION_SELECT,
									selector: SELECTOR_OWN_CARDS_IN_PLAY,
									action: target.owner,
									variable: 'cardsInPlay',
									generatedBy,
								}, {
									type: ACTION_EFFECT,
									effectType: EFFECT_TYPE_DISCARD_CREATURE_OR_RELIC,
									target: '$cardsInPlay',
									generatedBy,
								});
							} else {
								const winner = this.getOpponent(action.target.owner);

								this.transformIntoActions({
									type: ACTION_PLAYER_WINS,
									player: winner,
								});
							}
							break;
						}
						case EFFECT_TYPE_DISCARD_ENERGY_FROM_CREATURE: {
							oneOrSeveral(
								this.getMetaValue(action.target, action.generatedBy),
								target => {
									target.removeEnergy(this.getMetaValue(action.amount, action.generatedBy));

									if (target.data.energy == 0 && !action.attack) {
										this.transformIntoActions({
											type: ACTION_EFFECT,
											effectType: EFFECT_TYPE_MOVE_CARD_BETWEEN_ZONES,
											target: target,
											sourceZone: ZONE_TYPE_IN_PLAY,
											destinationZone: ZONE_TYPE_DISCARD,
											generatedBy: action.generatedBy,
										});
									}
								},
							);
							break;
						}
						case EFFECT_TYPE_RESTORE_CREATURE_TO_STARTING_ENERGY: {
							const restoreTarget = this.getMetaValue(action.target, action.generatedBy);
							const restoreAmount = restoreTarget.card.cost - restoreTarget.data.energy;
							if (restoreAmount > 0) {
								this.transformIntoActions({
									type: ACTION_EFFECT,
									effectType: EFFECT_TYPE_ADD_ENERGY_TO_CREATURE,
									target: restoreTarget,
									amount: restoreAmount,
									player: action.player,
									generatedBy: action.generatedBy,
								});
							}
							break;
						}
						case EFFECT_TYPE_PAYING_ENERGY_FOR_POWER: {
							const payingTarget = this.getMetaValue(action.target, action.generatedBy);
							const payingAmount = this.getMetaValue(action.amount, action.generatedBy);

							if (payingAmount > 0) {
								this.transformIntoActions({
									type: ACTION_EFFECT,
									effectType: EFFECT_TYPE_DISCARD_ENERGY_FROM_CREATURE,
									target: payingTarget,
									amount: payingAmount,
									player: action.player,
									generatedBy: action.generatedBy,
								});
							}
							break;
						}
						case EFFECT_TYPE_ADD_ENERGY_TO_CREATURE: {
							const addTarget = this.getMetaValue(action.target, action.generatedBy);

							addTarget.addEnergy(this.getMetaValue(action.amount, action.generatedBy));
							break;
						}
						case EFFECT_TYPE_ADD_ENERGY_TO_MAGI: {
							const magiTarget = this.getMetaValue(action.target, action.generatedBy);

							oneOrSeveral(magiTarget, target => target.addEnergy(this.getMetaValue(action.amount, action.generatedBy)));                            
							break;
						}
						case EFFECT_TYPE_DISCARD_CREATURE_OR_RELIC: {
							const discardTargets = this.getMetaValue(action.target, action.generatedBy);
							oneOrSeveral(discardTargets, target => {
								const targetType = target.card.type;
								if (targetType === TYPE_CREATURE) {
									this.transformIntoActions({
										type: ACTION_EFFECT,
										effectType: EFFECT_TYPE_DISCARD_CREATURE_FROM_PLAY,
										target,
										generatedBy: action.generatedBy,
									});
								} else if (targetType === TYPE_RELIC) {
									this.transformIntoActions({
										type: ACTION_EFFECT,
										effectType: EFFECT_TYPE_DISCARD_RELIC_FROM_PLAY,
										target,
										generatedBy: action.generatedBy,
									});
								}
							});
							break;
						}
						case EFFECT_TYPE_DISCARD_RELIC_FROM_PLAY: {
							const relicDiscardTarget = this.getMetaValue(action.target, action.generatedBy);

							oneOrSeveral(relicDiscardTarget, relic => {
								this.transformIntoActions({
									type: ACTION_EFFECT,
									effectType: EFFECT_TYPE_MOVE_CARD_BETWEEN_ZONES,
									target: relic,
									sourceZone: ZONE_TYPE_IN_PLAY,
									destinationZone: ZONE_TYPE_DISCARD,
									generatedBy: action.generatedBy,
								});
							});
							break;
						}
						case EFFECT_TYPE_DISCARD_CREATURE_FROM_PLAY: {
							const creatureDiscardTarget = this.getMetaValue(action.target, action.generatedBy);

							oneOrSeveral(creatureDiscardTarget, creature => {
								this.transformIntoActions({
									type: ACTION_EFFECT,
									effectType: EFFECT_TYPE_MOVE_CARD_BETWEEN_ZONES,
									target: creature,
									sourceZone: ZONE_TYPE_IN_PLAY,
									destinationZone: ZONE_TYPE_DISCARD,
									generatedBy: action.generatedBy,
								});
							});
							break;
						}
					}
					break;
				}
			} // switch (action.type)
		} // while(this.hasActions())
	}
}

module.exports = {
	State,

	TYPE_CREATURE,
	TYPE_MAGI,
	TYPE_RELIC,
	TYPE_SPELL,

	PREPARATION_ACTION_CHOOSE_MAGI,
	PREPARATION_ACTION_CHOOSE_STARTING_CARDS,

	ACTION_DRAW,
	ACTION_PASS,
	ACTION_PLAY,
	ACTION_POWER,
	ACTION_EFFECT,
	ACTION_SELECT,
	ACTION_CALCULATE,
	ACTION_ENTER_PROMPT,
	ACTION_RESOLVE_PROMPT,
	ACTION_GET_PROPERTY_VALUE,
	ACTION_ATTACK,
	ACTION_RESHUFFLE_DISCARD,
	ACTION_PLAYER_WINS,

	PROPERTY_ID,
	PROPERTY_TYPE,
	PROPERTY_CONTROLLER,
	PROPERTY_ENERGY_COUNT,
	PROPERTY_REGION,
	PROPERTY_COST,
	PROPERTY_ENERGIZE,
	PROPERTY_STARTING_ENERGY,
	PROPERTY_MAGI_STARTING_ENERGY,
	PROPERTY_ATTACKS_PER_TURN,
	PROPERTY_CAN_ATTACK_MAGI_DIRECTLY,

	CALCULATION_SET,
	CALCULATION_DOUBLE,
	CALCULATION_ADD,
	CALCULATION_SUBTRACT,
	CALCULATION_HALVE_ROUND_DOWN,
	CALCULATION_HALVE_ROUND_UP,
	CALCULATION_MIN,
	CALCULATION_MAX,

	SELECTOR_CREATURES,
	SELECTOR_CREATURES_AND_MAGI,
	SELECTOR_OWN_MAGI,
	SELECTOR_ENEMY_MAGI,
	SELECTOR_ACTIVE_MAGI_OF_PLAYER,
	SELECTOR_CREATURES_OF_REGION,
	SELECTOR_CREATURES_NOT_OF_REGION,
	SELECTOR_OWN_CREATURES,
	SELECTOR_ENEMY_CREATURES,
	SELECTOR_TOP_MAGI_OF_PILE,
	SELECTOR_MAGI_OF_REGION,
	SELECTOR_OPPONENT_ID,
	SELECTOR_MAGI_NOT_OF_REGION,
	SELECTOR_OWN_CARDS_WITH_ENERGIZE_RATE,
	SELECTOR_CARDS_WITH_ENERGIZE_RATE,
	SELECTOR_OWN_CARDS_IN_PLAY,

	NO_PRIORITY,
	PRIORITY_PRS,
	PRIORITY_ATTACK,
	PRIORITY_CREATURES,

	PROMPT_TYPE_NUMBER,
	PROMPT_TYPE_SINGLE_CREATURE,
	PROMPT_TYPE_SINGLE_MAGI,
	PROMPT_TYPE_ANY_CREATURE_EXCEPT_SOURCE,
	PROMPT_TYPE_CHOOSE_CARDS,

	EFFECT_TYPE_DRAW,
	EFFECT_TYPE_RESHUFFLE_DISCARD,
	EFFECT_TYPE_MOVE_ENERGY,
	EFFECT_TYPE_ROLL_DIE,
	EFFECT_TYPE_PLAY_CREATURE,
	EFFECT_TYPE_PLAY_RELIC,
	EFFECT_TYPE_PLAY_SPELL,
	EFFECT_TYPE_CREATURE_ENTERS_PLAY,
	EFFECT_TYPE_RELIC_ENTERS_PLAY,
	EFFECT_TYPE_MAGI_IS_DEFEATED,
	EFFECT_TYPE_DISCARD_ENERGY_FROM_MAGI,
	EFFECT_TYPE_PAYING_ENERGY_FOR_CREATURE,
	EFFECT_TYPE_PAYING_ENERGY_FOR_RELIC,
	EFFECT_TYPE_PAYING_ENERGY_FOR_SPELL,
	EFFECT_TYPE_MOVE_CARD_BETWEEN_ZONES,
	EFFECT_TYPE_STARTING_ENERGY_ON_CREATURE,
	EFFECT_TYPE_ADD_ENERGY_TO_CREATURE_OR_MAGI,
	EFFECT_TYPE_ADD_ENERGY_TO_CREATURE,
	EFFECT_TYPE_ADD_ENERGY_TO_MAGI,
	EFFECT_TYPE_ENERGIZE,
	EFFECT_TYPE_DISCARD_ENERGY_FROM_CREATURE,
	EFFECT_TYPE_DISCARD_CREATURE_OR_RELIC,
	EFFECT_TYPE_DISCARD_CREATURE_FROM_PLAY,
	EFFECT_TYPE_DISCARD_RELIC_FROM_PLAY,
	EFFECT_TYPE_RESTORE_CREATURE_TO_STARTING_ENERGY,
	EFFECT_TYPE_PAYING_ENERGY_FOR_POWER,
	EFFECT_TYPE_DISCARD_ENERGY_FROM_CREATURE_OR_MAGI,
	EFFECT_TYPE_CREATURE_DEFEATS_CREATURE,
	EFFECT_TYPE_CREATURE_IS_DEFEATED, // Possibly redundant
	EFFECT_TYPE_BEFORE_DAMAGE,
	EFFECT_TYPE_DEAL_DAMAGE,
	EFFECT_TYPE_AFTER_DAMAGE,
	EFFECT_TYPE_CREATURE_ATTACKS,
	EFFECT_TYPE_CREATURE_IS_ATTACKED,
	EFFECT_TYPE_START_OF_TURN,
	EFFECT_TYPE_END_OF_TURN,
	EFFECT_TYPE_MAGI_FLIPPED,
	EFFECT_TYPE_FIND_STARTING_CARDS,
	EFFECT_TYPE_DRAW_REST_OF_CARDS,

	REGION_UNIVERSAL,

	COST_X,
	
	ZONE_TYPE_HAND,
	ZONE_TYPE_IN_PLAY,
	ZONE_TYPE_DISCARD,
	ZONE_TYPE_ACTIVE_MAGI,
	ZONE_TYPE_MAGI_PILE,
	ZONE_TYPE_DECK,
	ZONE_TYPE_DEFEATED_MAGI,
};
