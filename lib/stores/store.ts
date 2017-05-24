import * as crypto from "crypto";

export default class Store {

  public configured(): boolean {
    throw new Error("subclass");
  }

  public storeBlob(blob, success, error) : Promise<string> {
    throw new Error("subclass");
  }

  protected randomPath(extension = "png") {
    const path = crypto.randomBytes(256).toString("hex").match(/.{1,128}/g)!;
    return `${path.join("/")}.${extension}`;
  }

}
