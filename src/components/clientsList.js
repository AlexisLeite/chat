import React, { Component } from "react";
import { PropTypes } from "prop-types";

class ClientsList extends Component {
  state = {
    showMenu: null,
  };

  closeMenu = () => {
    this.setState({
      showMenu: null,
    });
  };

  componentDidMount() {
    document.addEventListener("click", this.closeMenu);
  }

  componentWillUnmount() {
    document.removeEventListener("click", this.closeMenu);
  }

  render() {
    return (
      <>
        <h3>Online</h3>
        <div className="clients-list">
          {Object.keys(this.props.clients).map((key) => {
            let client = this.props.clients[key];
            return (
              <div className="client" key={key}>
                <button className="client-details" onClick={() => this.props.onSelect(key)}>
                  {client.messages.unread > 0 && (
                    <div className="unread">{client.messages.unread}</div>
                  )}
                  <div>
                    <strong>{client.name}</strong>
                    <small>{client.typing ? "Typing..." : client.messages.last.body}</small>
                  </div>
                </button>

                {key !== "general" && (
                  <div className="options-menu">
                    <button
                      className="menu-open"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        ev.preventDefault();
                        this.setState({
                          showMenu: key,
                        });
                      }}
                    >
                      :
                    </button>
                    {this.state.showMenu === key && (
                      <div
                        className="float-menu"
                        onClick={(ev) => {
                          if (`on${ev.target.innerText}` in this.props)
                            this.props[`on${ev.target.innerText}`](key);
                        }}
                      >
                        {!client.locked ? <button>Lock</button> : <button>Unlock</button>}
                        <button>Delete</button>
                      </div>
                    )}
                  </div>
                )}
                <div className="ender"></div>
              </div>
            );
          })}
        </div>
      </>
    );
  }
}

ClientsList.propTypes = {
  clients: PropTypes.object.isRequired,
  onDelete: PropTypes.func.isRequired,
  onLock: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  onUnlock: PropTypes.func.isRequired,
};

export default ClientsList;
