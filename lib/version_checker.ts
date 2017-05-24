import * as request from "request";
import * as semver from "semver";
import config from "./config";

const repos = [
  config.npmPackage.repository.url,
  "https://github.com/looker/lookerbot",
];

export default class VersionChecker {

  public static newVersion;

  constructor() {

    this.check();

    // Check for new versions every day
    setInterval(() => {
      this.check();
    }, 24 * 60 * 60 * 1000);

  }

  private check() {
    repos.forEach((repo) => this.checkRepo(repo));
  }

  private checkRepo(repoUrl: string) {
    const url = `${repoUrl.split("github.com").join("api.github.com/repos")}/releases/latest`;
    const params = {
      headers: {"User-Agent": config.npmPackage.repository.url},
      url,
    };
    request(params, (error, response, body) => {
      if (error) {
        console.error(`Could not check version at ${url}`);
        this.checked(null);
      } else if (response.statusCode === 200) {
        const json = JSON.parse(body);
        if (semver.gt(json.tag_name, config.npmPackage.version)) {
          console.log(`Found update: ${json.tag_name} is newer than ${config.npmPackage.version}`);
          this.checked(json);
        } else {
          console.log(`Checked for updates from ${url}. No new version available.`);
          this.checked(null);
        }
      } else {
        console.error(`Version check at ${url} returned a non-200 status code.`);
        console.error(body);
      }
    });
  }

  private checked(json) {
    if (json != null) {
      VersionChecker.newVersion = {url: json.html_url, number: json.tag_name};
    } else {
      VersionChecker.newVersion = null;
    }
  }

}
