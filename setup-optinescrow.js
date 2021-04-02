//Create Badge and Optin Escrow
//remember to fund the escrow with dispenser
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


async function optinBadge() {

    try {

        // Connect your client
        const algodToken = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        const algodServer = "http://localhost";
        const algodPort = 4001;

        let algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

        // get suggested parameters
        let params = await algodClient.getTransactionParams().do();
        // comment out the next two lines to use suggested fee
        params.fee = 1000;
        params.flatFee = true;
        console.log(params);

        // create logic sig
        var fs = require('fs'),
            path = require('path'),
            filePath = path.join(__dirname, 'badgeescrow.teal');

        let data = fs.readFileSync(filePath);
        let results = await algodClient.compile(data).do();
        console.log("Hash = " + results.hash);
        console.log("Result = " + results.result);
        // let program = new Uint8Array(Buffer.from("base64-encoded-program" < PLACEHOLDER >, "base64"));
        let program = new Uint8Array(Buffer.from(results.result, "base64"));

        let lsig = algosdk.makeLogicSig(program);
        console.log("lsig : " + lsig.address());

        // create a transaction
        let sender = lsig.address();

        let recipient = sender;
        // We set revocationTarget to undefined as 
        // This is not a clawback operation
        let revocationTarget = undefined;
        // CloseReaminerTo is set to undefined as
        // we are not closing out an asset
        let closeRemainderTo = undefined;
        // We are sending 0 assets
        amount = 0;
        let assetID = 15039210;
        // signing and sending "txn" allows sender to begin accepting asset specified by creator and index
        let txn = algosdk.makeAssetTransferTxnWithSuggestedParams(sender, recipient, closeRemainderTo, revocationTarget,
            amount, undefined, assetID, params);

        let rawSignedTxn = algosdk.signLogicSigTransactionObject(txn, lsig);

        // send raw LogicSigTransaction to network
        let tx = (await algodClient.sendRawTransaction(rawSignedTxn.blob).do());
        console.log("Transaction : " + tx.txId);
        await waitForConfirmation(algodClient, tx.txId, 5);


        //now send some of the assets to the escrow
        // Badge Creator is HPQISVESOW2YWMGDKC4GJ6JJ6TZJFGMY3DX6XHMKJQF6O4OWL752A2VCZY
        const passphrase = "situate that river swarm card bag achieve velvet piece skirt start blame monitor wealth outdoor tattoo drop welcome host matter turkey bind gossip about public";
        let badgeCreator = algosdk.mnemonicToSecretKey(passphrase);
        console.log("My address: %s", badgeCreator.addr);
        console.log("My passphrase: " + passphrase);
        params = await algodClient.getTransactionParams().do();
        // comment out the next two lines to use suggested fee
        params.fee = 1000;
        params.flatFee = true;
        sender = badgeCreator.addr;
        recipient = lsig.address();
        revocationTarget = badgeCreator.addr;
        closeRemainderTo = undefined;
        //Amount of the asset to transfer
        amount = 10000000;
        assetID = 15039210;
        
        // signing and sending "txn" will send "amount" assets from "sender" to "recipient"
        let xtxn = algosdk.makeAssetTransferTxnWithSuggestedParams(sender, recipient, closeRemainderTo, revocationTarget,
                amount,  undefined, assetID, params);
               
        // Must be signed by the account sending the asset  
        rawSignedTxn = xtxn.signTxn(badgeCreator.sk)
        let xtx = (await algodClient.sendRawTransaction(rawSignedTxn).do());
        console.log("Transaction : " + xtx.txId);
        // wait for transaction to be confirmed
        let confirmedTxn = await waitForConfirmation(algodClient, xtx.txId,5);
        console.log("Transaction " + xtx.txId + " confirmed in round " + confirmedTxn["confirmed-round"]);
    } catch (err) {
        console.log("err", err);
    }
};
optinBadge();