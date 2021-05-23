import React, { Component } from "react";
import { Modal } from "components/common";
import { FakeSocket } from "./../services/fakeSocket";
import ClientsList from "./clientsList";
import ChatWindow from "./chatWindow";
import { Loader } from "./../components/common/loader";
import { api, exists } from "common";
import History from "./history";

function makeClientMessagesArray(hash, chat, unread = 0, values = []) {
  let returnObject = [...values];

  Object.defineProperties(returnObject, {
    last: {
      get() {
        if (this.length) return this[this.length - 1];
        else
          return {
            from: { name: "System" },
            body: "No messages",
          };
      },
    },
    hash: {
      value: hash,
    },
    push: {
      value: function (...values) {
        for (let value of values) {
          this[this.length] = value;
          // Only mark as unread if it's not the current chat
          if (this.hash !== chat.state.current) this.unread++;
          if (this.length > 50) this.shift();
        }
      },
    },
    unread: {
      value: unread,
      writable: true,
    },
  });

  return returnObject;
}

class Chat extends Component {
  state = {
    logged: false,
    messages: [],
    clients: [],
    current: null,
    windowOpen: false,
    buttonSendDisabled: true,
  };

  inputRef = React.createRef();
  chatDivRef = React.createRef();

  history = new History();

  closeChatWindow = () => {
    this.history.go("/");
    this.setState({ windowOpen: false, current: null });
  };

  componentDidMount() {
    if (this.inputRef && this.inputRef.current) this.inputRef.current.focus();
    this.historySuscription = this.history.onLocationChange((location) => {
      switch (location) {
        default:
        case "/":
          this.closeChatWindow();
          break;
        case "/chat":
          break;
      }
    });
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (this.inputRef && this.inputRef.current) this.inputRef.current.focus();
  }

  componentWillUnmount() {
    exists(this, "historySuscription.cancel", (cancel) => cancel());
    this.fakeSocket.disconnect();
  }

  deleteClient(hash) {
    if (
      !this.state.clients[hash].connected ||
      window.confirm(
        "Are you sure you want to delete this person? This action has no turning back."
      )
    ) {
      if (hash in this.state.clients) {
        let clients = { ...this.state.clients };
        delete clients[hash];

        let messages = { ...this.state.messages };
        delete messages[hash];

        this.setState({
          clients,
          messages,
          current: this.state.current === hash ? "general" : this.state.current,
        });
      }
    }
  }

  lockClient(hash) {
    this.socket.lock(hash);
    let newClients = { ...this.state.clients };
    newClients[hash].messages.push({
      from: { name: "System" },
      to: hash,
      body: "The client has been locked",
    });
    newClients[hash].locked = true;
    this.setState({
      clients: newClients,
    });
  }

  unlockClient(hash) {
    this.socket.unlock(hash);
    let newClients = { ...this.state.clients };
    newClients[hash].messages.push({
      from: { name: "System" },
      to: hash,
      body: "The client has been unlocked",
    });
    newClients[hash].locked = false;
    this.setState({
      clients: newClients,
    });
  }

  login() {
    // Make the connection
    this.socket = new FakeSocket(api("chat"), {
      name: this.inputRef.current.value,
    });
    this.socket.connect();

    // Parse connection result
    this.socket.onConnect((res) => {
      let { hash, registerData } = res;
      this.client = { hash, name: registerData.name };
      this.parseClientConnect({
        hash: "general",
        registerData: { name: "General" },
      });
      this.setState({
        loadingLogin: false,
        logged: true,
        current: "general",
        error: false,
      });
    });

    // Parse disconnection
    this.socket.onDisconnect(() => {
      this.history.go("/");
      this.setState({
        logged: false,
        messages: [],
        clients: [],
        current: null,
      });
    });

    this.socket.onError((error) => {
      let errorMessage = error.message;

      this.setState({
        error: errorMessage,
        loadingLogin: false,
      });
    });

    // Parse received messages
    this.socket.onMessage(this.parseMessage);

    // Parse connected clients
    this.socket.onClientConnect(this.parseClientConnect);

    // Parse disconnected clients
    this.socket.onClientDisconnect(this.parseClientDisconnect);
  }

  logout = () => {
    this.socket.disconnect();
  };

