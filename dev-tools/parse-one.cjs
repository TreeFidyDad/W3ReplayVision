// parse-one.cjs
const W3GReplay = require("w3gjs").default;

(async () => {
  try {
    const res = await new W3GReplay().parse("./w3c-20250517052820.w3g");
    console.dir(res.players, { depth: null });
  } catch (err) {
    console.error("  Parse failed:", err);
  }
})();
