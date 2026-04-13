#!/bin/zsh

export MYSQL_USER=root
export MYSQL_PASSWORD='Lovekerry2006)'
export MYSQL_DB=i18n_test

python3 <<EOF
from services.backend_legacy.server import main
main()
EOF
