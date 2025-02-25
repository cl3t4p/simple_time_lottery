// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;



contract Lottery {
    uint256 public lotteryDuration;
    uint256 public lastDrawTime;
    address[] public players;

    uint256 public ticketPrice;
    bool private _extractionInProgress;

    event LotteryEntered(address indexed player);
    event WinnerSelected(address indexed winner, uint256 amount);

    constructor(uint256 _duration, uint256 _ticketPrice) {
        lotteryDuration = _duration;
        lastDrawTime = block.timestamp;
        ticketPrice = _ticketPrice;
        _extractionInProgress = false;
    }

    function enterLottery() external payable {
        require(msg.value == ticketPrice, "Invalid ticket price");
        require(
            block.timestamp < lastDrawTime + lotteryDuration,
            "Lottery is over"
        );

        players.push(msg.sender);
        emit LotteryEntered(msg.sender);
    }

    function pickWinner() public {
        require(
            block.timestamp >= lastDrawTime + lotteryDuration,
            "Lottery is not over yet"
        );
        require(players.length > 0, "No players in the lottery");
        require(!_extractionInProgress, "Lottery in progress");

        _extractionInProgress = true;
        uint256 winnerIndex = random() % players.length;
        address winner = players[winnerIndex];

        uint256 prizeAmount = address(this).balance;

        payable(winner).transfer(prizeAmount);
        emit WinnerSelected(winner, prizeAmount);
        resetLottery();
        _extractionInProgress = false;
    }

    function getPlayers() public view returns (address[] memory) {
        return players;
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function random() private view returns (uint256) {
        return
            uint256(
                keccak256(
                    abi.encodePacked(block.prevrandao, block.timestamp, players)
                )
            );
    }

    function resetLottery() private {
        players = new address[](0);
        lastDrawTime = block.timestamp;
    }
}
