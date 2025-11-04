const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SupplyChain (Q1 Simulation)", function () {
    let SupplyChain, sc, owner, manufacturer, distributor, retailer;
    const PRODUCT_DETAILS = "High-End Sensor Unit";
    let productId;

    before(async function () {
        // Task Q1.i: Simulate three organizations/participants
        [owner, manufacturer, distributor, retailer] = await ethers.getSigners();

        SupplyChain = await ethers.getContractFactory("SupplyChain");
        sc = await SupplyChain.deploy();
        await sc.waitForDeployment();

        // Assign roles to the participants
        const MANUFACTURER_ROLE = await sc.MANUFACTURER_ROLE();
        const DISTRIBUTOR_ROLE = await sc.DISTRIBUTOR_ROLE();
        const RETAILER_ROLE = await sc.RETAILER_ROLE();

        await sc.grantRole(MANUFACTURER_ROLE, manufacturer.address);
        await sc.grantRole(DISTRIBUTOR_ROLE, distributor.address);
        await sc.grantRole(RETAILER_ROLE, retailer.address);
        
        // Note: The concept of Q1.iii (private channels) is modeled here by limiting the contract scope,
        // but true private data isolation requires Fabric features not available in standard Solidity.
    });

    // Task Q1.iv: Simulate a complete product lifecycle transaction
    it("Should complete the lifecycle: CREATED -> IN_TRANSIT -> RECEIVED", async function () {
        
        // 1. Creation (Manufacturer)
        await sc.connect(manufacturer).createProduct(PRODUCT_DETAILS);
        productId = 1; 
        
        let state = await sc.getProductState(productId);
        expect(state[1]).to.equal(manufacturer.address); // Owner is Manufacturer
        expect(state[2]).to.equal(0); // Status.CREATED

        // 2. Transfer 1 (Manufacturer -> Distributor)
        await sc.connect(manufacturer).transferShipment(productId, distributor.address);
        state = await sc.getProductState(productId);
        expect(state[1]).to.equal(distributor.address); // Owner is Distributor
        expect(state[2]).to.equal(1); // Status.IN_TRANSIT

        // 3. Transfer 2 (Distributor -> Retailer)
        await sc.connect(distributor).transferShipment(productId, retailer.address);
        state = await sc.getProductState(productId);
        expect(state[1]).to.equal(retailer.address); // Owner is Retailer
        expect(state[2]).to.equal(1); // Status.IN_TRANSIT
        
        // 4. Record Receipt (Retailer)
        await sc.connect(retailer).recordReceipt(productId);
        state = await sc.getProductState(productId);
        expect(state[1]).to.equal(retailer.address); // Owner remains Retailer
        expect(state[2]).to.equal(2); // Status.RECEIVED
    });

    // Task Q1.v: Demonstrate access control and consensus (via role/owner check)
    it("Should fail when Distributor tries to call createProduct (Unauthorized Access Demo)", async function () {
        // Distributor does not have the MANUFACTURER_ROLE required by onlyRole()
        await expect(
            sc.connect(distributor).createProduct("Unauthorized Product")
        ).to.be.revertedWithCustomError(sc, "AccessControlUnauthorizedAccount");
    });
    
    it("Should fail when a non-owner tries to transfer the shipment (Consensus/Owner Check Demo)", async function () {
        // First, ensure Manufacturer owns the product for the test
        await sc.connect(retailer).transferShipment(productId, manufacturer.address);

        // Owner/Admin (a neutral party) tries to transfer, but fails the internal owner check
        await expect(
            sc.connect(owner).transferShipment(productId, distributor.address)
        ).to.be.revertedWith("Caller is not the current product owner");
    });
});