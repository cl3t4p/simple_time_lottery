// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./RandomCommit.sol";

contract Lottery {
    using SecureRandom for *;

    uint256 public commitDeadline;
    uint256 public revealDeadline;
    uint256 public commitDuration;
    uint256 public revealDuration;

    uint256 public ticketPrice;
    bool private _extractionInProgress;
    bool private _commitPhase;

    mapping(address => SecureRandom.PlayerCommit) public playerCommits;
    address[] public players;

    event LotteryEntered(address indexed player);
    event WinnerSelected(address indexed winner, uint256 amount);
    event Committed(address indexed player);
    event Revealed(address indexed player, uint256 salt);

    constructor(uint256 _commitDuration, uint256 _revealDuration, uint256 _ticketPrice) {
        commitDuration = _commitDuration;
        revealDuration = _revealDuration;
        commitDeadline = block.timestamp + _commitDuration;
        revealDeadline = commitDeadline + _revealDuration;
        ticketPrice = _ticketPrice;
        _extractionInProgress = false;
        _commitPhase = true;
    }

    // **Commit Phase: Players must send a hash before `commitDeadline`**
    function enterLottery(bytes32 commitment) external payable {
        require(block.timestamp < commitDeadline, "Commit phase is over");
        require(msg.value == ticketPrice, "Invalid ticket price");
        require(playerCommits[msg.sender].commitment == bytes32(0), "Already committed");

        players.push(msg.sender);
        playerCommits[msg.sender] = SecureRandom.PlayerCommit(commitment, 0, false);

        emit Committed(msg.sender);
    }

    // **Reveal Phase: Players must reveal before `revealDeadline`**
    function reveal(uint256 _salt) external {
        require(block.timestamp >= commitDeadline, "Commit phase still ongoing");
        require(block.timestamp < revealDeadline, "Reveal phase is over");
        require(playerCommits[msg.sender].commitment != bytes32(0), "You did not commit");
        require(!playerCommits[msg.sender].hasRevealed, "Already revealed");

        require(SecureRandom.verifyReveal(playerCommits[msg.sender].commitment, msg.sender, _salt), "Invalid reveal");

        playerCommits[msg.sender].salt = _salt;
        playerCommits[msg.sender].hasRevealed = true;


        emit Revealed(msg.sender, _salt);
    }

    // **Pick the winner after the reveal deadline**
    function pickWinner() public {
        require(block.timestamp >= revealDeadline, "Reveal phase is still ongoing");
        require(players.length > 0, "No players in the lottery");
        require(!_extractionInProgress, "Lottery in progress");

        _extractionInProgress = true;
        _commitPhase = false;

        uint256[] memory revealedSalts = new uint256[](players.length);
        address[] memory revealedPlayers = new address[](players.length);

        uint count = 0;

        for (uint256 i = 0; i < players.length; i++) {
            //require(playerCommits[players[i]].hasRevealed, "Not all players have revealed");
            if(playerCommits[players[i]].hasRevealed == true){
                revealedSalts[count] = (playerCommits[players[i]].salt);
                revealedPlayers[count] = players[i];
                count++;
            }
        }
        // Generate secure random number
        uint256 randomValue = SecureRandom.generateFinalRandom(revealedPlayers, revealedSalts);
        uint256 winnerIndex = randomValue % players.length;
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

    function resetLottery() private {
        players = new address[](0);
        commitDeadline = block.timestamp + commitDuration;
        revealDeadline = commitDeadline + revealDuration;
        _extractionInProgress = false;
        _commitPhase = true;
    }
}
