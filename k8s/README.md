## Lookerbot K8s Deployment

We forked the lookerbot code base from Looker's GitHub repository and set it up to receive webhook calls from the internal Looker service (looker.kargo.com). The original code base has not been updated in a while, but this way we could contribute changes back if we want to. 

- BV, June 2019 

## Deployment Instructions
Prerequisite: You have the proper Kubernetes access set up.

Assuming the docker image in the dev/prod deployment.yaml is what you want, from this directory, use one of the following based on the targeted environment:

* Production  
  ```bash
  $ kubectl apply -f prod --context=production.us-east-1.kops.kargo.com --namespace=lookerbot 
  ```

* Development  
  ```bash
  $ kubectl apply -f prod --context=staging.us-east-1.kops.kargo.com --namespace=lookerbot-dev 
  ```

If existing secrets need update, you can use `template/secrets-template.yaml` as a template.  Update all the `FIXME` values.  Then apply the updated file to the applicable environment.

After a deployment, you should check the container logs (or use papertrail) to confirm the deployment was successful.

Other ways to quickly check if the production Looker bot is active:
* Open https://lookerbot.kargo.com in browser.  You should see `Lookerbot is go` message.
* `curl https://lookerbot.kargo.com/health_check` from terminal.  You should see `Healthy` in the response.
* In Slack, type in `/looker find dashboard` should return a response.
