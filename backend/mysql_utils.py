import os
import shutil
import subprocess
import time

from . import config
from .validation import truthy_env


def mysql_env():
    env = os.environ.copy()
    mysql_password = env.get("MYSQL_PASSWORD") or env.get("MYSQL_PWD")
    if mysql_password:
        env["MYSQL_PWD"] = mysql_password
    return env


def mysql_host_port_user_db():
    host = os.environ.get("MYSQL_HOST", "127.0.0.1")
    port = os.environ.get("MYSQL_PORT", "3306")
    user = os.environ.get("MYSQL_USER", "root")
    db = os.environ.get("MYSQL_DB", "i18n_test")
    return host, port, user, db


def mysql_escape(value):
    if value is None:
        return ""
    return str(value).replace("\\", "\\\\").replace("'", "\\'")


def mysql_cmd_base(include_db=False):
    host, port, user, db = mysql_host_port_user_db()
    cmd = [
        "mysql",
        "--protocol=TCP",
        "-h",
        host,
        "-P",
        str(port),
        "-u",
        user,
        "--batch",
        "--raw",
        "--skip-column-names",
    ]
    if include_db:
        cmd += ["-D", db]
    return cmd


def mysql_exec(sql, include_db=True, timeout_sec=5):
    if shutil.which("mysql") is None:
        return None, "no_cli"
    try:
        result = subprocess.run(
            mysql_cmd_base(include_db=include_db) + ["-e", sql],
            env=mysql_env(),
            capture_output=True,
            text=True,
            timeout=timeout_sec,
        )
    except Exception:
        return None, "exec_error"
    if result.returncode != 0:
        return None, "exec_error"
    return (result.stdout or ""), "ok"


def mysql_can_connect(timeout_sec=2):
    if shutil.which("mysql") is None:
        return False
    try:
        result = subprocess.run(
            mysql_cmd_base(include_db=False) + ["-e", "SELECT 1;"],
            env=mysql_env(),
            capture_output=True,
            text=True,
            timeout=timeout_sec,
        )
        return result.returncode == 0
    except Exception:
        return False


