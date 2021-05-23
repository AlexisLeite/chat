import { ServerCommunications } from "services";
import { EasyEvents } from "common";

export class FakeSocket {
  options = {
    _trulyOptions: {
      keepAlive: 5,
    },
    debug: false,
    get keepAlive() {
      return this._trulyOptions.keepAlive;
    },
    set keepAlive(value) {
      if (value < 1) value = 1;
      this._trulyOptions.keepAlive = value;
    },
  };

  messages = [];
  knownClients = {};
  lockedHashes = [];

  constructor(endpoint, registerData, options) {
    Object.assign(this.options, options);
    this.endpoint = endpoint;
    this.registerData = registerData;

    EasyEvents.call(this);
    this.addEvents([
      "clientConnect",
      "clientDisconnect",
      "connect",
      "disconnect",
      "error",
      "message",
    ]);
  }

  connect() {
    this.fetch({
      action: "register",
      registerData: this.registerData,
    })
      .then((res) => {
        this.hash = res.hash;

        // Shout out the received messages
        this.fireConnect(res);

        // Start the keep alive process
        this.working = true;
        this.parseSuccessfulAnswer(res);

        this.fireKeepAlive();
        window.onbeforeunload = () => this.disconnect();
      })
      .catch(this.parseError);
  }

  disconnect() {
    this.working = false;
    this.fetch({
      hash: this.hash,
      action: "disconnect",
    }).then((res) => {
      this.fireDisconnect(res);
    });
  }

  fetch(options) {
    return new Promise((resolve, reject) => {
      try {
        ServerCommunications.post(this.endpoint, options)
          .then((res) => {
            if (res.status !== "error") resolve(res);
            else this.parseError(res);
          })
          .catch(this.parseError);
      } catch (error) {
        this.parseError(error);
      }
    });
  }

  fireKeepAlive() {
    this.keepAliveTimeout = setTimeout(() => {
      if (!this.working) return;
      this.fetch({
        hash: this.hash,
        action: "post",
        messages: this.messages,
      }).then((res) => {
        this.parseSuccessfulAnswer(res);
        this.fireKeepAlive();
      });
      this.messages = [];
    }, this.options.keepAlive * 1000);
  }

  lock = (hash) => {
    this.lockedHashes.push(hash);
  };

  unlock = (hash) => {
    this.lockedHashes = this.lockedHashes.filter((current) => {
      return current !== hash;
    });
  };

  parseError = (error) => {
    if (typeof error === "string") error = { message: error, title: "" };
    if (this.options.debug) {
      console.error("Socket error");
      console.trace();
      console.log(error);
    }
    this.fireError(error);
    this.fireDisconnect();
  };

  parseSuccessfulAnswer(res) {
    if (this.options.debug) console.log(res);
    // Apply configurations
    if ("keepAlive" in res) this.options.keepAlive = res.keepAlive;

    // Notice of messages to the client's app
    for (let message in res.messages) {
      if (!this.lockedHashes.includes(res.messages[message].from)) {
        this.fireMessage(res.messages[message]);
      }
    }

    // Keep the client's list updated
    if ("clientsList" in res) {
      for (let clientUpdate of res.clientsList) {
        switch (clientUpdate.status) {
          case "connect":
            this.knownClients[clientUpdate.hash] = clientUpdate.registerData;
            this.fireClientConnect(clientUpdate);
            break;
          default:
          case "disconnect":
            if (clientUpdate.hash in this.knownClients) {
              this.fireClientDisconnect({
                hash: clientUpdate.hash,
                registerData: this.knownClients[clientUpdate.hash],
              });
              delete this.knownClients[clientUpdate.hash];
            }
            break;
        }
      }
    }
  }

  send(message) {
    this.messages.push(message);
  }
}
