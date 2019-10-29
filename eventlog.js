function EventLog() {
  let events = [];
  this.log = e => events.push(e);
  this.clear = () => events = [];
  this.getEvents = () => events;
}
const filterName = (events, f) => events.filter(e => e.name.includes(f));
const filterType = (events, f) => events.filter(e => e.type.includes(f));
const filterDmg = (events, f) => events.filter(e => e.dmg >= f);
function logEvent(time, type, name, dmg) {
  this.time = time;
  this.type = type;
  this.name = name;
  this.dmg = dmg;
  this.toString = () => time + " (" + type + "): " + name + " => " + dmg;
}
