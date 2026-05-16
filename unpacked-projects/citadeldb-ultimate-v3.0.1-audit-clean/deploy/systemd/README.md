# systemd Deployment

Install to `/opt/citadeldb`.

```bash
sudo mkdir -p /opt/citadeldb
sudo cp -R . /opt/citadeldb
sudo cp deploy/systemd/*.service deploy/systemd/*.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now citadeldb.service
sudo systemctl enable --now citadeldb-backup.timer
sudo systemctl enable --now citadeldb-restore-test.timer
sudo systemctl enable --now citadeldb-policy-check.timer
```

## Claim rule

Timers existing is not proof. Proof requires generated receipts in `proof/`.
