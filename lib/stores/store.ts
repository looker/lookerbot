// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
import crypto from 'crypto';

class Store {

  randomPath(extension) {
    if (extension == null) { extension = "png"; }
    let path = crypto.randomBytes(256).toString('hex').match(/.{1,128}/g);
    return `${path.join("/")}.${extension}`;
  }
}

export default Store;
