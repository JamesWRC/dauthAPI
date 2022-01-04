
const Wallet = require('./wallet')


// const { recoverPersonalSignature } = require("@metamask/eth-sig-util");
const jwt = require('@tsndr/cloudflare-worker-jwt')


const BACKEND_WEBSOCKET_URL = 'https://socket.dauth.dev/'

exports.Wallet = Wallet
exports.handlers = {
  
  async fetch(request, env) {

    const url = new URL(request.url);
    const uri = url.pathname;
    if (uri.includes("/walletAuth") && request.method === 'POST') {
      return await handleWalletAuth(request, env)

    }else if (uri.includes("/auth") && request.method === 'POST'){
      return await handleUserAuth(request, env)

    }else{
      const headers = {
        "content-type": "application/json",
        "Access-Control-Allow-Origin":"*",
        "Access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, Control-Allow-Origin"
      }
      return new Response(JSON.stringify({'message':"Hello :)"}),{headers:headers})
  
    }
  },
}


async function handleWalletAuth(request, env){
  var body, OTK, fromWallet, rawMessage, signedMessage;
  const headers = {
    "content-type": "application/json",
    "Access-Control-Allow-Origin":"*",
    "Access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, Control-Allow-Origin"
  }
  try{
    body = JSON.parse(await request.text())
  }catch{
    return new Response(JSON.stringify({'errorCode': 1001, 'errorMessage':'body was not valid JSON'}),{headers:headers})
  }

  try{
    OTK = body.OTK
  }catch{
    return new Response(JSON.stringify({'errorCode': 1002, 'errorMessage':'OTK (One Time Key) was not provided in the message body.'}),{headers:headers})
  }

  try{
    fromWallet = body.fromWallet
  }catch{
    return new Response(JSON.stringify({'errorCode': 1003, 'errorMessage':'fromWallet (The wallet which signed the message) was not provided in the message body.'}),{headers:headers})
  }  
  
  try{
    rawMessage = body.rawMessage
  }catch{
    return new Response(JSON.stringify({'errorCode': 1004, 'rawMessage':'rawMessage (the raw message) was not provided in the message body.'}),{headers:headers})
  }

  try{
    signedMessage = body.signedMessage
  }catch{
    return new Response(JSON.stringify({'errorCode': 1005, 'errorMessage':'signedMessage (signed message) was not provided in the message body.'}),{headers:headers})
  }

  var signResult = {
    logInSuccess: false,
    logInMessage: 'Login failed.'
  }
  try {
    // const fromWallet = fromWallet;
    // const fromWallet = '0xb6ce25574f2862150f0a877ec48d138b7ee641ce'
    const msg = `0x${Buffer.from(rawMessage, 'utf8').toString('hex')}`;
    // const sign = personalSignResult.innerHTML;
    // const sign = '0xab2de42d6c794289e8033404db699eb6f957b3ef078cf3c7681cccbcb87e0fce14301750935c3094c1feb1b05a402e569ba6e5dc0a9a1d9a8f866c902ca80e941b'
    console.log("msg")
    console.log(msg)
    console.log(signedMessage)
    // const recoveredAddr = recoverPersonalSignature({
    //   data: msg,
    //   signature: signedMessage,
    // });

    if (recoveredAddr === fromWallet) {
      console.log(`SigUtil Successfully verified signer as ${recoveredAddr}`);
      signResult.logInSuccess = true
      signResult.logInMessage = `SigUtil Successfully verified signer as ${recoveredAddr}`
      // personalSignVerifySigUtilResult.innerHTML = recoveredAddr;
    } else {
      console.log(
        `SigUtil Failed to verify signer when comparing ${recoveredAddr} to ${from}`,
      );
      console.log(`Failed comparing ${recoveredAddr} to ${from}`);
      signResult.logInSuccess = false
      signResult.logInMessage = `SigUtil Failed to verify signer when comparing ${recoveredAddr} to ${from}`
    }

  } catch (err) {
    console.error(err);
    new Response(JSON.stringify({'authResult':signResult}),{headers:headers})
  }

  const jwtToken = await getUserJWT()
  const url = `${BACKEND_WEBSOCKET_URL}/push/${OTK}`
  const init = {
    method: "POST",
    headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
        "Access-Control-Max-Age": "86400",
        "Access-Control-Allow-Headers": "Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, gameData, contentType, sessionID, serverID, msgID",
        "x-auth-token": X_AUTH_TOKEN
    },
    body: signResult
}



  const response = await fetch(url, init);
  console.log(response)
  return new Response(JSON.stringify({'authResult':signResult}),{headers:headers})
}






async function getUserJWT(fromWallet, nft){

  // Creating a token
  const tokenToSign = {
    wallet: fromWallet,
    nft: nft,
  }

  const sessionSecret = 'USER_SESSION_SECRET'
  const secret = "SECRET" + sessionSecret
  const token = await jwt.sign(tokenToSign, secret)

  // Verifying token
  const isValid = await jwt.verify(token, secret)

  // Check for validity
  if (!isValid)
      return false

  // Decoding token
  const payload = jwt.decode(token)
}


/* A good implementation would query a database, look up the wallet and would store a unique string for example.
   It doesnt have to be a string but should be something unique. For this example we will use UUIDs, a totally unique string. 
   
   This UUID should be replaced with a new UUID whenever the user logs out.
   
   This way we can use the wallet address (from the payload of the JWT token) to get the UUID which will be used as apart of the secret.

   Using this technique we can use a normal static SECRET and the UUID of the user, making it possible to log a user out by changing the
   UUID in the database. + Its more secure.

   Disclaimer: Because I am implementing a demonstration and I am not rich, I will be using a 'not so good' approach.
   I will be using the Cloudflare Cache() method to simply cache wallets, the UUID of the wallet. 
*/

async function getUserAuthStore(walletAddress){

  const wallet = await WALLET.get(walletAddress, {type: "json"})
  return wallet.uuid
}

async function setUserAuthStore(walletAddress, newUUID){

  const walletData = {
    uuid: newUUID
  }

  const wallet = await WALLET.put(walletAddress, JSON.stringify(walletData))
  return wallet
}

