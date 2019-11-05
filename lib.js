const toReadableNum = function(num) {
	if (isNaN(num)) return "0";
	let suffix = ["", "k", "M", "B"];
  let i = Math.max(Math.floor(parseInt(num.toExponential().split("e")[1]) / 3), 0);
  return parseFloat((num / Math.pow(10, 3 * i)).toFixed(i === 0 ? 0 : 2)) + suffix[i];
}
