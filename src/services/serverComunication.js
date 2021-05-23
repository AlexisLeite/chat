class ServerCommunications {
  static fetch(uri, options) {
    var controller = new AbortController();
    let commonOptions = {
      method: "GET",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
    };
    return new Promise((resolve, reject) => {
      fetch(uri, { ...commonOptions, ...options, signal: controller.signal })
        .then((response) => {
          return new Promise((resolve) => {
            let text = null,
              json = null;

            function tryResolve() {
              if (text !== null && json !== null) resolve({ text, json });
            }

            response
              .clone()
              .text()
              .then((res) => {
                text = res;
                tryResolve();
              })
              .catch((error) => {
                text = { error };
                tryResolve();
              });
            response
              .json()
              .then((res) => {
                json = res;
                tryResolve();
              })
              .catch((error) => {
                json = { error };
                tryResolve();
              });
          });
        })
        .then((parsedResponse) => {
          const { text, json } = parsedResponse;
          if (
            (typeof text === "object" && text !== null && "error" in text) ||
            (typeof json === "object" && json !== null && "error" in json)
          ) {
            reject(parsedResponse);
          }

          //console.log(`Server response fetched on uri ${uri}`, json);
          resolve(json);
        })
        .catch(reject);
    });
  }

  static get(uri, options = {}) {
    options.method = "GET";
    return ServerCommunications.fetch(uri, options);
  }

  static post(uri, data = {}, options = {}) {
    options.method = "POST";
    options.body = JSON.stringify(data);
    return ServerCommunications.fetch(uri, options);
  }
}

export { ServerCommunications };
