import React, { Component } from "react";

export class Modal extends Component {
  static defaultProps = {
    // Default placeholders
    title: null,
    children: "Modal text",

    // Events
    hasClosed: () => {},

    // Handling
    canClose: true,
    show: true,

    // Styling
    textAlign: false,

    // Properties
    id: "",
    className: "",
    centeredFlex: false,
  };

  constructor(props) {
    super(props);

    this.state = {
      show: props.show,
    };
  }

  backgroundRef = React.createRef();

  close = (ev) => {
    if (!this.props.canClose || ev.target !== this.backgroundRef.current) return;

    this.setState({
      show: false,
    });

    this.props.hasClosed();
  };

  componentDidUpdate(prevProps) {
    if (prevProps.show !== this.props.show)
      this.setState({
        show: this.props.show,
      });
  }

  render() {
    return (
      this.state.show && (
        <div
          onClick={this.close}
          ref={this.backgroundRef}
          className={`modal-background ${this.props.className}`}
        >
          <div
            id={this.props.id || ""}
            style={{ textAlign: this.props.textAlign }}
            className={`modal`}
          >
            {this.props.title && <div className="modal-header">{this.props.title}</div>}
            <div className={`modal-body ${this.props.centeredFlex ? "flex-justify" : ""}`}>
              {this.props.children}
            </div>
          </div>
        </div>
      )
    );
  }
}

export default Modal;
