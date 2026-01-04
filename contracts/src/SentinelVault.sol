// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SentinelVault - AI-Managed RWA Vault
 * @author Sentinel AI Team
 * @notice Central vault for managing RWA tokens and automated yield strategies
 * @dev Integrates with Sentinel AI Agent for automated portfolio management
 * 
 * Features:
 * - Deposit/withdraw RWA tokens (sGOLD, sBOND)
 * - Automated yield harvesting
 * - Spending allowance for x402 payments
 * - AI Agent authorization for autonomous operations
 */
contract SentinelVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ============ Structs ============
    struct UserPortfolio {
        uint256 sGoldBalance;
        uint256 sBondBalance;
        uint256 spendingAllowance;  // Max amount AI can spend without confirmation
        uint256 totalDeposited;
        uint256 totalYieldEarned;
        bool autoCompound;          // Auto-reinvest yield
        bool invisibleMode;         // AI operates without notifications
    }
    
    struct PaymentRecord {
        address user;
        address merchant;
        uint256 amount;
        address tokenUsed;
        uint256 timestamp;
        string memo;
    }
    
    // ============ State Variables ============
    IERC20 public sGold;
    IERC20 public sBond;
    
    mapping(address => UserPortfolio) public portfolios;
    mapping(address => bool) public authorizedAgents;  // AI Agents that can operate
    
    PaymentRecord[] public paymentHistory;
    
    uint256 public totalValueLocked;
    uint256 public constant INVISIBLE_MODE_THRESHOLD = 10 * 10**18; // $10 in tokens
    
    // ============ Events ============
    event Deposited(address indexed user, address indexed token, uint256 amount);
    event Withdrawn(address indexed user, address indexed token, uint256 amount);
    event PaymentExecuted(
        address indexed user, 
        address indexed merchant, 
        uint256 amount, 
        address tokenUsed,
        string memo
    );
    event YieldHarvested(address indexed user, uint256 sGoldYield, uint256 sBondYield);
    event SpendingAllowanceSet(address indexed user, uint256 amount);
    event InvisibleModeToggled(address indexed user, bool enabled);
    event AgentAuthorized(address indexed agent, bool authorized);
    event AutoCompoundToggled(address indexed user, bool enabled);
    
    // ============ Modifiers ============
    modifier onlyAuthorizedAgent() {
        require(authorizedAgents[msg.sender] || msg.sender == owner(), "Not authorized agent");
        _;
    }
    
    // ============ Constructor ============
    constructor(address _sGold, address _sBond) Ownable(msg.sender) {
        sGold = IERC20(_sGold);
        sBond = IERC20(_sBond);
    }
    
    // ============ User Functions ============
    
    /**
     * @notice Deposit sGOLD tokens into vault
     * @param amount Amount to deposit
     */
    function depositGold(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        
        sGold.safeTransferFrom(msg.sender, address(this), amount);
        
        portfolios[msg.sender].sGoldBalance += amount;
        portfolios[msg.sender].totalDeposited += amount;
        totalValueLocked += amount;
        
        emit Deposited(msg.sender, address(sGold), amount);
    }
    
    /**
     * @notice Deposit sBOND tokens into vault
     * @param amount Amount to deposit
     */
    function depositBond(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        
        sBond.safeTransferFrom(msg.sender, address(this), amount);
        
        portfolios[msg.sender].sBondBalance += amount;
        portfolios[msg.sender].totalDeposited += amount;
        totalValueLocked += amount;
        
        emit Deposited(msg.sender, address(sBond), amount);
    }
    
    /**
     * @notice Withdraw sGOLD tokens from vault
     * @param amount Amount to withdraw
     */
    function withdrawGold(uint256 amount) external nonReentrant {
        require(portfolios[msg.sender].sGoldBalance >= amount, "Insufficient balance");
        
        portfolios[msg.sender].sGoldBalance -= amount;
        totalValueLocked -= amount;
        
        sGold.safeTransfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, address(sGold), amount);
    }
    
    /**
     * @notice Withdraw sBOND tokens from vault
     * @param amount Amount to withdraw
     */
    function withdrawBond(uint256 amount) external nonReentrant {
        require(portfolios[msg.sender].sBondBalance >= amount, "Insufficient balance");
        
        portfolios[msg.sender].sBondBalance -= amount;
        totalValueLocked -= amount;
        
        sBond.safeTransfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, address(sBond), amount);
    }
    
    /**
     * @notice Set spending allowance for AI agent
     * @param amount Max amount AI can spend autonomously
     */
    function setSpendingAllowance(uint256 amount) external {
        portfolios[msg.sender].spendingAllowance = amount;
        emit SpendingAllowanceSet(msg.sender, amount);
    }
    
    /**
     * @notice Toggle invisible mode (AI auto-transfers below threshold)
     */
    function toggleInvisibleMode() external {
        portfolios[msg.sender].invisibleMode = !portfolios[msg.sender].invisibleMode;
        emit InvisibleModeToggled(msg.sender, portfolios[msg.sender].invisibleMode);
    }
    
    /**
     * @notice Toggle auto-compound yield
     */
    function toggleAutoCompound() external {
        portfolios[msg.sender].autoCompound = !portfolios[msg.sender].autoCompound;
        emit AutoCompoundToggled(msg.sender, portfolios[msg.sender].autoCompound);
    }
    
    // ============ AI Agent Functions ============
    
    /**
     * @notice Execute payment on behalf of user (x402 integration)
     * @dev Only authorized AI agents can call this
     * @param user User whose funds to use
     * @param merchant Recipient of payment
     * @param amount Amount to pay
     * @param useGold True to use sGOLD, false for sBOND
     * @param memo Payment description
     */
    function executePayment(
        address user,
        address merchant,
        uint256 amount,
        bool useGold,
        string calldata memo
    ) external onlyAuthorizedAgent nonReentrant {
        UserPortfolio storage portfolio = portfolios[user];
        
        // Check if within spending allowance or invisible mode threshold
        require(
            amount <= portfolio.spendingAllowance || 
            (portfolio.invisibleMode && amount <= INVISIBLE_MODE_THRESHOLD),
            "Exceeds spending allowance"
        );
        
        if (useGold) {
            require(portfolio.sGoldBalance >= amount, "Insufficient sGOLD");
            portfolio.sGoldBalance -= amount;
            sGold.safeTransfer(merchant, amount);
        } else {
            require(portfolio.sBondBalance >= amount, "Insufficient sBOND");
            portfolio.sBondBalance -= amount;
            sBond.safeTransfer(merchant, amount);
        }
        
        totalValueLocked -= amount;
        
        // Record payment
        paymentHistory.push(PaymentRecord({
            user: user,
            merchant: merchant,
            amount: amount,
            tokenUsed: useGold ? address(sGold) : address(sBond),
            timestamp: block.timestamp,
            memo: memo
        }));
        
        emit PaymentExecuted(user, merchant, amount, useGold ? address(sGold) : address(sBond), memo);
    }
    
    /**
     * @notice Harvest yield and optionally auto-compound
     * @dev Called by AI agent to collect user's yield
     * @param user User to harvest for
     * @param sGoldYield Amount of sGOLD yield
     * @param sBondYield Amount of sBOND yield
     */
    function harvestYield(
        address user,
        uint256 sGoldYield,
        uint256 sBondYield
    ) external onlyAuthorizedAgent {
        UserPortfolio storage portfolio = portfolios[user];
        
        if (portfolio.autoCompound) {
            // Re-deposit yield into vault
            portfolio.sGoldBalance += sGoldYield;
            portfolio.sBondBalance += sBondYield;
            totalValueLocked += sGoldYield + sBondYield;
        }
        
        portfolio.totalYieldEarned += sGoldYield + sBondYield;
        
        emit YieldHarvested(user, sGoldYield, sBondYield);
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Authorize or revoke an AI agent
     * @param agent Address of AI agent
     * @param authorized True to authorize, false to revoke
     */
    function setAgentAuthorization(address agent, bool authorized) external onlyOwner {
        authorizedAgents[agent] = authorized;
        emit AgentAuthorized(agent, authorized);
    }
    
    /**
     * @notice Update token addresses
     * @param _sGold New sGOLD address
     * @param _sBond New sBOND address
     */
    function setTokenAddresses(address _sGold, address _sBond) external onlyOwner {
        sGold = IERC20(_sGold);
        sBond = IERC20(_sBond);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get user's portfolio details
     * @param user Address to query
     */
    function getPortfolio(address user) external view returns (UserPortfolio memory) {
        return portfolios[user];
    }
    
    /**
     * @notice Get total USD value of user's portfolio
     * @param user Address to query
     * @return Total value in USD (18 decimals)
     */
    function getPortfolioValue(address user) external view returns (uint256) {
        UserPortfolio memory portfolio = portfolios[user];
        // Simplified: assume 1 sGOLD = $2000, 1 sBOND = $100
        return (portfolio.sGoldBalance * 2000) + (portfolio.sBondBalance * 100);
    }
    
    /**
     * @notice Get payment history count
     */
    function getPaymentHistoryLength() external view returns (uint256) {
        return paymentHistory.length;
    }
    
    /**
     * @notice Get payment record by index
     * @param index Index in payment history
     */
    function getPaymentRecord(uint256 index) external view returns (PaymentRecord memory) {
        require(index < paymentHistory.length, "Index out of bounds");
        return paymentHistory[index];
    }
}
