
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("Lottery", (m) => {
  const lotteryDuration = 100000;n
  const ticketPrice = 1n;

  const lottery = m.contract("Lottery", [lotteryDuration, ticketPrice]);


  return { lottery };
});