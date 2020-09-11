function EventLog() {
  let events = [];
  this.log = e => events.push(e);
  this.clear = () => events = [];
  this.getEvents = () => events;
	const tablefyMeter = function(bars) {
		let meter = "", maxPercent = bars[0].dmgPercent;
		for (let b of bars) {
			let percent = Math.round((b.dmgPercent / maxPercent) * 100);
			meter += "<div class=\"barcontain\"><div class=\"barcontent\"><span>" + b.name + "</span>" +
				"<span>" + toReadableNum(b.dmg) + " (" + b.dmgPercent.toFixed(1) + "%)</span><div class=\"baroverlay\" style=\"width:" + percent + "%\">&nbsp;</div></div></div>";
		}
		return meter;
	}
	this.getDetails = () => {
		let map = new Map();
		for (let e of events) {
			if (!map.has(e.name)) map.set(e.name, []);
			map.get(e.name).push(e);
		}
		let iter = map.entries(), out = [], totalDmg = 0, time = events[events.length - 1].time;
		for (let i = 0; i < map.size; i++) {
			let spell = iter.next().value, curBar = {
				name: spell[0],
				dmg: 0,
				numNorm: 0,
				minNorm: Number.MAX_SAFE_INTEGER,
				maxNorm: 0,
				dmgNorm: 0,
				numCrit: 0,
				minCrit: Number.MAX_SAFE_INTEGER,
				maxCrit: 0,
				dmgCrit: 0,
				dps: 0,
				dmgPercent: 0
			};
			for (let e of spell[1]) {
				totalDmg += e.dmg;
				curBar.dmg += e.dmg;
				if (e.isCrit) {
					curBar.numCrit++;
					curBar.minCrit = Math.min(curBar.minCrit, e.dmg);
					curBar.maxCrit = Math.max(curBar.maxCrit, e.dmg);
					curBar.dmgCrit += e.dmg;
				} else {
					curBar.numNorm++;
					curBar.minNorm = Math.min(curBar.minNorm, e.dmg);
					curBar.maxNorm = Math.max(curBar.maxNorm, e.dmg);
					curBar.dmgNorm += e.dmg;
				}
			}
			out.push(curBar);
		}
		for (let bar of out) {
			bar.dmgPercent = (bar.dmg / totalDmg) * 100;
			bar.dps = bar.dmg / this.time;
			if (bar.numNorm === 0) bar.minNorm = 0;
			if (bar.numCrit === 0) bar.minCrit = 0;
		}
		this.details = out.sort((a, b) => b.dmg - a.dmg)
		return tablefyMeter(this.details);
	}
	this.getSpellDetails = (name) => {
		const spell = this.details.find(e => e.name === name);
    //Here be HTML
		const head = `<div class="barcontain detailsSpellBar"><div class="barcontent">
			<span>${spell.name}<br>Average: ${toReadableNum(spell.dmg / (spell.numCrit + spell.numNorm))}<br>Damage: ${toReadableNum(spell.dmg)}</span>
			<span style="text-align:right">Hits: ${spell.numNorm + spell.numCrit}<br><br>DPS: ${toReadableNum(spell.dps)}<br></span></div>
			<div class="baroverlay" style="width:100%">&nbsp;</div></div>`;
		const crits = `<div class="barcontain detailsSpellBar"><div class="barcontent">
			<span>Critical Hits<br>Min: ${toReadableNum(spell.minCrit)}<br>Average: ${toReadableNum(spell.dmgCrit / spell.numCrit)}</span>
			<span style="text-align:right">${spell.numCrit} [${((spell.numCrit / (spell.numCrit + spell.numNorm)) * 100).toFixed(1)}%]<br>Max: ${toReadableNum(spell.maxCrit)}<br>DPS: ${toReadableNum(spell.dmgCrit / this.time)}</span>
			<div class="baroverlay" style="width:${Math.round((spell.dmgCrit / spell.dmg) * 100)}%">&nbsp;</div></div></div>`;
		const norms = `<div class="barcontain detailsSpellBar"><div class="barcontent">
			<span>Normal Hits<br>Min: ${toReadableNum(spell.minNorm)}<br>Average: ${toReadableNum(spell.dmgNorm / spell.numNorm)}</span>
			<span style="text-align:right">${spell.numNorm} [${((spell.numNorm / (spell.numCrit + spell.numNorm)) * 100).toFixed(1)}%]<br>Max: ${toReadableNum(spell.maxNorm)}<br>DPS: ${toReadableNum(spell.dmgNorm / this.time)}</span>
			<div class="baroverlay" style="width:${Math.round((spell.dmgNorm / spell.dmg) * 100)}%">&nbsp;</div></div></div>`;
    return head + (e.dmgNorm !== 0 ? norms : "") + (e.dmgCrit !== 0 ? crits : "");
	}
}
const filterName = (events, f) => events.filter(e => e.name.indexOf(f) > -1);
const filterType = (events, f) => events.filter(e => e.type.indexOf(f) > -1);

function LogEvent(time, type, name, dmg, isCrit) {
  this.time = time;
  this.type = type;
  this.name = name;
  this.dmg = dmg;
	this.isCrit = isCrit;
  this.toString = () => time + " (" + type + ") " + name + " => " + dmg.toFixed(2);
}
function InternalEvent(name, dmg, isCrit, display) {
	this.name = name;
	this.dmg = dmg;
	this.isCrit = isCrit;
	this.display = display;
}
