# certs/ — public certificates (no secrets)

`aws-rds-global-bundle.pem`: AWS's **public** certificate-authority bundle for Amazon RDS (all
regions), downloaded 2026-10-09 from
https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
(AWS docs: "Using SSL/TLS to encrypt a connection to a DB instance").

It lets the app verify the RDS server's certificate. Use it with
`DATABASE_CA_CERT_FILE=certs/aws-rds-global-bundle.pem` (see `lib/database-pool.ts`, `DEPLOY.md`).
It is 170 KB, too big for one environment variable (Linux limit 128 KB), which is why it is a file.

To refresh it (only if AWS announces new RDS certificate authorities), download the same URL again.
