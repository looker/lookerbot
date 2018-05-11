TEST_COMMANDS := yarn license-checker
CIRCLE_BUILD_NUM ?= latest
current_dir := $(shell pwd)
project := $(notdir $(current_dir))
gitsha := $(shell git rev-parse HEAD)
image_name := $(shell git remote show origin | sed -n "s/.*Push.*git@github.com.*\/\(.*\)\.git.*/\1/p")
version := $(CIRCLE_BUILD_NUM)
build_date := $(shell date "+%Y-%m-%d")
artifactory_api_url := https://upsidetravel.jfrog.io/upsidetravel/api/storage/docker-local

all: image runtests

define build_image
docker build \
	--build-arg ARTIFACTORY_USERNAME=${ARTIFACTORY_USERNAME} \
	--build-arg ARTIFACTORY_PASSWORD=${ARTIFACTORY_PASSWORD} \
	--build-arg VERSION=$(version) \
	--build-arg GITSHA=$(gitsha) \
	-t upsidetravel-docker.jfrog.io/$(image_name):$(1) .
endef

define tag_image
docker tag \
	upsidetravel-docker.jfrog.io/$(image_name):$(1) \
	upsidetravel-docker.jfrog.io/$(image_name):$(2)
endef

define push_image
docker push upsidetravel-docker.jfrog.io/$(image_name):$(1)
endef

define jfrog_tags
curl -k \
	-u ${ARTIFACTORY_USERNAME}:${ARTIFACTORY_PASSWORD} \
	-X PUT \
	"$(artifactory_api_url)/$(image_name)/$(1)?properties=build-date=$(build_date);version=$(2);gitsha=$(gitsha)"
endef

define deploy_image
$(eval data := '{ \
	 "name"  : "$(1)", \
	 "version" : "$(2)", \
	 "type": "k8s", \
	 "token": "${SISYPHUS_TOKEN}" \
}')
curl -k \
	-X POST \
	-H "Content-Type: application/json" \
	-d $(data) \
	"${SISYPHUS_URL}"
endef

define create_volume
$(call delete_volume,$(1))
docker volume create $(1)
endef

define delete_volume
$(call unmount_volume,$(1))
docker volume rm $(1) > /dev/null 2>&1 || true
endef

define mount_volume
docker create --mount source=$(1),target=$(2) --name $(1) alpine:3.4 /bin/true
endef

define unmount_volume
docker rm -f $(1) > /dev/null 2>&1 || true
endef

upstream:
	git remote add upstream https://github.com/looker/lookerbot.git || true
	git pull upstream master

image:
	$(call build_image,$(version))
	$(call tag_image,$(version),latest)

push:
	$(call push_image,$(version))
	$(call jfrog_tags,$(version),$(version))
	$(call push_image,latest)
	$(call jfrog_tags,latest,$(version))

deploy:
	$(call deploy_image,$(image_name),$(version))

testprep:
	IFS="$$(printf '\n+')"; IFS="$${IFS%+}"; \
	for f in $$(git show-ref --heads); do \
		echo $$(echo $$f | cut -c 1-40) | tee $(current_dir)/.git/$$(echo $$f | cut -c42-); \
		cat $(current_dir)/.git/$$(echo $$f | cut -c42-); \
	done

runtests: testprep
	docker run -i -t \
		-v $(current_dir)/.git:/opt/app/.git \
		--entrypoint /bin/sh \
		upsidetravel-docker.jfrog.io/$(image_name):latest \
		-c "$(TEST_COMMANDS)"

snyk:
	$(call create_volume,$(image_name)-snyk)
	$(call mount_volume,$(image_name)-snyk,/src)
	docker cp . $(image_name)-snyk:/src
	docker run --rm -ti \
		--volumes-from $(image_name)-snyk \
		-e ARTIFACTORY_USERNAME \
		-e ARTIFACTORY_PASSWORD \
		-e SNYK_LEVEL \
		-e SNYK_TOKEN \
		-e WORKING_PATH=/src \
		upsidetravel-docker.jfrog.io/snyk-upside:latest
	$(call delete_volume,$(image_name)-snyk)
