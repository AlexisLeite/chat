import React, { Component } from "react";
import { PropTypes } from "prop-types";

class PrivateWindow extends Component {
  inputRef = React.createRef();

  constructor(props) {
    super(props);
  }

  state = {
    messages: [],
  };

  windowRef = React.createRef();

  componentDidMount() {
    this.props.source.onMessage((message) => {
      if (message.body) this.setState({ messages: [...this.state.messages, message] });
    });

    let windowWidth = parseInt(getComputedStyle(this.windowRef.current).width);
    let windowHeight = parseInt(getComputedStyle(this.windowRef.current).height);
    this.windowRef.current.style.left = Math.random() * (window.innerWidth - windowWidth) + "px";
    this.windowRef.current.style.top = Math.random() * (window.innerHeight - windowHeight) + "px";
  }

  parseMousePosition = (ev) => {
    if (this.nextDragUpdate <= Date.now()) {
      let newDragCoordinates;
      if (ev.changedTouches && ev.changedTouches[0]) {
        newDragCoordinates = {
          x: ev.changedTouches[0].clientX,
          y: ev.changedTouches[0].clientY,
        };
      } else {
        newDragCoordinates = {
          x: ev.clientX,
          y: ev.clientY,
        };
      }
      let difference = {
        x: newDragCoordinates.x - this.prevDragCoordinates.x,
        y: newDragCoordinates.y - this.prevDragCoordinates.y,
      };
      this.prevDragCoordinates = newDragCoordinates;

      let clientWidth = parseInt(window.innerWidth);
      let clientHeight = parseInt(window.innerHeight);
      let windowWidth = parseInt(getComputedStyle(this.windowRef.current).width);
      let windowHeight = parseInt(getComputedStyle(this.windowRef.current).height);
      let prevLeft = parseInt(getComputedStyle(this.windowRef.current).left);
      let prevTop = parseInt(getComputedStyle(this.windowRef.current).top);
      let newLeft = prevLeft + difference.x;
      newLeft =
        newLeft + windowWidth > clientWidth ? clientWidth - windowWidth : newLeft < 0 ? 0 : newLeft;
      let newTop = prevTop + difference.y;
      newTop =
        newTop + windowHeight > clientHeight
          ? clientHeight - windowHeight
          : newTop < 0
          ? 0
          : newTop;
      this.windowRef.current.style.left = newLeft + "px";
      this.windowRef.current.style.top = newTop + "px";

      this.nextDragUpdate += 1000 / 35;
    }
  };

  positionOnTop = () => {
    let ontop = this.windowRef.current.parentElement.querySelector(".on-top");
    if (ontop) ontop.className = "chat-private-window";
    this.windowRef.current.className = "chat-private-window on-top";
  };

  startDrag = (ev) => {
    this.positionOnTop();
    this.prevDragCoordinates = {
      x: ev.clientX,
      y: ev.clientY,
    };
    this.nextDragUpdate = Date.now() + 150;
    document.addEventListener("mousemove", this.parseMousePosition);
    document.addEventListener("mouseup", () => {
      document.removeEventListener("mousemove", this.parseMousePosition);
    });
    document.addEventListener("touchmove", this.parseMousePosition);
    document.addEventListener("touchend", () => {
      document.removeEventListener("touchmove", this.parseMousePosition);
    });
  };

  componentWillUnmount() {
    document.removeEventListener("touchmove", this.parseMousePosition);
    document.removeEventListener("mousemove", this.parseMousePosition);
  }

  render() {
    return (
      <div
        className={`chat-private-window ${this.props.enabled ? "" : "disabled"}`}
        ref={this.windowRef}
        onClick={this.positionOnTop}
      >
        <div
          className="window-title no-select drag"
          onMouseDown={this.startDrag}
          onTouchStart={this.startDrag}
        >
          Chat with {this.props.interlocutor}
          <button
            class="close-button"
            onClick={() => {
              this.props.onClose();
            }}
          >
            x
          </button>
        </div>
        <div className="window-body">
          <div className="chat-messages">
            {this.state.messages.map((message) => (
              <div class="chat-message">
                <strong>{message.from.name}:</strong> {message.body}
              </div>
            ))}
          </div>
          <form className="private-window-commands" onSubmit={(ev) => ev.preventDefault()}>
            <input type="text" ref={this.inputRef} disabled={!this.props.enabled} />
            <button
              onClick={() => {
                let input = this.inputRef.current;
                let value = input.value;
                input.value = "";
                input.focus();

                this.props.onMessage(value);
              }}
              disabled={!this.props.enabled}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    );
  }
}

PrivateWindow.propTypes = {
  enabled: PropTypes.bool.isRequired,
  interlocutor: PropTypes.string.isRequired,
  source: PropTypes.object.isRequired,
  onClose: PropTypes.func,
  onMessage: PropTypes.func.isRequired,
};

export default PrivateWindow;
