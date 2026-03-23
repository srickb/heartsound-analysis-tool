SHELL := /bin/bash

.PHONY: dev stop health status code share stop-share

dev:
	./bin/start

stop:
	./bin/stop_dev.sh

health:
	./bin/health_dev.sh

status:
	./bin/status_dev.sh

code:
	./bin/code

share:
	./bin/share

stop-share:
	./bin/stop_share.sh
