// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title PrivCreditToken (PCT)
 * @notice ERC-7984 Confidential Token for PrivCredit Marketplace
 * @dev Balances and transfer amounts are encrypted on-chain via iExec Nox.
 *      This contract implements the ERC-7984 interface pattern.
 *      For Arbitrum Sepolia deployment in the iExec Vibe Coding Hackathon 2026.
 */

// ─────────────────────────────────────────────
// Minimal ERC-7984 Interface (Confidential Token)
// Based on https://eips.ethereum.org/EIPS/eip-7984
// ─────────────────────────────────────────────
interface IERC7984 {
    /// @notice Emitted when encrypted tokens are transferred
    /// @dev amount is intentionally omitted — confidential
    event ConfidentialTransfer(address indexed from, address indexed to);

    /// @notice Emitted when tokens are approved for spending
    event ConfidentialApproval(address indexed owner, address indexed spender);

    /// @notice Returns encrypted (ciphertext) balance for an address
    function encryptedBalanceOf(address account) external view returns (bytes memory);

    /// @notice Confidential transfer — amount is an encrypted blob
    function confidentialTransfer(address to, bytes calldata encryptedAmount) external returns (bool);

    /// @notice Confidential approve
    function confidentialApprove(address spender, bytes calldata encryptedAmount) external returns (bool);

    /// @notice Confidential transferFrom
    function confidentialTransferFrom(
        address from,
        address to,
        bytes calldata encryptedAmount
    ) external returns (bool);
}

// ─────────────────────────────────────────────
// Ownable (minimal)
// ─────────────────────────────────────────────
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

    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}

// ─────────────────────────────────────────────
// PrivCreditToken — ERC-7984 Implementation
// ─────────────────────────────────────────────
contract PrivCreditToken is IERC7984, Ownable {
    string public name = "PrivCreditToken";
    string public symbol = "PCT";
    uint8 public decimals = 18;

    // Total supply tracked in plaintext (mint/burn visible for demo transparency)
    uint256 private _totalSupply;

    // Plaintext balances used internally; exposed only as encrypted blobs externally
    // In a real Nox deployment, these would be FHE ciphertexts stored off-chain
    // and only the decryption key holders (owner/auditor) can read them.
    mapping(address => uint256) private _balances;

    // Encrypted balance store: address → encrypted blob (simulated for hackathon)
    // In production Nox, this is replaced by FHE state managed by the TEE.
    mapping(address => bytes) private _encryptedBalances;

    // Allowances (encrypted blobs)
    mapping(address => mapping(address => bytes)) private _encryptedAllowances;

    // ── Events ──────────────────────────────
    event Minted(address indexed to, uint256 amount); // plaintext for hackathon demo
    event Burned(address indexed from, uint256 amount);

    // ── Constructor ──────────────────────────
    constructor() Ownable() {}

    // ── ERC-7984 Interface ───────────────────

    /**
     * @notice Returns an encrypted representation of the caller's balance.
     * @dev In production Nox, this returns an FHE ciphertext. For the hackathon,
     *      we return ABI-encoded plaintext wrapped in a "confidential" marker.
     */
    function encryptedBalanceOf(address account) external view override returns (bytes memory) {
        // Simulate encrypted blob: in Nox, this would be an FHE ciphertext
        // The actual value is only readable by the key holder (TEE)
        return abi.encode(_balances[account]);
    }

    /**
     * @notice Confidential transfer — amount is an encrypted blob.
     * @dev On Nox, the encrypted amount is verified inside the TEE without revealing it.
     *      For demo purposes, we decode and validate the amount here.
     */
    function confidentialTransfer(address to, bytes calldata encryptedAmount)
        external
        override
        returns (bool)
    {
        require(to != address(0), "PCT: transfer to zero address");
        uint256 amount = _decodeAmount(encryptedAmount);
        _transfer(msg.sender, to, amount);
        emit ConfidentialTransfer(msg.sender, to); // amount NOT emitted
        return true;
    }

    /**
     * @notice Confidential approve.
     */
    function confidentialApprove(address spender, bytes calldata encryptedAmount)
        external
        override
        returns (bool)
    {
        require(spender != address(0), "PCT: approve to zero address");
        _encryptedAllowances[msg.sender][spender] = encryptedAmount;
        emit ConfidentialApproval(msg.sender, spender);
        return true;
    }

    /**
     * @notice Confidential transferFrom.
     */
    function confidentialTransferFrom(
        address from,
        address to,
        bytes calldata encryptedAmount
    ) external override returns (bool) {
        require(from != address(0), "PCT: from zero address");
        require(to != address(0), "PCT: to zero address");
        uint256 amount = _decodeAmount(encryptedAmount);
        uint256 allowance = _decodeAmount(_encryptedAllowances[from][msg.sender]);
        require(allowance >= amount, "PCT: insufficient allowance");
        _encryptedAllowances[from][msg.sender] = abi.encode(allowance - amount);
        _transfer(from, to, amount);
        emit ConfidentialTransfer(from, to);
        return true;
    }

    // ── Owner Functions ──────────────────────

    /**
     * @notice Mint new PCT tokens to an address.
     * @dev Amount is visible for demo/hackathon. In production, mint would also be confidential.
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "PCT: mint to zero address");
        require(amount > 0, "PCT: mint amount must be > 0");
        _totalSupply += amount;
        _balances[to] += amount;
        emit Minted(to, amount);
    }

    /**
     * @notice Burn PCT tokens from an address.
     */
    function burn(address from, uint256 amount) external onlyOwner {
        require(_balances[from] >= amount, "PCT: insufficient balance to burn");
        _balances[from] -= amount;
        _totalSupply -= amount;
        emit Burned(from, amount);
    }

    // ── View Functions ───────────────────────

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    /**
     * @notice Owner/auditor can view plaintext balance (for compliance demo).
     */
    function auditBalance(address account) external view onlyOwner returns (uint256) {
        return _balances[account];
    }

    // ── Internal ─────────────────────────────

    function _transfer(address from, address to, uint256 amount) internal {
        require(_balances[from] >= amount, "PCT: insufficient balance");
        _balances[from] -= amount;
        _balances[to] += amount;
    }

    /**
     * @notice Decode an encrypted amount blob.
     * @dev In production Nox, decoding happens inside the TEE — never on-chain.
     *      For hackathon, we use simple ABI encoding as the "encryption".
     */
    function _decodeAmount(bytes memory encryptedAmount) internal pure returns (uint256) {
        if (encryptedAmount.length == 0) return 0;
        return abi.decode(encryptedAmount, (uint256));
    }
}
