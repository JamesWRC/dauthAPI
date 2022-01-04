module.exports = class Wallet {
    constructor(state, env) {
      this.state = state;
      this.env = env
    }
  
    async getWalletSessionSecret(){
      await this.state.storage.get('sessionSecret')
      return true
  
    }
  
    async setWalletSessionSecret(uuid){
      await this.state.storage.put('sessionSecret', uuid);
      return true
  
    }
  
    async fetch(request) {
      let key = new URL(request.url).host;
      let ifMatch = request.headers.get('If-Match');
      let newValue = await request.text();
      let changedValue = false;
      await this.state.storage.transaction(async txn => {
        let currentValue = await txn.get(key);
        if (currentValue != ifMatch && ifMatch != '*') {
          txn.rollback();
          return;
        }
        changedValue = true;
        await txn.put(key, newValue);
      });
      return new Response('Changed: ' + changedValue);
    }
  }