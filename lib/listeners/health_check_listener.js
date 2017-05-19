import Listener from "./listener";

class HealthCheckListener extends Listener {

  type() {
    return "health check listener";
  }

  listen() {
    return this.server.get("/health_check", (req, res) => {
      return this.reply(res, {success: true, reason: "Healthy"});
    });
  }
}

export default HealthCheckListener;
