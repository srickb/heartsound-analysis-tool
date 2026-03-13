SHELL := /bin/bash

.PHONY: dev stop health status code share stop-share

dev:
	./start

stop:
	./stop_dev.sh

health:
	./health_dev.sh

status:
	./status_dev.sh

code:
	./code

share:
	./share

stop-share:
	./stop_share.sh
