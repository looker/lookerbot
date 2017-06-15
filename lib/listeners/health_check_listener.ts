import { Listener } from "./listener"

export class HealthCheckListener extends Listener {

  public type() {
    return "health check listener"
  }

  public listen() {
    return this.server.get("/health_check", (req, res) => {
      return this.reply(res, {success: true, reason: "Healthy"})
    })
  }
}
