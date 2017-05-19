import * as crypto from 'crypto';

export default class Store {

  configured(): boolean {
    throw "subclass";
  }

  storeBlob(blob, success, error) {
    throw "subclass";
  }

  randomPath(extension = "png") {
    let path = crypto.randomBytes(256).toString('hex').match(/.{1,128}/g);
    return `${path.join("/")}.${extension}`;
  }

}
