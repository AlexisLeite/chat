import { ServerCommunications } from "services/serverComunication";

export function api(route) {
  return `${env("gameApi")}/${route}`;
}

export function asDebugable(thisObject) {
  thisObject.debugLevel = 1;
  thisObject.debug = (level, ...what) => {
    if (level <= thisObject.debugLevel)
      console.log(`%c ${thisObject.constructor.name}`, "color: green; font-size:1.4em", ...what);
  };
}

// Usage: className(ifOneClass,"oneClass",ifSecondClass,"secondClass"...)
export function className(...args) {
  if (args.length % 2 !== 0) args = args.slice(0, args.length - 1);
  let classes = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i]) classes.push(args[++i]);
  }
  return { className: classes.join(" ") };
}

export function consoleAccess(name, obj) {
  window[name] = obj;
}

export function env(sufix) {
  return process.env[`REACT_APP_${sufix}`];
}

export function exists(obj, route, cb) {
  route = route.split(".");
  for (let dir of route) {
    if (!(typeof obj === "object" || typeof obj === "function") || obj === null || !(dir in obj))
      return false;
    obj = obj[dir];
  }

  if (typeof cb === "function") cb(obj);
  return obj;
}

export function EasyEvents() {
  this.easyEventsId = 0;
  this.easyEvents = [];

  this.addEvent = function (name) {
    name = ucFirst(name);
    this.easyEvents.push(name);
    this[`on${name}Callbacks`] = [];
    this[`onRegister${name}Callbacks`] = [];
    this[`off${name}`] = function (suscription) {
      if (exists(this, `on${name}Callbacks`))
        this[`on${name}Callbacks`] = this[`on${name}Callbacks`].filter(
          (record) => record.callback !== suscription.callback || record.id !== suscription.id
        );
    };
    this[`on${name}`] = function (callback) {
      if (typeof callback == "function") {
        let id = this.easyEventsId++;
        this[`on${name}Callbacks`].push({ callback: callback, id });

        for (let onRegisterCb of this[`onRegister${name}Callbacks`]) {
          onRegisterCb.callback(callback);
        }

        return {
          callback,
          id,
          cancel: () => {
            this[`off${name}`]({ callback, id });
          },
        };
      }
    };
    this[`onRegister${name}`] = function (cb) {
      if (typeof cb == "function") {
        let newId = this.easyEventsId++;
        this[`onRegister${name}Callbacks`].push({ callback: cb, id: newId });
        return newId;
      }
    };

    this[`fire${name}`] = function (...args) {
      for (let record of this[`on${name}Callbacks`]) record.callback(...args);
    };
  };

  this.addEvents = function (events) {
    for (let event of events) {
      this.addEvent(event);
    }
  };

  this.off = function (event, suscription) {
    if (`off${ucFirst(event)}` in this) return this[`off${ucFirst(event)}`]();
  };

  this.on = function (event, handler) {
    if (!(`on${ucFirst(event)}` in this)) {
      this.addEvent(event);
    }
    return this[`on${ucFirst(event)}`](handler);
  };
}

export function hashes(ammount) {
  var array = new Uint32Array(ammount);
  return window.crypto.getRandomValues(array);
}

export function max(...args) {
  let current = -Infinity;
  for (let arg of args) if (arg > current) current = arg;
  return current;
}

export function MultiStage(props) {
  let results = [];
  for (let stage of props.stages) {
    if ((typeof stage[0] === "function" && stage[0]()) || stage[0] === true) {
      const result = typeof stage[1] === "function" ? stage[1]() : stage[1];
      if (props.multiple) results.push(result);
      else return result;
    }
  }

  if (results.length) return results;
  return null;
}

export function required(name) {
  throw Error(`The parameter ${name} is required`);
}

export function round(val, digits) {
  return Math.round(val * 10 ** digits) / 10 ** digits;
}

var translations = null;
export function loadTranslates() {
  return ServerCommunications.get(api("translates"))
    .then((res) => {
      translations = Object.keys(res);
    })
    .catch((e) => console.error("Error trying to fetch translations", e));
}

export function translate(str) {
  if (translations !== null) {
    str = str.replaceAll(/([\r\n:])/g, "");
    if (!translations.includes(str)) {
      ServerCommunications.post(api("translate"), { str })
        .then((res) => console.log(res))
        .error((err) => console.error(err));
    }

    translations.push(str);
  }

  return str;
}

export function ucFirst(str) {
  return str.charAt(0).toUpperCase() + str.substring(1);
}
