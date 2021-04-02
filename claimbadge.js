const algosdk = require('algosdk');

let client = null;
async function setupClient() {
    if( client == null){
        const token = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        const server = "http://localhost";
        const port = 4001;
        let algodClient = new algosdk.Algodv2(token, server, port);
        client = algodClient;
    } else {
        return client;
    }
    return client;
}

async function claimBadge(badgeID, pTransaction){

    try{
        let algodClient = await setupClient();
        // create logic sig
        var fs = require('fs'),
            path = require('path'),
            filePath = path.join(__dirname, 'badgeescrow.teal');

        let data = fs.readFileSync(filePath);        

        // Compile teal
        let results = await algodClient.compile(data).do();
        // Print results
        console.log("Hash = " + results.hash);
        console.log("Result = " + results.result);
        let program = new Uint8Array(Buffer.from(results.result, "base64"));
        //let program = new Uint8Array(Buffer.from("ASABASI=", "base64"));
        let lsig = algosdk.makeLogicSig(program);

        // get suggested params from the network
        let params = await algodClient.getTransactionParams().do();

        let transaction1 =  pTransaction; 

        // sender needs to be asset manager, even though the asset it being removed from the escrow
        // Badge Creator is HPQISVESOW2YWMGDKC4GJ6JJ6TZJFGMY3DX6XHMKJQF6O4OWL752A2VCZY
        const passphrase = "situate that river swarm card bag achieve velvet piece skirt start blame monitor wealth outdoor tattoo drop welcome host matter turkey bind gossip about public";
        let assetManager = algosdk.mnemonicToSecretKey(passphrase);

        sender = assetManager.addr;
        recipient = algosdk.encodeAddress(transaction1.from.publicKey);
        revocationTarget = lsig.address();
        closeRemainderTo = undefined;
        amount = 1;
        let assetID = badgeID; 
        // signing and sending "txn" will send "amount" assets from "revocationTarget" to "recipient",
        // if and only if sender == clawback manager for this asset
    
        let transaction2 = algosdk.makeAssetTransferTxnWithSuggestedParams(sender, recipient, closeRemainderTo, revocationTarget,
           amount, undefined, assetID, params);
        // Store both transactions
        let txns = [transaction1, transaction2];

        // Group both transactions
        let txgroup = algosdk.assignGroupID(txns);
        let signedTx2 = transaction2.signTxn(assetManager.sk);


        return signedTx2;

    } catch (err) {
        console.log("err", err);
        throw err;
          
    }
}
module.exports = { claimBadge };