SHELL := /bin/bash

.PHONY: dev stop health status

dev:
	./start

stop:
	./stop_dev.sh

health:
	./health_dev.sh

status:
	./status_dev.sh
