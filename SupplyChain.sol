// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract SupplyChain is AccessControl {
    
    // Define Roles (mimicking Fabric's MSPs/Organizations)
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant RETAILER_ROLE = keccak256("RETAILER_ROLE");

    // Product State
    enum Status { CREATED, IN_TRANSIT, RECEIVED }

    struct Product {
        string details;
        address owner;
        Status status;
        address manufacturer;
    }

    mapping(uint256 => Product) public products;
    uint256 private _productIdCounter = 0;

    constructor() {
        // Grant the deployer (test account) the admin role
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // Task Q1.ii & Q1.v: Develop chaincode to record creation, enforced by Access Control
    function createProduct(string memory _details) public onlyRole(MANUFACTURER_ROLE) returns (uint256) {
        _productIdCounter++;
        products[_productIdCounter] = Product({
            details: _details,
            owner: msg.sender,
            status: Status.CREATED,
            manufacturer: msg.sender
        });
        
        return _productIdCounter;
    }

    // Task Q1.ii: Record shipment transfer
    function transferShipment(uint256 _productId, address _newOwner) public {
        Product storage product = products[_productId];
        require(product.manufacturer != address(0), "Product does not exist");
        
        // Task Q1.v: Access Control Demo - Only current owner can initiate transfer
        require(product.owner == msg.sender, "Caller is not the current product owner");
        
        product.owner = _newOwner;
        product.status = Status.IN_TRANSIT;
    }

    // Task Q1.ii: Record receipt events
    function recordReceipt(uint256 _productId) public {
        Product storage product = products[_productId];
        require(product.manufacturer != address(0), "Product does not exist");

        // Task Q1.v: Access Control Demo - Only current owner (recipient) can confirm receipt
        require(product.owner == msg.sender, "Caller is not the product owner (recipient)");
        require(product.status == Status.IN_TRANSIT, "Product is not in transit");

        product.status = Status.RECEIVED;
    }

    // Task Q1.ii: Query product history (Simulated by getting the current state)
    function getProductState(uint256 _productId) public view returns (string memory, address, Status, address) {
        Product memory product = products[_productId];
        require(product.manufacturer != address(0), "Product does not exist");
        return (product.details, product.owner, product.status, product.manufacturer);
    }
}