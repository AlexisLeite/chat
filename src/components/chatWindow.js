import React, { Component } from "react";
import { PropTypes } from "prop-types";
import { RiSendPlane2Fill, RiArrowLeftCircleFill } from "react-icons/ri";

class ChatWindow extends Component {
  chatDivRef = React.createRef();
  inputRef = React.createRef();

  state = {
    sendDisabled: true,
    debug: "",
  };

  lastText = "";
  typing = false;
  intervalReference = null;

  componentDidMount() {
    this.intervalReference = setInterval(this.evalTyping, 1000 * 6);
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (snapshot && snapshot.shouldScroll) {
      let messages = this.chatDivRef.current;
      let lastSpan = messages.querySelector(".chat-message:last-of-type span");
      if (lastSpan) lastSpan.scrollIntoView(true);
    }
  }

  componentWillUnmount() {
    clearInterval(this.intervalReference);
  }

  evalTyping = () => {
    let current = this.inputRef.current.value;
    if (current !== this.lastText && !this.typing && current !== "") {
      this.props.onTyping(true);
      this.typing = true;
    } else if (this.typing && (current === this.lastText || current === "")) {
      this.props.onTyping(false);
      this.typing = false;
    }
    this.lastText = current;
  };

  getSnapshotBeforeUpdate(prevProps, prevState) {
    if (
      prevProps.messages.length < this.props.messages.length ||
      prevProps.messages[0] !== this.props.messages[0]
    ) {
      let messages = this.chatDivRef.current;
      let margin = 50;

      // Prior to getting your messagess.
      let shouldScroll =
        Math.round(messages.scrollTop + messages.clientHeight) - margin <
          Math.round(messages.scrollHeight) &&
        Math.round(messages.scrollTop + messages.clientHeight) + margin >
          Math.round(messages.scrollHeight);
      let currentScroll = messages.scrollTop;

      return { shouldScroll, currentScroll };
    }
    return null;
  }

  render() {
    return (
      <>
        <div className="window-title">
          <button onClick={this.props.onClose}>
            <RiArrowLeftCircleFill size="1.5em" />
          </button>
          <h3>Chat with {this.props.client.name}</h3>
        </div>
        <div className="chat-messages" ref={this.chatDivRef}>
          {this.props.messages.map((message, key, messages) => {
            let origin;

            let classify = (name) => {
              return name === this.props.current.name ? "local" : "remote";
            };

            if (message.from.name === "System") {
              origin = "system-message";
            } else {
              let prev = key - 1 in messages ? messages[key - 1] : { from: { name: null } };
              let next = key + 1 in messages ? messages[key + 1] : { from: { name: null } };

              if (prev.from.name !== message.from.name && next.from.name !== message.from.name) {
                origin = `only-${classify(message.from.name)}`;
              } else if (prev.from.name !== message.from.name) {
                origin = `first-${classify(message.from.name)}`;
              } else if (next.from.name !== message.from.name) {
                origin = `last-${classify(message.from.name)}`;
              } else {
                origin = classify(message.from.name);
              }
            }

            return (
              <div className={`chat-message ${origin}`} key={key}>
                {(origin === "only-remote" || origin === "first-remote") && (
                  <div className="message-emitter">
                    <strong>{message.from.name}:</strong>
                  </div>
                )}
                <span> {message.body}</span>
              </div>
            );
          })}
        </div>
        <div className="is-typing">
          {this.props.client.typing && `${this.props.client.name} is typing...`}
        </div>
        <form
          className="chat-commands"
          onSubmit={(ev) => {
            ev.preventDefault();
            this.props.onSend(this.inputRef.current.value);
            this.inputRef.current.value = "";
            this.setState({ sendDisabled: true });
            this.inputRef.current.focus();
            this.evalTyping();
          }}
        >
          <input
            disabled={!this.props.enabled}
            ref={this.inputRef}
            type="text"
            onChange={(ev) => {
              let mustEnable = ev.target.value.length === 0;

              if (this.state.sendDisabled !== mustEnable)
                this.setState({ sendDisabled: mustEnable });

              if (this.lastText === "" && !mustEnable) this.evalTyping();
            }}
          />
          <button disabled={!this.props.enabled || this.state.sendDisabled}>
            <RiSendPlane2Fill />
          </button>
        </form>
      </>
    );
  }
}

ChatWindow.propTypes = {
  messages: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  onSend: PropTypes.func.isRequired,
  onTyping: PropTypes.func.isRequired,
  enabled: PropTypes.bool.isRequired,
  client: PropTypes.shape({
    name: PropTypes.string,
  }).isRequired,
  current: PropTypes.shape({
    name: PropTypes.string,
  }).isRequired,
};

export default ChatWindow;
