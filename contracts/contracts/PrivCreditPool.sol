// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title PrivCreditPool
 * @notice Confidential Private Credit Lending Pool
 * @dev Lenders deposit PCT (PrivCreditToken) into the pool.
 *      Positions stay private — only an Event(address) is emitted, never the amount.
 *      Built for iExec Vibe Coding Hackathon 2026 on Arbitrum Sepolia.
 */

interface IPrivCreditToken {
    function confidentialTransfer(address to, bytes calldata encryptedAmount) external returns (bool);
    function confidentialTransferFrom(address from, address to, bytes calldata encryptedAmount) external returns (bool);
    function confidentialApprove(address spender, bytes calldata encryptedAmount) external returns (bool);
    function encryptedBalanceOf(address account) external view returns (bytes memory);
    function auditBalance(address account) external view returns (uint256);
}

abstract contract Ownable {
    address private _owner;
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        _owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    modifier onlyOwner() {
        require(msg.sender == _owner, "Ownable: caller is not the owner");
        _;
    }

    function owner() public view returns (address) {
        return _owner;
    }
}

contract PrivCreditPool is Ownable {
    // ── State ────────────────────────────────
    IPrivCreditToken public immutable pct;

    // Pool metadata
    string public poolName;
    string public creditType; // e.g. "Invoice Financing", "SME Short-Term Loan"

    // Confidential position tracking
    // We only track THAT a user deposited — not HOW MUCH (privacy preserved)
    mapping(address => bool) public hasDeposited;
    address[] public depositors;

    // Total pool size tracked internally for owner/auditor only
    uint256 private _totalDeposited;

    // ── Events ───────────────────────────────
    // IMPORTANT: No amount in Deposited — this is the confidential privacy guarantee
    event Deposited(address indexed user);
    event Withdrawn(address indexed user);
    event PoolCreated(string poolName, string creditType);

    // ── Constructor ──────────────────────────
    constructor(
        address _pct,
        string memory _poolName,
        string memory _creditType
    ) Ownable() {
        require(_pct != address(0), "Pool: invalid PCT address");
        pct = IPrivCreditToken(_pct);
        poolName = _poolName;
        creditType = _creditType;
        emit PoolCreated(_poolName, _creditType);
    }

    // ── Lender Functions ─────────────────────

    /**
     * @notice Deposit PCT tokens into the private credit pool.
     * @dev The encryptedAmount is an ABI-encoded uint256 (for hackathon).
     *      In production Nox, this is a real FHE ciphertext verified in the TEE.
     *
     *      PRIVACY GUARANTEE:
     *      - Event emits only depositor address, NEVER the amount
     *      - On-chain state does NOT record individual deposit sizes
     *      - Only the Nox TEE (and auditor via selective disclosure) can see amounts
     *
     * @param encryptedAmount ABI-encoded deposit amount (simulated FHE for demo)
     */
    function deposit(bytes calldata encryptedAmount) external {
        require(encryptedAmount.length > 0, "Pool: empty encrypted amount");

        // Transfer PCT from lender to pool (confidentially)
        bool success = pct.confidentialTransferFrom(msg.sender, address(this), encryptedAmount);
        require(success, "Pool: confidential transfer failed");

        // Record THAT the user deposited (not how much)
        if (!hasDeposited[msg.sender]) {
            hasDeposited[msg.sender] = true;
            depositors.push(msg.sender);
        }

        // Update internal total (only readable by owner/auditor)
        uint256 amount = _decodeForAudit(encryptedAmount);
        _totalDeposited += amount;

        // Emit event WITHOUT amount — privacy preserved
        emit Deposited(msg.sender);
    }

    /**
     * @notice Withdraw all deposited tokens (simplified for demo).
     * @dev In production, withdrawal amounts would also be confidential.
     *      Here the owner can trigger withdrawal for a user address.
     */
    function withdraw(address user, bytes calldata encryptedAmount) external onlyOwner {
        require(hasDeposited[user], "Pool: user has no deposit");

        // Transfer PCT back to user
        bool success = pct.confidentialTransfer(user, encryptedAmount);
        require(success, "Pool: withdrawal transfer failed");

        hasDeposited[user] = false;

        uint256 amount = _decodeForAudit(encryptedAmount);
        if (_totalDeposited >= amount) {
            _totalDeposited -= amount;
        }

        emit Withdrawn(user);
    }

    // ── Auditor / Owner View Functions ───────

    /**
     * @notice Returns total pool size — only accessible by owner/auditor.
     * @dev Demonstrates selective disclosure: compliance officer can audit
     *      without revealing individual positions to the public.
     */
    function auditTotalDeposited() external view onlyOwner returns (uint256) {
        return _totalDeposited;
    }

    /**
     * @notice Returns list of depositor addresses (no amounts).
     */
    function getDepositorCount() external view returns (uint256) {
        return depositors.length;
    }

    /**
     * @notice Check if an address has an active position.
     */
    function hasPosition(address user) external view returns (bool) {
        return hasDeposited[user];
    }

    // ── Internal ─────────────────────────────

    function _decodeForAudit(bytes memory encryptedAmount) internal pure returns (uint256) {
        if (encryptedAmount.length == 0) return 0;
        return abi.decode(encryptedAmount, (uint256));
    }
}
