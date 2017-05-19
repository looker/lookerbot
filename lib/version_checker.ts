import * as request from "request";
import * as semver from 'semver';
import config from './config';

export default class VersionChecker {

  static newVersion;

  constructor() {

    this.check();

    // Check for new versions every day
    setInterval(() => {
      return this.check();
    }
    , 24 * 60 * 60 * 1000);
  }

  check() {
    let params, url;
    return [config.npmPackage.repository.url, "https://github.com/looker/lookerbot"].map((repoUrl) =>

      ((url = `${repoUrl.split("github.com").join("api.github.com/repos")}/releases/latest`),
      (params = {url, headers: {"User-Agent": config.npmPackage.repository.url}}),
      request(params, (error, response, body) => {
        if (error) {
          console.error(`Could not check version at ${url}`);
          return this.checked(null);
        } else if (response.statusCode === 200) {
          let json = JSON.parse(body);
          if (semver.gt(json.tag_name, config.npmPackage.version)) {
            console.log(`Found update: ${json.tag_name} is newer than ${config.npmPackage.version}`);
            return this.checked(json);
          } else {
            console.log(`Checked for updates from ${url}. No new version available.`);
            return this.checked(null);
          }
        } else {
          console.error(`Version check at ${url} returned a non-200 status code.`);
          return console.error(body);
        }
      })));
  }

  checked(json) {
    if (json != null) {
      VersionChecker.newVersion = {url: json.html_url, number: json.tag_name};
    } else {
      VersionChecker.newVersion = null;
    }
  }

}
