//Create Badge and Optin Escrow
const algosdk = require('algosdk');

/**
 * utility function to wait on a transaction to be confirmed
 * the timeout parameter indicates how many rounds do you wish to check pending transactions for
 */
const waitForConfirmation = async function(algodclient, txId, timeout) {
    // Wait until the transaction is confirmed or rejected, or until 'timeout'
    // number of rounds have passed.
    //     Args:
    // txId(str): the transaction to wait for
    // timeout(int): maximum number of rounds to wait
    // Returns:
    // pending transaction information, or throws an error if the transaction
    // is not confirmed or rejected in the next timeout rounds
    if (algodclient == null || txId == null || timeout < 0) {
        throw "Bad arguments.";
    }
    let status = (await algodclient.status().do());
    if (status == undefined) throw new Error("Unable to get node status");
    let startround = status["last-round"] + 1;
    let currentround = startround;

    while (currentround < (startround + timeout)) {
        let pendingInfo = await algodclient.pendingTransactionInformation(txId).do();
        if (pendingInfo != undefined) {
            if (pendingInfo["confirmed-round"] !== null && pendingInfo["confirmed-round"] > 0) {
                //Got the completed Transaction
                return pendingInfo;
            } else {
                if (pendingInfo["pool-error"] != null && pendingInfo["pool-error"].length > 0) {
                    // If there was a pool error, then the transaction has been rejected!
                    throw new Error("Transaction Rejected" + " pool error" + pendingInfo["pool-error"]);
                }
            }
        }

        await algodclient.statusAfterBlock(currentround).do();
        currentround++;
    }
    throw new Error("Transaction not confirmed after " + timeout + " rounds!");
};


async function createBadge() {

    try {
        // Badge Creator is HPQISVESOW2YWMGDKC4GJ6JJ6TZJFGMY3DX6XHMKJQF6O4OWL752A2VCZY
        const passphrase = "situate that river swarm card bag achieve velvet piece skirt start blame monitor wealth outdoor tattoo drop welcome host matter turkey bind gossip about public";
        let myAccount = algosdk.mnemonicToSecretKey(passphrase);
        console.log("My address: %s", myAccount.addr);
        console.log("My passphrase: " + passphrase);


        // Connect your client
        const algodToken = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        const algodServer = "http://localhost";
        const algodPort = 4001;

        let algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

        //Check your balance
        let accountInfo = await algodClient.accountInformation(myAccount.addr).do();
        console.log("Account balance: %d microAlgos", accountInfo.amount);

        // Construct the transaction
        let params = await algodClient.getTransactionParams().do();
        // comment out the next two lines to use suggested fee
        params.fee = 1000;
        params.flatFee = true;

        // receiver defined as TestNet faucet address 
        const receiver = "GD64YIY3TWGDMCNPP553DZPPR6LDUSFQOIJVFDPPXWEG3FVOJCCDBBHU5A";
        let note = undefined; // arbitrary data to be stored in the transaction; here, none is stored
        // Asset creation specific parameters
        // The following parameters are asset specific
        // Throughout the example these will be re-used. 
        // We will also change the manager later in the example
        let addr = myAccount.addr;
        // Whether user accounts will need to be unfrozen before transacting    
        let defaultFrozen = true;
        // integer number of decimals for asset unit calculation
        let decimals = 0;
        // total number of this asset available for circulation   
        let totalIssuance = 10000000000;
        // Used to display asset units to user    
        let unitName = "PAYBDG";
        // Friendly name of the asset    
        let assetName = "Payment Badge";
        // Optional string pointing to a URL relating to the asset
        let assetURL = undefined;
        // Optional hash commitment of some sort relating to the asset. 32 character length.
        let assetMetadataHash = undefined;
        // The following parameters are the only ones
        // that can be changed, and they have to be changed
        // by the current manager
        // Specified address can change reserve, freeze, clawback, and manager
        let manager = myAccount.addr;
        // Specified address is considered the asset reserve
        // (it has no special privileges, this is only informational)
        let reserve = myAccount.addr;
        // Specified address can freeze or unfreeze user asset holdings 
        let freeze = myAccount.addr;
        // Specified address can revoke user asset holdings and send 
        // them to other addresses    
        let clawback = myAccount.addr;

        // signing and sending "txn" allows "addr" to create an asset
        let txn = algosdk.makeAssetCreateTxnWithSuggestedParams(addr, note,
            totalIssuance, decimals, defaultFrozen, manager, reserve, freeze,
            clawback, unitName, assetName, assetURL, assetMetadataHash, params);

        let rawSignedTxn = txn.signTxn(myAccount.sk)
        let tx = (await algodClient.sendRawTransaction(rawSignedTxn).do());
        console.log("Transaction : " + tx.txId);
        let assetID = null;
        // wait for transaction to be confirmed
        await waitForConfirmation(algodClient, tx.txId, 5);
        // Get the new asset's information from the creator account
        let ptx = await algodClient.pendingTransactionInformation(tx.txId).do();
        assetID = ptx["asset-index"];
        console.log("Badge ID = " + assetID)
    } catch (err) {
        console.log("err", err);
    }
};
createBadge();