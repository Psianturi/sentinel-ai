// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title sGOLD - Sentinel Gold Token
 * @author Sentinel AI Team
 * @notice A tokenized representation of gold for the Sentinel AI ecosystem
 * @dev RWA (Real World Asset) token simulating gold ownership with yield generation
 * 
 * Features:
 * - Faucet function for testnet testing
 * - Yield simulation for demo purposes
 * - Burnable for payment integration
 */
contract SentinelGold is ERC20, ERC20Burnable, Ownable {
    
    // ============ Constants ============
    uint256 public constant FAUCET_AMOUNT = 100 * 10**18; // 100 sGOLD per faucet claim
    uint256 public constant FAUCET_COOLDOWN = 1 hours;     // Cooldown between claims
    uint256 public constant YIELD_RATE_BPS = 50;           // 0.5% yield rate (basis points)
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    // ============ State Variables ============
    mapping(address => uint256) public lastFaucetClaim;
    mapping(address => uint256) public lastYieldClaim;
    mapping(address => uint256) public depositTimestamp;
    
    // Simulated gold price in USD (18 decimals) - $2,000 per oz
    uint256 public goldPriceUSD = 2000 * 10**18;
    
    // ============ Events ============
    event FaucetClaimed(address indexed user, uint256 amount);
    event YieldClaimed(address indexed user, uint256 amount);
    event GoldPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event Deposited(address indexed user, uint256 amount);
    
    // ============ Constructor ============
    constructor() ERC20("Sentinel Gold", "sGOLD") Ownable(msg.sender) {
        // Mint initial supply to deployer for liquidity
        _mint(msg.sender, 1_000_000 * 10**18); // 1M sGOLD
    }
    
    // ============ Faucet Functions ============
    
    /**
     * @notice Claim free sGOLD tokens from faucet (testnet only)
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
     * @notice Claim accumulated yield
     * @dev Yield is minted as new tokens
     */
    function claimYield() external {
        uint256 yield_ = pendingYield(msg.sender);
        require(yield_ > 0, "No yield to claim");
        
        lastYieldClaim[msg.sender] = block.timestamp;
        
        _mint(msg.sender, yield_);
        
        emit YieldClaimed(msg.sender, yield_);
    }
    
    // ============ Price Oracle (Simulated) ============
    
    /**
     * @notice Update gold price (owner only, simulates oracle)
     * @param newPrice New price in USD with 18 decimals
     */
    function updateGoldPrice(uint256 newPrice) external onlyOwner {
        uint256 oldPrice = goldPriceUSD;
        goldPriceUSD = newPrice;
        emit GoldPriceUpdated(oldPrice, newPrice);
    }
    
    /**
     * @notice Get the USD value of a sGOLD amount
     * @param amount Amount of sGOLD tokens
     * @return USD value with 18 decimals
     */
    function getUSDValue(uint256 amount) external view returns (uint256) {
        return (amount * goldPriceUSD) / 10**18;
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
