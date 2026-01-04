// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title sBOND - Sentinel Bond Token
 * @author Sentinel AI Team
 * @notice A tokenized representation of government bonds for the Sentinel AI ecosystem
 * @dev RWA (Real World Asset) token simulating bond ownership with fixed yield
 * 
 * Features:
 * - Higher yield than gold (simulating bond interest)
 * - Faucet function for testnet testing
 * - Maturity date simulation
 */
contract SentinelBond is ERC20, ERC20Burnable, Ownable {
    
    // ============ Constants ============
    uint256 public constant FAUCET_AMOUNT = 1000 * 10**18;  // 1000 sBOND per faucet claim
    uint256 public constant FAUCET_COOLDOWN = 1 hours;       // Cooldown between claims
    uint256 public constant YIELD_RATE_BPS = 500;            // 5% yield rate (basis points)
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant BOND_FACE_VALUE = 100 * 10**18;  // $100 per bond
    
    // ============ State Variables ============
    mapping(address => uint256) public lastFaucetClaim;
    mapping(address => uint256) public lastYieldClaim;
    mapping(address => uint256) public depositTimestamp;
    
    // Bond maturity period (for demo: 1 day instead of years)
    uint256 public maturityPeriod = 1 days;
    
    // ============ Events ============
    event FaucetClaimed(address indexed user, uint256 amount);
    event YieldClaimed(address indexed user, uint256 amount);
    event BondMatured(address indexed user, uint256 amount);
    
    // ============ Constructor ============
    constructor() ERC20("Sentinel Bond", "sBOND") Ownable(msg.sender) {
        // Mint initial supply to deployer for liquidity
        _mint(msg.sender, 10_000_000 * 10**18); // 10M sBOND
    }
    
    // ============ Faucet Functions ============
    
    /**
     * @notice Claim free sBOND tokens from faucet (testnet only)
     * @dev Limited by cooldown period to prevent abuse
     */
    function claimFaucet() external {
        require(
            block.timestamp >= lastFaucetClaim[msg.sender] + FAUCET_COOLDOWN,
            "Faucet: Cooldown not finished"
        );
        
        lastFaucetClaim[msg.sender] = block.timestamp;
        depositTimestamp[msg.sender] = block.timestamp;
        
        _mint(msg.sender, FAUCET_AMOUNT);
        
        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }
    
    /**
     * @notice Check remaining cooldown time for faucet
     * @param user Address to check
     * @return Remaining seconds until next claim (0 if ready)
     */
    function faucetCooldownRemaining(address user) external view returns (uint256) {
        uint256 nextClaim = lastFaucetClaim[user] + FAUCET_COOLDOWN;
        if (block.timestamp >= nextClaim) {
            return 0;
        }
        return nextClaim - block.timestamp;
    }
    
    // ============ Yield Functions ============
    
    /**
     * @notice Calculate pending yield for a user
     * @param user Address to calculate yield for
     * @return Pending yield amount
     */
    function pendingYield(address user) public view returns (uint256) {
        if (depositTimestamp[user] == 0 || balanceOf(user) == 0) {
            return 0;
        }
        
        uint256 timeHeld = block.timestamp - 
            (lastYieldClaim[user] > depositTimestamp[user] ? lastYieldClaim[user] : depositTimestamp[user]);
        
        // Calculate yield: balance * rate * time / (365 days * BPS_DENOMINATOR)
        // For demo: accelerated yield (per hour instead of per year)
        uint256 yield_ = (balanceOf(user) * YIELD_RATE_BPS * timeHeld) / (1 hours * BPS_DENOMINATOR);
        
        return yield_;
    }
    
    /**
     * @notice Claim accumulated yield (bond interest)
     * @dev Yield is minted as new tokens
     */
    function claimYield() external {
        uint256 yield_ = pendingYield(msg.sender);
        require(yield_ > 0, "No yield to claim");
        
        lastYieldClaim[msg.sender] = block.timestamp;
        
        _mint(msg.sender, yield_);
        
        emit YieldClaimed(msg.sender, yield_);
    }
    
    // ============ Maturity Functions ============
    
    /**
     * @notice Check if user's bonds have matured
     * @param user Address to check
     * @return True if bonds have matured
     */
    function isMature(address user) public view returns (bool) {
        if (depositTimestamp[user] == 0) return false;
        return block.timestamp >= depositTimestamp[user] + maturityPeriod;
    }
    
    /**
     * @notice Get time until maturity
     * @param user Address to check
     * @return Seconds until maturity (0 if already mature)
     */
    function timeToMaturity(address user) external view returns (uint256) {
        if (depositTimestamp[user] == 0) return maturityPeriod;
        uint256 maturityTime = depositTimestamp[user] + maturityPeriod;
        if (block.timestamp >= maturityTime) return 0;
        return maturityTime - block.timestamp;
    }
    
    /**
     * @notice Get the USD value of a sBOND amount
     * @param amount Amount of sBOND tokens
     * @return USD value with 18 decimals
     */
    function getUSDValue(uint256 amount) external pure returns (uint256) {
        // Each sBOND = $100 face value
        return (amount * BOND_FACE_VALUE) / 10**18;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Mint tokens to address (owner only)
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @notice Update maturity period (owner only)
     * @param newPeriod New maturity period in seconds
     */
    function setMaturityPeriod(uint256 newPeriod) external onlyOwner {
        maturityPeriod = newPeriod;
    }
    
    /**
     * @notice Record deposit timestamp for yield calculation
     * @dev Called when user deposits/transfers in
     */
    function _update(address from, address to, uint256 value) internal override {
        super._update(from, to, value);
        
        // Set deposit timestamp for new holders
        if (to != address(0) && depositTimestamp[to] == 0) {
            depositTimestamp[to] = block.timestamp;
        }
    }
}
