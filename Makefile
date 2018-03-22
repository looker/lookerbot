TEST_COMMANDS := yarn license-checker
CIRCLE_BUILD_NUM ?= latest
CIRCLECI := ${CIRCLECI}
current_dir := $(shell pwd)
project := $(notdir $(current_dir))
gitsha := $(shell git rev-parse HEAD)
image_name := $(shell git remote show origin | sed -n "s/.*Push.*git@github.com.*\/\(.*\)\.git.*/\1/p")
version := $(CIRCLE_BUILD_NUM)
build_date := $(shell date +%Y-%m-%d)
artifactory_api_url := https://upsidetravel.jfrog.io/upsidetravel/api/storage/docker-local

all: image runtests

upstream:
	git remote add upstream https://github.com/looker/lookerbot.git || true
	git pull upstream master

image:
ifeq ($(CIRCLECI), true)
	docker build --rm=false \
		-t upsidetravel-docker.jfrog.io/$(image_name):$(version) .
	docker tag \
		upsidetravel-docker.jfrog.io/$(image_name):$(version) \
		upsidetravel-docker.jfrog.io/$(image_name):latest
else
	docker build \
		-t upsidetravel-docker.jfrog.io/$(image_name):latest .
endif

push:
	docker push upsidetravel-docker.jfrog.io/$(image_name):$(version)
	docker push upsidetravel-docker.jfrog.io/$(image_name):latest
	curl -k \
		-u ${ARTIFACTORY_USERNAME}:${ARTIFACTORY_PASSWORD} \
		-X PUT \
		"$(artifactory_api_url)/$(image_name)/$(version)?properties=build-date=$(build_date);version=$(version);gitsha=$(gitsha)"

deploy:
	$(eval data := '{ \
		 "name"  : "$(image_name)", \
		 "version" : "$(version)", \
		 "type": "k8s", \
		 "token": "${SISYPHUS_TOKEN}" \
	}')
	curl -k \
		-X POST \
		-H "Content-Type: application/json" \
		-d $(data) \
		"${SISYPHUS_URL}"

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
