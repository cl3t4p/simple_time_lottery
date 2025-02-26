const { expect } = require("chai");
const { time,loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { solidityPackedKeccak256 } = require("ethers/hash");

function getCommit(player,salt) {
    const commitment = solidityPackedKeccak256(
        ["address", "uint256"],
        [player.address, salt]
      );
    return commitment;
}

describe("Lottery", function () {
    async function lotteryFixture() {
        let Lottery = await ethers.getContractFactory("Lottery");
        let lotteryDuration = 100000
        let revealDuration = 2000
        let ticketPrice = 1n
        let lottery = await Lottery.deploy(lotteryDuration,revealDuration, ticketPrice);
        let owner, addr1, addr2, addr3, addr4, addr5;
        [owner, addr1, addr2, addr3, addr4, addr5] = await ethers.getSigners();
        return { lottery, lotteryDuration,revealDuration, ticketPrice, addr1, addr2, addr3, addr4, addr5 };
    }



    it("Should deploy correctly and set initial values", async function () {
        const { lottery, lotteryDuration, revealDuration,ticketPrice } = await loadFixture(lotteryFixture);
        expect(await lottery.revealDuration()).to.equal(revealDuration);
        expect(await lottery.ticketPrice()).to.equal(ticketPrice);
        expect(await lottery.commitDuration()).to.equal(lotteryDuration);
    });


    it("Should allow users to buy tickets", async function () {
        const { lottery, ticketPrice, addr1 , addr2, addr3, addr4, addr5} = await loadFixture(lotteryFixture);


        let commit;
        let salt = 1n;
        commit = getCommit(addr1,salt);
        await lottery.connect(addr1).enterLottery(commit,{ value: ticketPrice });
        commit = getCommit(addr2,salt);
        await lottery.connect(addr2).enterLottery(commit,{ value: ticketPrice });
        commit = getCommit(addr3,salt);
        await lottery.connect(addr3).enterLottery(commit,{ value: ticketPrice });
        commit = getCommit(addr4,salt);
        await lottery.connect(addr4).enterLottery(commit,{ value: ticketPrice });
        commit = getCommit(addr5,salt);
        await lottery.connect(addr5).enterLottery(commit,{ value: ticketPrice });



        expect(await lottery.getPlayers()).to.have.lengthOf(5);
    });

    it("Should not allow entering with incorrect ticket price", async function () {
        const { lottery, addr1, ticketPrice } = await loadFixture(lotteryFixture);
        
        await expect(
            lottery.connect(addr1).enterLottery(getCommit(addr1,1n),{ value: ticketPrice + 1n })
        ).to.be.revertedWith("Invalid ticket price");
    });

    it("Should not allow entering after lottery time ends", async function () {
        const { lottery, addr1, ticketPrice, lotteryDuration } = await loadFixture(lotteryFixture);
        await time.increase(lotteryDuration + 1);

        await expect(
            lottery.connect(addr1).enterLottery(getCommit(addr1,1n),{ value: ticketPrice })
        ).to.be.revertedWith("Commit phase is over");
    });


    it("Should not allow picking a winner before time ends", async function () {
        const { lottery, addr1, ticketPrice } = await loadFixture(lotteryFixture);
        lottery.connect(addr1).enterLottery(getCommit(addr1,1n),{ value: ticketPrice })

        await expect(lottery.pickWinner()).to.be.revertedWith("Reveal phase is still ongoing");
    });

    it("Should reset lottery after picking a winner", async function () {
        const { lottery, addr1, ticketPrice, lotteryDuration,revealDuration } = await loadFixture(lotteryFixture);
        lottery.connect(addr1).enterLottery(getCommit(addr1,1n),{ value: ticketPrice })

        await time.increase(lotteryDuration + 1);

        lottery.connect(addr1).reveal(1n);

        await time.increase(revealDuration + 1);
        await lottery.pickWinner();

        expect(await lottery.getPlayers()).to.have.lengthOf(0);
    });

    it("Should allow picking a winner after time has passed", async function () {
        const { lottery, addr1, addr2, addr3, ticketPrice, lotteryDuration } = await loadFixture(lotteryFixture);
        lottery.connect(addr1).enterLottery(getCommit(addr1,1n),{ value: ticketPrice })
        lottery.connect(addr2).enterLottery(getCommit(addr2,1n),{ value: ticketPrice })
        lottery.connect(addr3).enterLottery(getCommit(addr3,1n),{ value: ticketPrice })

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