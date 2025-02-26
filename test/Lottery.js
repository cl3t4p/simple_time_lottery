const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time,loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Lottery", function () {
    async function lotteryFixture() {
        let Lottery = await ethers.getContractFactory("Lottery");
        let lotteryDuration = 100000
        let ticketPrice = 1n
        let lottery = await Lottery.deploy(lotteryDuration, ticketPrice);
        let owner, addr1, addr2, addr3, addr4, addr5;
        [owner, addr1, addr2, addr3, addr4, addr5] = await ethers.getSigners();
        return { lottery, lotteryDuration, ticketPrice, addr1, addr2, addr3, addr4, addr5 };
    }



    it("Should deploy correctly and set initial values", async function () {
        const { lottery, lotteryDuration, ticketPrice } = await loadFixture(lotteryFixture);
        expect((await lottery.lotteryDuration()).toString()).to.equal(lotteryDuration.toString());
        expect((await lottery.ticketPrice()).toString()).to.equal(ticketPrice.toString());
    });


    it("Should allow users to buy tickets", async function () {
        const { lottery, ticketPrice, addr1 , addr2, addr3, addr4, addr5} = await loadFixture(lotteryFixture);
        await lottery.connect(addr1).enterLottery({ value: ticketPrice });
        await lottery.connect(addr2).enterLottery({ value: ticketPrice });
        await lottery.connect(addr3).enterLottery({ value: ticketPrice });
        await lottery.connect(addr4).enterLottery({ value: ticketPrice });
        await lottery.connect(addr5).enterLottery({ value: ticketPrice });

        await lottery.connect(addr1).enterLottery({ value: ticketPrice });


        expect(await lottery.getPlayers()).to.have.lengthOf(6);
    });

    it("Should not allow entering with incorrect ticket price", async function () {
        const { lottery, addr1, ticketPrice } = await loadFixture(lotteryFixture);
        await expect(
            lottery.connect(addr1).enterLottery({ value: ticketPrice + 1n })
        ).to.be.revertedWith("Invalid ticket price");
    });

    it("Should not allow entering after lottery time ends", async function () {
        const { lottery, addr1, ticketPrice, lotteryDuration } = await loadFixture(lotteryFixture);
        await time.increase(lotteryDuration + 1);

        await expect(
            lottery.connect(addr1).enterLottery({ value: ticketPrice })
        ).to.be.revertedWith("Lottery is over");
    });


    it("Should not allow picking a winner before time ends", async function () {
        const { lottery, addr1, ticketPrice } = await loadFixture(lotteryFixture);
        await lottery.connect(addr1).enterLottery({ value: ticketPrice });

        await expect(lottery.pickWinner()).to.be.revertedWith("Lottery is not over yet");
    });

    it("Should reset lottery after picking a winner", async function () {
        const { lottery, addr1, ticketPrice, lotteryDuration } = await loadFixture(lotteryFixture);
        await lottery.connect(addr1).enterLottery({ value: ticketPrice });

        await time.increase(lotteryDuration + 1);

        await lottery.pickWinner();

        expect(await lottery.getPlayers()).to.have.lengthOf(0);
    });

    it("Should allow picking a winner after time has passed", async function () {
        const { lottery, addr1, addr2, addr3, ticketPrice, lotteryDuration } = await loadFixture(lotteryFixture);
        await lottery.connect(addr1).enterLottery({ value: ticketPrice });
        await lottery.connect(addr2).enterLottery({ value: ticketPrice });
        await lottery.connect(addr3).enterLottery({ value: ticketPrice });

        let map_balance = new Map();
        // Get initial balances
        map_balance.set(addr1.address, await ethers.provider.getBalance(addr1.address));
        map_balance.set(addr2.address, await ethers.provider.getBalance(addr2.address));
        map_balance.set(addr3.address, await ethers.provider.getBalance(addr3.address));

        // Simulate time passing
        await time.increase(lotteryDuration + 1);

        // Pick a winner
        const tx = await lottery.pickWinner();
        // Wait for the transaction and capture the receipt
        const receipt = await tx.wait();

        // Extract event logs
        const event = receipt.logs.find(e => e.fragment.name === "WinnerSelected");
        expect(event).to.not.be.undefined;




        // Get the balance after winning
        const winnerAddress = receipt.logs[0].args[0];
        const prizeAmount = receipt.logs[0].args[1];


        // Check if the winner has received the prize
        expect(await ethers.provider.getBalance(winnerAddress)).to.equal(map_balance.get(winnerAddress) + prizeAmount);
    });
});