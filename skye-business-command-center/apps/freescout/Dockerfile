FROM tiredofit/freescout:latest

RUN sed -i "s#'trusted_hosts' => env('APP_TRUSTED_HOSTS', ''),#'trusted_hosts' => env('APP_TRUSTED_HOSTS', 'localhost,127.0.0.1'),#" /assets/install/config/app.php
