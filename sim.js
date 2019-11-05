function Spell(name, cond, effect, cd, onGCD, maxCharge, castTime, resourceGain) {
	this.name = name;
	this.effect = effect;
	this.cond = cond;
	this.recharge = 0;
	this.cd = cd;
	this.onGCD = onGCD;
	this.charges = maxCharge;
	this.maxCharge = maxCharge;
	this.castTime = castTime;
	this.timeLastUsed = -10000;
	this.ticksSinceLastUsed = 0;
	this.dmgMod = 1;
	this.resourceGain = resourceGain;
}
function Player(spellpower, atkpower, crit, haste, vers, weapon1, weapon2, class_str, talent) {
	this.spellpower = spellpower;
	this.atkpower = atkpower;
	this.crit = crit;
	this.haste = haste;
	this.vers = vers;
	this.weapon1 = weapon1;
	this.weapon2 = weapon2;
	this.class_str = class_str;
	this.resource = 0;
	this.maxResource = CLASSES[class_str].maxResource;
	this.talent = talent;
	this.buffs = new BuffList();
	this.gcd = () => Math.max(CLASSES[class_str].gcd * (1 - haste), 0.75);
	this.addResource = (delta) => this.resource = Math.max(Math.min(this.resource + delta, this.maxResource), 0);
	this.dmgMod = 1 + vers;
	this.lastCastTime = 0;
	this.reset = () => {
		this.resource = 0;
		this.buffs = new BuffList();
		this.lastCastTime = 0;
		this.dmgMod = 1 + vers;
	}
}
function Dummy() {
	this.debuffs = new BuffList();
	this.dmgTaken = 0;
}
function Buff(name, maxStack, onApp, onFade, onStackUp, onStackDown, onTick, scheduleNext) {
	this.name = name;
	this.stacks = 0;
	this.maxStack = maxStack;
	this.onApp = onApp;
	this.onFade = onFade;
	this.gainStack = (player, target) => {
		if (this.stacks === this.maxStack) return;
		onStackUp(player, target);
	};
	this.loseStack = (player, target) => {
		onStackDown(player, target);
		if (--this.stacks === 0) player.buffs.remove(name);
	}
	this.onTick = onTick;
	this.scheduleNext = scheduleNext;
	this.timeLastTick = -10000;
	this.ticks = 0;
	this.timeLastApp = -10000;
	this.dmgMult = 1;
}
function Talent(name, onSelect) {
	this.name = name;
	this.onSelect = onSelect;
	this.onDeselect = onDeselect;
}
function ActListItem(spell, cond) {
	this.spell = spell;
	this.cond = cond;
}
function ActList(list) {
	const actions = list;
	this.next = function(player, target) {
		for (let i = 0; i < actions.length; i++) {
			if (actions[i].cond(player, target) && actions[i].spell.cond(player, target)) return actions[i].spell;
		}
		return null;
	}
}
function Event(time, name, type, effect, scheduleNext) {
	this.time = time;
	this.name = name;
	this.type = type;
	this.effect = effect;
	this.scheduleNext = scheduleNext;
	this.toString = () => time.toFixed(2) + ": " + name + " (" + type + ")";
}
function BuffList() {
	let buffs = [];
	this.get = function(name) {
		for (let b of buffs)
			if (b.name == name) return b;
		return null;
	};
	this.add = function(buff) {
		buffs.push(buff);
		buff.onApp;
	};
	this.remove = function(name) {
		for (let i = 0; i < buffs.length; i++) {
			if (buffs[i].name === name) {
				buffs[i].onFade;
				return buffs.splice(i, 1);
			}
		}
	};
	this.has = function(name) {
		return this.get(name) !== null;
	}
	this.view = () => buffs;
}
function Weapon(dmg, speed, effect) {
	this.dmg = dmg;
	this.speed = speed;
	this.effect = effect;
}
function Proc(event, cond) {
	this.event = event;
	this.cond = cond;
}
function rppmChance(ppm, lastProc, haste) {
	return Math.max(1.0, 1.0 + 3.0 * (lastProc * (ppm * (1 + haste)) / 60.0 - 1.5)) * ((ppm * (1 + haste)) / 60) * Math.min(lastProc, 10);
}
const TRUE = (player, target) => true;
const NO_NEXT = function (player, target, prev){};
const NO_EFFECT = function (player, target){};
const CLASSES = {
	DRUID$BALANCE: {
		gcd: 1.5,
		maxResource: 100,
		useWeapon1: false,
		useWeapon2: false
	},
	ROGUE$OUTLAW: {
		gcd: 1.5,
		maxResource: 100,
		useWeapon1: true,
		useWeapon2: true
	}
}

