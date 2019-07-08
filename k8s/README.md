## Lookerbot K8s Deployment

We forked the lookerbot code base from Looker's GitHub repository and set it up to receive webhook calls from the internal Looker service (looker.kargo.com). The original code base has not been updated in a while, but this way we could contribute changes back if we want to. 

- BV, June 2019 

## Deployment Instructions
Prerequisite: You have the proper Kubernetes access set up.

Assuming the docker image in the dev/prod deployment.yaml is what you want, from this directory, use one of the following based on the targeted environment.  Note that `context` name may differ depending on your local Kubernetes configs.

* Production  
  ```bash
  $ kubectl apply -f prod --context=production.us-east-1.kops.kargo.com --namespace=lookerbot 
  ```

* Development  
  ```bash
  $ kubectl apply -f prod --context=staging.us-east-1.kops.kargo.com --namespace=lookerbot-dev 
  ```

If existing secrets need an update, you can use `template/secrets-template.yaml` as a template.  Update all the `FIXME` values.  Then apply the updated file to the applicable environment.

After you apply a deployment, you should use either Papertrail or the following command to verify the deployment was successful.
```bash
$ kubectl get pods -w --namespace=lookerbot --context=production.us-east-1.kops.kargo.com
```

## Ways to check for active production Looker bot.
Note that unless you've confirmed the Looker bot you deployed was made active, the following methods may just mean the last active Looker bot is still running:
* Open https://lookerbot.kargo.com in browser.  You should see `Lookerbot is go` message.
* `curl https://lookerbot.kargo.com/health_check` from terminal.  You should see `Healthy` as the `reason` in the response.
* In Slack, type in `/looker find dashboard` should return a response.