def _try_start_mysql_via_brew():
    if shutil.which("brew") is None:
        return False
    service_candidates = []
    explicit = os.environ.get("MYSQL_BREW_SERVICE")
    if explicit:
        service_candidates.append(explicit)
    service_candidates += ["mysql", "mysql@8.0", "mysql@5.7"]

    for service in service_candidates:
        try:
            result = subprocess.run(
                ["brew", "services", "start", service],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                print(f"MySQL: started via brew services ({service})")
                return True
        except Exception:
            continue
    return False


def _try_start_mysql_via_mysql_server():
    script = shutil.which("mysql.server")
    if script is None:
        candidates = [
            "/usr/local/mysql/support-files/mysql.server",
            "/opt/homebrew/opt/mysql/support-files/mysql.server",
            "/opt/homebrew/opt/mysql@8.0/support-files/mysql.server",
            "/opt/homebrew/opt/mysql@5.7/support-files/mysql.server",
            "/usr/local/opt/mysql/support-files/mysql.server",
            "/usr/local/opt/mysql@8.0/support-files/mysql.server",
            "/usr/local/opt/mysql@5.7/support-files/mysql.server",
        ]
        for path in candidates:
            if os.path.isfile(path) and os.access(path, os.X_OK):
                script = path
                break
    if script is None:
        return False
    try:
        result = subprocess.run(
            [script, "start"],
            capture_output=True,
            text=True,
            timeout=15,
        )
        if result.returncode == 0:
            print("MySQL: started via mysql.server")
            return True
    except Exception:
        return False
    return False


def _docker_container_exists(name):
    if shutil.which("docker") is None:
        return False
    try:
        result = subprocess.run(
            ["docker", "inspect", name],
            capture_output=True,
            text=True,
            timeout=5,
        )
        return result.returncode == 0
    except Exception:
        return False


def _try_start_mysql_via_docker():
    if not truthy_env(os.environ, "MYSQL_DOCKER", default=False):
        return False
    if shutil.which("docker") is None:
        return False

    host, port, user, db = mysql_host_port_user_db()
    if str(host) not in ("127.0.0.1", "localhost"):
        return False
    if str(port) != "3306":
        return False
    if str(user) != "root":
        return False

    env = mysql_env()
    root_password = env.get("MYSQL_PWD")
    if not root_password:
        return False

    container = os.environ.get("MYSQL_DOCKER_CONTAINER", "smartwardrobe-mysql")
    image = os.environ.get("MYSQL_DOCKER_IMAGE", "mysql:8")

    if _docker_container_exists(container):
        try:
            result = subprocess.run(
                ["docker", "start", container],
                capture_output=True,
                text=True,
                timeout=15,
            )
            if result.returncode == 0:
                print(f"MySQL: started docker container ({container})")
                return True
        except Exception:
            return False
        return False

    try:
        result = subprocess.run(
            [
                "docker",
                "run",
                "-d",
                "--name",
                container,
                "-e",
                f"MYSQL_ROOT_PASSWORD={root_password}",
                "-e",
                f"MYSQL_DATABASE={db}",
                "-p",
                "3306:3306",
                image,
            ],
            capture_output=True,
            text=True,
            timeout=60,
        )
        if result.returncode == 0:
            print(f"MySQL: created+started docker container ({container})")
            return True
    except Exception:
        return False
    return False


def wait_for_mysql(max_wait_sec=20):
    deadline = time.time() + max_wait_sec
    while time.time() < deadline:
        if mysql_can_connect(timeout_sec=2):
            return True
        time.sleep(0.5)
    return False


def ensure_mysql_running():
    if not truthy_env(os.environ, "AUTO_START_DB", default=True):
        return
    if mysql_can_connect(timeout_sec=2):
        return

    started = _try_start_mysql_via_docker() or _try_start_mysql_via_brew() or _try_start_mysql_via_mysql_server()
    if not started:
        print("MySQL: not reachable and could not be started automatically")
        return

    if not wait_for_mysql(max_wait_sec=25):
        print("MySQL: started but not reachable yet")


def ensure_user_tables():
    if not mysql_can_connect(timeout_sec=2):
        return
    host, port, user, db = mysql_host_port_user_db()
    ddl = f"""
CREATE TABLE IF NOT EXISTS `{db}`.`user_favorites` (
  `client_id` VARCHAR(64) NOT NULL,
  `entity_type` VARCHAR(16) NOT NULL,
  `entity_id` VARCHAR(64) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`client_id`, `entity_type`, `entity_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `{db}`.`user_kv` (
  `client_id` VARCHAR(64) NOT NULL,
  `namespace` VARCHAR(64) NOT NULL,
  `k` VARCHAR(128) NOT NULL,
  `v_json` LONGTEXT NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`client_id`, `namespace`, `k`),
  KEY `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `{db}`.`user_schedules` (
  `client_id` VARCHAR(64) NOT NULL,
  `schedule_id` VARCHAR(64) NOT NULL,
  `start_at` DATETIME(3) NOT NULL,
  `end_at` DATETIME(3) NULL,
  `payload_json` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`client_id`, `schedule_id`),
  KEY `idx_client_start` (`client_id`, `start_at`),
  KEY `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
""".strip()
    mysql_exec(ddl, include_db=False, timeout_sec=10)


def ensure_auth_tables():
    if not mysql_can_connect(timeout_sec=2):
        return
    host, port, user, db = mysql_host_port_user_db()
    ddl = f"""
CREATE TABLE IF NOT EXISTS `{db}`.`user_accounts` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(128) NOT NULL,
  `email` VARCHAR(254) NULL,
  `mobile` VARCHAR(32) NULL,
  `password_salt_hex` CHAR(32) NOT NULL,
  `password_hash_hex` CHAR(64) NOT NULL,
  `password_iterations` INT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_email` (`email`),
  UNIQUE KEY `uniq_mobile` (`mobile`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
""".strip()
    mysql_exec(ddl, include_db=False, timeout_sec=10)


def init_i18n_database():
    if not truthy_env(os.environ, "INIT_I18N_DB", default=False):
        return
    if shutil.which("mysql") is None:
        print("MySQL: mysql CLI not found; skip init")
        return
    sql_path = os.environ.get(
        "MYSQL_INIT_SQL",
        os.path.join(config.PROJECT_ROOT, "scripts", "mysql", "init_i18n_test.sql"),
    )
    if not os.path.isfile(sql_path):
        print(f"MySQL: init SQL not found: {sql_path}")
        return
    try:
        with open(sql_path, "r", encoding="utf-8") as f:
            sql = f.read()
    except Exception:
        print("MySQL: failed to read init SQL; skip init")
        return

    try:
        result = subprocess.run(
            mysql_cmd_base(include_db=False),
            env=mysql_env(),
            input=sql,
            capture_output=True,
            text=True,
            timeout=60,
        )
        if result.returncode == 0:
            print("MySQL: i18n_test initialized")
        else:
            print("MySQL: init failed; server will still start")
    except Exception:
        print("MySQL: init failed; server will still start")