function sim(player) {
	const CRIT = () => Math.random() <= player.crit ? 2 : 1;
	const HASTE = () => 1 - player.haste;
	let q, target;

	const SPELLS = {
		DRUID$BALANCE: {
			SOLAR_WRATH: new Spell("SOLAR_WRATH", TRUE, (player, target) => {
				let crit = CRIT(), dmg = 0.5 * player.spellpower * player.dmgMod * SPELLS.DRUID$BALANCE.SOLAR_WRATH.dmgMod * crit;
				target.dmgTaken += dmg;
				player.addResource(SPELLS.DRUID$BALANCE.SOLAR_WRATH.resourceGain);
				player.buffs.remove("STARSURGE::SOLAR_EMPOWERMENT");
				return new InternalEvent("ACTION::SOLAR_WRATH", dmg, crit === 2, true);
			}, 0, true, 1, 1.5, 8),
			MOONFIRE: new Spell("MOONFIRE", TRUE, (player, target) => {
				let crit = CRIT(), dmg = 0.12 * player.spellpower * player.dmgMod * SPELLS.DRUID$BALANCE.MOONFIRE.dmgMod * crit;
				target.dmgTaken += dmg;
				player.addResource(SPELLS.DRUID$BALANCE.MOONFIRE.resourceGain);
				if (!target.debuffs.has("MOONFIRE")) {
					q.push(new Event(q.time + 2 * HASTE(), "MOONFIRE::TICK", "DOT", BUFFS.DRUID$BALANCE.MOONFIRE.onTick, BUFFS.DRUID$BALANCE.MOONFIRE.scheduleNext));
					target.debuffs.add(BUFFS.DRUID$BALANCE.MOONFIRE);
				}
				BUFFS.DRUID$BALANCE.MOONFIRE.timeLastApp = q.time;
				return new InternalEvent("ACTION::MOONFIRE", dmg, crit === 2, true);
			}, 0, true, 1, 0, 3),
			STARSURGE: new Spell("STARSURGE", (player, target) => player.resource >= 40, (player, target) => {
				let crit = CRIT(), dmg = 2.0 * player.spellpower * player.dmgMod * SPELLS.DRUID$BALANCE.STARSURGE.dmgMod * crit;
				target.dmgTaken += dmg;
				player.addResource(SPELLS.DRUID$BALANCE.STARSURGE.resourceGain);
				if (!player.buffs.has("STARSURGE::SOLAR_EMPOWERMENT")) player.buffs.add(BUFFS.DRUID$BALANCE.STARSURGE$SOLAR_EMPOWERMENT);
				if (!player.buffs.has("STARSURGE::LUNAR_EMPOWERMENT")) player.buffs.add(BUFFS.DRUID$BALANCE.STARSURGE$LUNAR_EMPOWERMENT);
				return new InternalEvent("ACTION::STARSURGE", dmg, crit === 2, true);
			}, 0, true, 1, 0, -40),
			LUNAR_STRIKE: new Spell("LUNAR_STRIKE", TRUE, (player, target) => {
				let crit = CRIT(), dmg = 0.62 * player.spellpower * player.dmgMod * SPELLS.DRUID$BALANCE.LUNAR_STRIKE.dmgMod * crit;
				target.dmgTaken += dmg;
				player.addResource(SPELLS.DRUID$BALANCE.LUNAR_STRIKE.resourceGain);
				player.buffs.remove("STARSURGE::LUNAR_EMPOWERMENT");
				if (player.buffs.has("WARRIOR_OF_ELUNE")) player.buffs.get("WARRIOR_OF_ELUNE").loseStack(player, target);
				return new InternalEvent("ACTION::LUNAR_STRIKE", dmg, crit === 2, true);
			}, 0, true, 1, 2.25, 12),
			SUNFIRE: new Spell("SUNFIRE", TRUE, (player, target) => {
				let crit = CRIT(), dmg = 0.17 * player.spellpower * player.dmgMod * SPELLS.DRUID$BALANCE.SUNFIRE.dmgMod * crit;
				target.dmgTaken += dmg;
				player.addResource(SPELLS.DRUID$BALANCE.SUNFIRE.resourceGain);
				if (!target.debuffs.has("SUNFIRE")) {
					q.push(new Event(q.time + 2 * HASTE(), "SUNFIRE::TICK", "DOT", BUFFS.DRUID$BALANCE.SUNFIRE.onTick, BUFFS.DRUID$BALANCE.SUNFIRE.scheduleNext));
					target.debuffs.add(BUFFS.DRUID$BALANCE.SUNFIRE);
				}
				BUFFS.DRUID$BALANCE.SUNFIRE.timeLastApp = q.time;
				return new InternalEvent("ACTION::SUNFIRE", dmg, crit === 2, true);
			}, 0, true, 1, 0, 3),
			WARRIOR_OF_ELUNE: new Spell("WARRIOR_OF_ELUNE", (player, target) => {
				return player.talent === "WARRIOR_OF_ELUNE" && q.time - SPELLS.DRUID$BALANCE.WARRIOR_OF_ELUNE.timeLastUsed >= SPELLS.DRUID$BALANCE.WARRIOR_OF_ELUNE.cd;
			}, (player, target) => {
				SPELLS.DRUID$BALANCE.WARRIOR_OF_ELUNE.timeLastUsed = q.time;
				player.buffs.add(BUFFS.DRUID$BALANCE.WARRIOR_OF_ELUNE);
				player.buffs.get("WARRIOR_OF_ELUNE").stacks = 3;
				return new InternalEvent("ACTION::WARRIOR_OF_ELUNE", 0, false, true);
			}, 45, true, 1, 0, 0)
		},
		ROGUE$OUTLAW: {
			SINISTER_STRIKE: new Spell("SINISTER_STRIKE", (player, target) => {
				return
			})
		}
	};
	const BUFFS = {
		DRUID$BALANCE: {
			MOONFIRE: new Buff("MOONFIRE", 1, NO_EFFECT, NO_EFFECT, NO_EFFECT, NO_EFFECT, (player, target) => {
				let crit = CRIT(), dmg = 0.052 * player.spellpower * player.dmgMod * SPELLS.DRUID$BALANCE.MOONFIRE.dmgMod * crit * ((q.time - Math.max(BUFFS.DRUID$BALANCE.MOONFIRE.timeLastTick, BUFFS.DRUID$BALANCE.MOONFIRE.timeLastApp)) / (2 * HASTE()));
				target.dmgTaken += dmg;
				if (q.time - BUFFS.DRUID$BALANCE.MOONFIRE.timeLastApp > 22)
					target.debuffs.remove("MOONFIRE");
				BUFFS.DRUID$BALANCE.MOONFIRE.timeLastTick = Math.min(q.time, BUFFS.DRUID$BALANCE.MOONFIRE.timeLastApp + 22);
				return new InternalEvent("MOONFIRE::TICK", dmg, crit === 2, true);
			}, (player, target, prev) => {
				if (target.debuffs.has("MOONFIRE"))
					q.push(new Event(prev.time + 2 * HASTE(), "MOONFIRE::TICK", "DOT", BUFFS.DRUID$BALANCE.MOONFIRE.onTick, BUFFS.DRUID$BALANCE.MOONFIRE.scheduleNext));
			}),
			STARSURGE$SOLAR_EMPOWERMENT: new Buff("STARSURGE::SOLAR_EMPOWERMENT", 1, (player, target) => {
				SPELLS.DRUID$BALANCE.SOLAR_WRATH.castTime *= 0.85;
			}, (player, target) => {
				SPELLS.DRUID$BALANCE.SOLAR_WRATH.castTime /= 0.85;
			}, NO_EFFECT, NO_EFFECT, NO_EFFECT, NO_NEXT),
			STARSURGE$LUNAR_EMPOWERMENT: new Buff("STARSURGE::LUNAR_EMPOWERMENT", 1, (player, target) => {
				SPELLS.DRUID$BALANCE.LUNAR_STRIKE.castTime *= 0.85;
			}, (player, target) => {
				SPELLS.DRUID$BALANCE.LUNAR_STRIKE.castTime /= 0.85;
			}, NO_EFFECT, NO_EFFECT, NO_EFFECT, NO_NEXT),
			SUNFIRE: new Buff("SUNFIRE", 1, NO_EFFECT, NO_EFFECT, NO_EFFECT, NO_EFFECT, (player, target) => {
				let crit = CRIT(), dmg = 0.06 * player.spellpower * player.dmgMod * SPELLS.DRUID$BALANCE.SUNFIRE.dmgMod * crit * ((q.time - Math.max(BUFFS.DRUID$BALANCE.SUNFIRE.timeLastTick, BUFFS.DRUID$BALANCE.SUNFIRE.timeLastApp)) / (2 * HASTE()));
				target.dmgTaken += dmg;
				if (q.time - BUFFS.DRUID$BALANCE.SUNFIRE.timeLastApp > 18)
					target.debuffs.remove("SUNFIRE");
				BUFFS.DRUID$BALANCE.SUNFIRE.timeLastTick = Math.min(q.time, BUFFS.DRUID$BALANCE.SUNFIRE.timeLastApp + 18);
				return new InternalEvent("SUNFIRE::TICK", dmg, crit === 2, true);
			}, (player, target, prev) => {
				if (target.debuffs.has("SUNFIRE"))
					q.push(new Event(prev.time + 2 * HASTE(), "SUNFIRE::TICK", "DOT", BUFFS.DRUID$BALANCE.SUNFIRE.onTick, BUFFS.DRUID$BALANCE.SUNFIRE.scheduleNext));
			}),
			WARRIOR_OF_ELUNE: new Buff("WARRIOR_OF_ELUNE", 1, (player, target) => {
				SPELLS.DRUID$BALANCE.LUNAR_STRIKE.resourceGain *= 1.4;
				SPELLS.DRUID$BALANCE.LUNAR_STRIKE.prevCastTime = SPELLS.DRUID$BALANCE.LUNAR_STRIKE.castTime;
				SPELLS.DRUID$BALANCE.LUNAR_STRIKE.castTime = 0;
			}, (player, target) => {
				SPELLS.DRUID$BALANCE.LUNAR_STRIKE.resourceGain /= 1.4;
				SPELLS.DRUID$BALANCE.LUNAR_STRIKE.castTime = SPELLS.DRUID$BALANCE.LUNAR_STRIKE.prevCastTime;
			}, NO_EFFECT, NO_EFFECT, NO_EFFECT, NO_NEXT)
		}
	};
	const ACTION_LISTS = {
		DRUID$BALANCE: new ActList([
			new ActListItem(SPELLS.DRUID$BALANCE.MOONFIRE, (player, target) => q.time - BUFFS.DRUID$BALANCE.MOONFIRE.timeLastApp + player.gcd() >= 16),
			new ActListItem(SPELLS.DRUID$BALANCE.SUNFIRE, (player, target) => q.time - BUFFS.DRUID$BALANCE.SUNFIRE.timeLastApp + player.gcd() >= 12),
			new ActListItem(SPELLS.DRUID$BALANCE.WARRIOR_OF_ELUNE, TRUE),
			new ActListItem(SPELLS.DRUID$BALANCE.LUNAR_STRIKE, (player, target) => player.talent === "WARRIOR_OF_ELUNE" && player.buffs.has("WARRIOR_OF_ELUNE") && player.resource + SPELLS.DRUID$BALANCE.LUNAR_STRIKE.resourceGain <= player.maxResource),
			new ActListItem(SPELLS.DRUID$BALANCE.STARSURGE, (player, target) => !player.buffs.has("STARSURGE::SOLAR_EMPOWERMENT") && !player.buffs.has("STARSURGE::LUNAR_EMPOWERMENT")),
			new ActListItem(SPELLS.DRUID$BALANCE.LUNAR_STRIKE, (player, target) => player.buffs.has("STARSURGE::LUNAR_EMPOWERMENT")),
			new ActListItem(SPELLS.DRUID$BALANCE.SOLAR_WRATH, TRUE)
		])
	};
	const PRECOMBAT_EVENTS = {
		DRUID$BALANCE: {
			MOONKIN_FORM: [
				new Proc(new Event(-1, "STANCE::MOONKIN_FORM", "STANCE", (player, target) => {
					player.dmgMod *= 1.1;
				}, NO_NEXT), TRUE)
			],
			NATURES_BALANCE: [
				new Proc(new Event(-1, "TALENT::NATURES_BALANCE::OOC_RSRC_REFILL", "TALENT", (player, target) => {
					player.addResource(50);
				}, NO_NEXT), (player, target) => player.talent === "NATURES_BALANCE"),
				new Proc(new Event(0.75, "TALENT::NATURES_BALANCE::RSRC_GAIN", "TALENT", (player, target) => {
					player.addResource(1);
				}, (player, target, prev) => {
					q.push(new Event(prev.time + 0.75, "TALENT::NATURES_BALANCE::RSRC_GAIN", "TALENT", (player, target) => {
						player.addResource(1);
					}, PRECOMBAT_EVENTS.DRUID$BALANCE.NATURES_BALANCE[1].event.scheduleNext));
				}), (player, target) => player.talent === "NATURES_BALANCE")
			]
		}
	}
	this.run = function(limit, log) {
		q = new TinyQueue([], (a, b) => a.time - b.time);
		q.time = 0;
		target = new Dummy();
		player.reset();

		for (k of Object.keys(PRECOMBAT_EVENTS[player.class_str]))
			for (e of PRECOMBAT_EVENTS[player.class_str][k])
				if (e.cond(player, target)) q.push(e.event);

		let open = ACTION_LISTS[player.class_str].next(player, target);
		let openEvent = new Event(0, "ACTION::UNDECIDED", "PLAYER_ACTION", (player, target) => {
				let s = ACTION_LISTS[player.class_str].next(player, target);
				openEvent.name = s.name;
				player.lastCastTime = open.castTime * HASTE();
				return s.effect(player, target);
			}, (player, target, prev) => {
				let e = new Event(prev.time + Math.max(player.gcd(), player.lastCastTime * HASTE()), "ACTION::UNDECIDED", "PLAYER_ACTION", (player, target) => {
					let s = ACTION_LISTS[player.class_str].next(player, target);
					e.name = s.name;
					player.lastCastTime = s.castTime * HASTE();
					return s.effect(player, target);
				}, openEvent.scheduleNext)
				q.push(e);
		});
		q.push(openEvent);

		let last, cur, lastdmg = 0;
		const DEBUG = log !== undefined && log !== null;
		while ((q.time = (cur = q.pop()).time) <= limit) {
			let e = cur.effect(player, target);
			cur.scheduleNext(player, target, cur);
			if (DEBUG && e !== undefined) {log.log(new LogEvent(q.time.toFixed(2), cur.type, cur.name, e.dmg, e.isCrit))};
			last = cur;
			lastdmg = target.dmgTaken;
		}
		if (log !== undefined && log !== null) log.time = Math.max(q.time, limit);
		return target.dmgTaken / limit;
	}
}
