#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="${1:-/opt/skye-business-command-center}"
sudo cp deploy/systemd/sbcc-health-report.service /etc/systemd/system/sbcc-health-report.service
sudo cp deploy/systemd/sbcc-health-report.timer /etc/systemd/system/sbcc-health-report.timer
sudo sed -i "s#/opt/skye-business-command-center#$PROJECT_DIR#g" /etc/systemd/system/sbcc-health-report.service
sudo systemctl daemon-reload
sudo systemctl enable --now sbcc-health-report.timer
systemctl status sbcc-health-report.timer --no-pager