  notifyMessage = (message) => {
    if ("to" in message) {
      if ("Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification(message.body);
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().then((permission) => {
            if (permission === "granted") {
              new Notification(message.body);
            }
          });
        }
      }
    }
  };

  parseClientConnect = (info) => {
    // Don't parse the connection details of the logged client
    if (info.hash !== this.client.hash) {
      // Define the new client Object
      let clients = {
        ...this.state.clients,
        [info.hash]: {
          ...info.registerData,
          connected: true,
          locked: false,
        },
      };
      let self = this;
      Object.defineProperties(clients[info.hash], {
        messages: {
          get() {
            return self.state.messages[info.hash];
          },
        },
        hash: {
          value: info.hash,
        },
      });

      // Define the messages object
      let messages = {
        ...this.state.messages,
        [info.hash]: makeClientMessagesArray(info.hash, self),
      };

      // Update the state
      this.setState({ clients, messages });
    }
  };

  parseClientDisconnect = (info) => {
    if (info.hash in this.state.clients) {
      let newClients = { ...this.state.clients };
      if (newClients[info.hash].messages.length > 0) {
        newClients[info.hash].messages.push({
          from: { name: "System" },
          to: info.hash,
          body: "The client has been disconnected",
        });
        newClients[info.hash].connected = false;
      } else {
        delete newClients[info.hash];
      }

      let current, windowOpen;
      if (this.state.current === info.hash) {
        windowOpen = false;
        current = "general";
      } else {
        windowOpen = this.state.windowOpen;
        current = this.state.current;
      }
      this.setState({
        clients: newClients,
        current,
        windowOpen,
      });
    }
  };

  parseMessage = (messagePackage) => {
    let message = messagePackage.message;
    if (typeof message.body === "object" && message.body !== null && "typing" in message.body) {
      if (message.from !== this.client.hash && message.from in this.state.clients) {
        console.log(this.state.clients[message.from], "typing:", message.body.typing);
        let clients = { ...this.state.clients };
        clients[message.from].typing = message.body.typing;
        this.setState({ clients });
      }
    } else {
      if (message.from === this.client.hash) message.from = this.client;
      else if (message.from in this.state.clients) message.from = this.state.clients[message.from];
      else {
        return;
      }

      // Set the correct receipt
      let receipt;
      switch (messagePackage.kind) {
        case "private":
          if (message.to === this.client.hash) receipt = message.from.hash;
          else if (message.to in this.state.messages) receipt = this.state.clients[message.to].hash;
          else {
            return;
          }
          break;
        default:
          receipt = "general";
          break;
      }

      let receiptMessages = makeClientMessagesArray(
        receipt,
        this,
        this.state.messages[receipt].unread,
        [...this.state.messages[receipt]]
      );
      receiptMessages.push(message);
      let messages = { ...this.state.messages, [receipt]: receiptMessages };
      this.setState({ messages });
      this.notifyMessage(message);
    }
  };

  sendMessage(message, to = null) {
    message = {
      body: message,
      from: this.client.hash,
      to,
    };
    if (to === "general") delete message.to;

    this.socket.send(message);
  }

  render() {
    return (
      <div id="Chat">
        {this.state.logged || (
          <Modal id="ChatLogin" canClose={false} centeredFlex={true}>
            <form
              onSubmit={(ev) => {
                ev.preventDefault();
                this.login();
                this.setState({ loadingLogin: true, buttonSendDisabled: true });
              }}
            >
              <h1>Welcome</h1>
              <div>
                <input
                  type="text"
                  placeholder="Name"
                  ref={this.inputRef}
                  onChange={(ev) => {
                    let length = ev.target.value.length;
                    let error = length > 12 ? "The name must have 12 characters or less." : null;
                    this.setState({
                      error,
                      buttonSendDisabled: ev.target.value.length < 4 || ev.target.value.length > 12,
                    });
                  }}
                />
                <button disabled={this.state.buttonSendDisabled}>Login</button>
                {this.state.error && <div className="error">{this.state.error}</div>}
                {this.state.loadingLogin && <Loader />}
              </div>
            </form>
          </Modal>
        )}
        {this.state.logged && (
          <>
            <div id="ClientsList">
              <div id="ClientInfoCard">
                Welcome {this.client.name}. <button onClick={this.logout}>Logout</button>
              </div>
              <ClientsList
                clients={this.state.clients}
                onSelect={(client) => {
                  let messages = { ...this.state.messages };
                  messages[client].unread = 0;
                  this.setState({ current: client, messages, windowOpen: true });
                  this.history.go("/chat");
                }}
                onDelete={(client) => {
                  this.deleteClient(client);
                }}
                onLock={(client) => {
                  this.lockClient(client);
                }}
                onUnlock={(client) => {
                  this.unlockClient(client);
                }}
              />
            </div>
            {this.state.current && (
              <div id="ChatWindow" className={this.state.windowOpen === true ? "open" : ""}>
                <ChatWindow
                  client={this.state.clients[this.state.current]}
                  current={this.client}
                  messages={this.state.messages[this.state.current]}
                  onClose={this.closeChatWindow}
                  onSend={(message) => this.sendMessage(message, this.state.current)}
                  onTyping={(typing) => {
                    console.log("typing", typing);
                    if (this.state.current !== "general")
                      this.sendMessage({ typing }, this.state.current);
                  }}
                  enabled={
                    this.state.clients[this.state.current] &&
                    this.state.clients[this.state.current].connected &&
                    !this.state.clients[this.state.current].locked
                  }
                />
              </div>
            )}
          </>
        )}
      </div>
    );
  }
}

export default Chat;
