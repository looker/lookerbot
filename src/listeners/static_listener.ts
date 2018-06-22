import * as express from "express"
import { Listener } from "./listener"

export class StaticListener extends Listener {

  public listen() {
    this.server.use(express.static("public"))
  }

}
