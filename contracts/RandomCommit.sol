// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library SecureRandom {
    struct PlayerCommit {
        bytes32 commitment;
        uint256 salt;
        bool hasRevealed;
    }

    // Generate the commit hash using only the wallet address + salt
    function createCommit(address player, uint256 salt) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(player, salt));
    }

    // Verify if the revealed salt matches the original commitment
    function verifyReveal(bytes32 commitment, address player, uint256 salt) internal pure returns (bool) {
        return keccak256(abi.encodePacked(player, salt)) == commitment;
    }

    // Generate a final random number using all revealed salts
    function generateFinalRandom(address[] memory players, uint256[] memory revealedSalts) internal pure returns (uint256) {
        require(players.length == revealedSalts.length, "Mismatch between players and revealed salts");

        bytes32 finalSeed;

        for (uint256 i = 0; i < players.length; i++) {
            finalSeed = keccak256(abi.encodePacked(finalSeed, revealedSalts[i], players[i]));
        }

        return uint256(finalSeed);
    }
}
