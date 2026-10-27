#!/usr/bin/env ash
# shellcheck shell=dash

##
# WARNING: them semi-colons are important for NGINX
#
# Attributions;
#
# - https://www.cyberciti.biz/faq/linux-unix-nginx-access-control-howto/
# - https://docs.nginx.com/nginx/admin-guide/security-controls/denylisting-ip-addresses/
##

set -eE;

nginx-debug -g 'daemon off;';
