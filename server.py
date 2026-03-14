import http.server
import socketserver
import socket
import json
import os
import subprocess
import shutil
import time
import urllib.parse
import hashlib
import hmac
import secrets
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get("PORT", "8080"))
# Serve the WebApp directory (contains wardrobe/index.html)
DIRECTORY = os.path.join(BASE_DIR, "App", "WebApp")
MAX_BODY_BYTES = int(os.environ.get("MAX_BODY_BYTES", "1048576"))

def _truthy_env(name, default=False):
    val = os.environ.get(name)
    if val is None:
        return default
    return str(val).strip().lower() in ("1", "true", "yes", "y", "on")

def _mysql_env():
    env = os.environ.copy()
    mysql_password = env.get("MYSQL_PASSWORD") or env.get("MYSQL_PWD")
    if mysql_password:
        env["MYSQL_PWD"] = mysql_password
    return env

def _mysql_host_port_user_db():
    host = os.environ.get("MYSQL_HOST", "127.0.0.1")
    port = os.environ.get("MYSQL_PORT", "3306")
    user = os.environ.get("MYSQL_USER", "root")
    db = os.environ.get("MYSQL_DB", "i18n_test")
    return host, port, user, db

def _mysql_cmd_base(include_db=False):
    host, port, user, db = _mysql_host_port_user_db()
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

def _mysql_exec(sql, include_db=True, timeout_sec=5):
    if shutil.which("mysql") is None:
        return None, "no_cli"
    try:
        result = subprocess.run(
            _mysql_cmd_base(include_db=include_db) + ["-e", sql],
            env=_mysql_env(),
            capture_output=True,
            text=True,
            timeout=timeout_sec,
        )
    except Exception:
        return None, "exec_error"
    if result.returncode != 0:
        return None, "exec_error"
    return (result.stdout or ""), "ok"

def _mysql_escape(value):
    if value is None:
        return ""
    return str(value).replace("\\", "\\\\").replace("'", "\\'")

def _safe_client_id(raw):
    if not isinstance(raw, str):
        return None
    val = raw.strip()
    if not val or len(val) > 64:
        return None
    if not all(c.isalnum() or c in ("-", "_") for c in val):
        return None
    return val

def _safe_entity_type(raw):
    if raw in ("outfit", "pick"):
        return raw
    return None

def _safe_entity_id(raw):
    if raw is None:
        return None
    val = str(raw).strip()
    if not val or len(val) > 64:
        return None
    if not all(c.isalnum() or c in ("-", "_") for c in val):
        return None
    return val

def _safe_namespace(raw):
    if not isinstance(raw, str):
        return None
    val = raw.strip()
    if not val or len(val) > 64:
        return None
    if not all(c.isalnum() or c in ("-", "_", ".", ":") for c in val):
        return None
    return val

def _safe_kv_key(raw):
    if not isinstance(raw, str):
        return None
    val = raw.strip()
    if not val or len(val) > 128:
        return None
    if not all(c.isalnum() or c in ("-", "_", ".", ":") for c in val):
        return None
    return val

def _safe_name(raw):
    if not isinstance(raw, str):
        return None
    val = raw.strip()
    if not val or len(val) > 128:
        return None
    return val

_EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
_CN_MOBILE_RE = re.compile(r"^1[3-9]\d{9}$")

def _safe_email_or_mobile(raw):
    if not isinstance(raw, str):
        return (None, None)
    val = raw.strip()
    if not val or len(val) > 254:
        return (None, None)
    if _EMAIL_RE.match(val):
        return (val.lower(), None)
    if _CN_MOBILE_RE.match(val):
        return (None, val)
    return (None, None)

def _hash_password(password, salt_hex=None, iterations=200_000):
    if not isinstance(password, str):
        return None
    if len(password) < 6 or len(password) > 256:
        return None
    if salt_hex:
        try:
            salt = bytes.fromhex(salt_hex)
        except Exception:
            return None
    else:
        salt = secrets.token_bytes(16)
        salt_hex = salt.hex()
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(iterations))
    return {"salt_hex": salt_hex, "hash_hex": dk.hex(), "iterations": int(iterations)}

def _verify_password(password, salt_hex, hash_hex, iterations):
    record = _hash_password(password, salt_hex=salt_hex, iterations=int(iterations))
    if not record:
        return False
    return hmac.compare_digest(record["hash_hex"], str(hash_hex or ""))

def mysql_can_connect(timeout_sec=2):
    if shutil.which("mysql") is None:
        return False
    try:
        result = subprocess.run(
            _mysql_cmd_base(include_db=False) + ["-e", "SELECT 1;"],
            env=_mysql_env(),
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
    if not _truthy_env("MYSQL_DOCKER", default=False):
        return False
    if shutil.which("docker") is None:
        return False

    host, port, user, db = _mysql_host_port_user_db()
    if str(host) not in ("127.0.0.1", "localhost"):
        return False
    if str(port) != "3306":
        return False
    if str(user) != "root":
        return False

    env = _mysql_env()
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

def ensure_user_tables():
    if not mysql_can_connect(timeout_sec=2):
        return
    host, port, user, db = _mysql_host_port_user_db()
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
""".strip()
    _mysql_exec(ddl, include_db=False, timeout_sec=10)

def ensure_auth_tables():
    if not mysql_can_connect(timeout_sec=2):
        return
    host, port, user, db = _mysql_host_port_user_db()
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
    _mysql_exec(ddl, include_db=False, timeout_sec=10)

def init_i18n_database():
    if not _truthy_env("INIT_I18N_DB", default=False):
        return
    if shutil.which("mysql") is None:
        print("MySQL: mysql CLI not found; skip init")
        return
    sql_path = os.environ.get(
        "MYSQL_INIT_SQL",
        os.path.join(BASE_DIR, "scripts", "mysql", "init_i18n_test.sql"),
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
            _mysql_cmd_base(include_db=False),
            env=_mysql_env(),
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

def ensure_mysql_running():
    if not _truthy_env("AUTO_START_DB", default=True):
        return
    if mysql_can_connect(timeout_sec=2):
        return

    started = (
        _try_start_mysql_via_docker()
        or _try_start_mysql_via_brew()
        or _try_start_mysql_via_mysql_server()
    )
    if not started:
        print("MySQL: not reachable and could not be started automatically")
        return

    if not wait_for_mysql(max_wait_sec=25):
        print("MySQL: started but not reachable yet")

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/i18n":
            self.handle_i18n(parsed.query)
            return
        if parsed.path == "/api/favorites":
            self.handle_favorites_get()
            return
        if parsed.path == "/api/user_kv":
            self.handle_user_kv_get(parsed.query)
            return
        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/auth/register":
            self.handle_auth_register()
            return
        if parsed.path == "/api/auth/login":
            self.handle_auth_login()
            return
        if parsed.path == "/api/favorites":
            self.handle_favorites_post()
            return
        if parsed.path == "/api/user_kv":
            self.handle_user_kv_post()
            return
        self.send_json(404, {"error": "not_found"})

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Client-Id, Authorization")
        self.send_header("Access-Control-Max-Age", "86400")
        self.end_headers()

    def _read_json_body(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0 or length > MAX_BODY_BYTES:
            return (None, "invalid_length")
        try:
            raw = self.rfile.read(length).decode("utf-8")
            body = json.loads(raw) if raw else {}
        except Exception:
            return (None, "invalid_json")
        if not isinstance(body, dict):
            return (None, "invalid_json")
        return (body, "ok")

    def handle_auth_register(self):
        if not mysql_can_connect(timeout_sec=2):
            self.send_json(500, {"error": "db_error"})
            return
        ensure_auth_tables()

        body, status = self._read_json_body()
        if status != "ok":
            self.send_json(400, {"error": status})
            return

        name = _safe_name(body.get("name"))
        email, mobile = _safe_email_or_mobile(body.get("emailOrMobile"))
        password = body.get("password")
        if not name or (not email and not mobile) or not isinstance(password, str):
            self.send_json(400, {"error": "invalid_fields"})
            return
        record = _hash_password(password)
        if not record:
            self.send_json(400, {"error": "password_too_short"})
            return

        host, port, user, db = _mysql_host_port_user_db()
        if email:
            sql = (
                f"SELECT id FROM `{db}`.`user_accounts` "
                f"WHERE email='{_mysql_escape(email)}' "
                "LIMIT 1;"
            )
            out, q_status = _mysql_exec(sql, include_db=False, timeout_sec=5)
            if q_status != "ok":
                self.send_json(500, {"error": "db_error"})
                return
            if (out or "").strip():
                self.send_json(409, {"error": "email_registered"})
                return
        if mobile:
            sql = (
                f"SELECT id FROM `{db}`.`user_accounts` "
                f"WHERE mobile='{_mysql_escape(mobile)}' "
                "LIMIT 1;"
            )
            out, q_status = _mysql_exec(sql, include_db=False, timeout_sec=5)
            if q_status != "ok":
                self.send_json(500, {"error": "db_error"})
                return
            if (out or "").strip():
                self.send_json(409, {"error": "mobile_registered"})
                return

        email_sql = f"'{_mysql_escape(email)}'" if email else "NULL"
        mobile_sql = f"'{_mysql_escape(mobile)}'" if mobile else "NULL"
        insert_sql = (
            f"INSERT INTO `{db}`.`user_accounts` "
            "(name, email, mobile, password_salt_hex, password_hash_hex, password_iterations) "
            f"VALUES ('{_mysql_escape(name)}', {email_sql}, {mobile_sql}, "
            f"'{_mysql_escape(record['salt_hex'])}', '{_mysql_escape(record['hash_hex'])}', {int(record['iterations'])});"
        )
        _, i_status = _mysql_exec(insert_sql, include_db=False, timeout_sec=5)
        if i_status != "ok":
            self.send_json(500, {"error": "db_error"})
            return

        where = f"email='{_mysql_escape(email)}'" if email else f"mobile='{_mysql_escape(mobile)}'"
        select_sql = (
            f"SELECT id, name, email, mobile FROM `{db}`.`user_accounts` "
            f"WHERE {where} "
            "LIMIT 1;"
        )
        out, s_status = _mysql_exec(select_sql, include_db=False, timeout_sec=5)
        if s_status != "ok":
            self.send_json(500, {"error": "db_error"})
            return
        line = (out or "").strip().splitlines()[0] if (out or "").strip() else ""
        parts = line.split("\t") if line else []
        if len(parts) >= 4:
            user_obj = {"id": int(parts[0]), "name": parts[1], "email": parts[2] or None, "mobile": parts[3] or None, "avatar": "images/default_avatar.svg"}
        else:
            user_obj = {"name": name, "email": email, "mobile": mobile, "avatar": "images/default_avatar.svg"}
        self.send_json(201, {"message": "registered", "user": user_obj})

    def handle_auth_login(self):
        if not mysql_can_connect(timeout_sec=2):
            self.send_json(500, {"error": "db_error"})
            return
        ensure_auth_tables()

        body, status = self._read_json_body()
        if status != "ok":
            self.send_json(400, {"error": status})
            return

        email, mobile = _safe_email_or_mobile(body.get("emailOrMobile"))
        password = body.get("password")
        if (not email and not mobile) or not isinstance(password, str):
            self.send_json(400, {"error": "invalid_fields"})
            return

        host, port, user, db = _mysql_host_port_user_db()
        where = f"email='{_mysql_escape(email)}'" if email else f"mobile='{_mysql_escape(mobile)}'"
        sql = (
            "SELECT id, name, email, mobile, password_salt_hex, password_hash_hex, password_iterations "
            f"FROM `{db}`.`user_accounts` "
            f"WHERE {where} "
            "LIMIT 1;"
        )
        out, q_status = _mysql_exec(sql, include_db=False, timeout_sec=5)
        if q_status != "ok":
            self.send_json(500, {"error": "db_error"})
            return
        line = (out or "").strip().splitlines()[0] if (out or "").strip() else ""
        parts = line.split("\t") if line else []
        if len(parts) < 7:
            self.send_json(401, {"error": "invalid_credentials"})
            return
        user_id, name, email_val, mobile_val, salt_hex, hash_hex, iterations = parts[:7]
        if not _verify_password(password, salt_hex, hash_hex, iterations):
            self.send_json(401, {"error": "invalid_credentials"})
            return
        user_obj = {
            "id": int(user_id),
            "name": name,
            "email": email_val or None,
            "mobile": mobile_val or None,
            "avatar": "images/default_avatar.svg",
        }
        self.send_json(200, {"message": "ok", "user": user_obj})

    def handle_i18n(self, query):
        params = urllib.parse.parse_qs(query or "")
        locale = (params.get("locale") or ["en-US"])[0]

        if not isinstance(locale, str) or len(locale) > 16 or not all(c.isalnum() or c in "-_" for c in locale):
            self.send_json(400, {"error": "invalid_locale"})
            return

        pack, status = self.load_language_pack(locale)
        if pack is None:
            if status == "db_error":
                self.send_json(500, {"error": "db_error"})
                return
            self.send_json(404, {"error": "locale_not_found"})
            return

        self.sync_language_file(locale, pack)
        self.send_json(200, pack)

    def load_language_pack(self, locale):
        file_pack = self.load_language_pack_from_file(locale)
        db_pack, status = self.load_language_pack_from_db(locale)
        if db_pack is None:
            if status == "db_error":
                return None, "db_error"
            if file_pack:
                return file_pack, "file"
            return None, "not_found"
        cleaned_db_pack = {k: v for k, v in db_pack.items() if v is not None and v != ""}
        if file_pack:
            merged = dict(file_pack)
            merged.update(cleaned_db_pack)
            return (merged, "ok") if merged else (None, "not_found")
        return (cleaned_db_pack, "ok") if cleaned_db_pack else (None, "not_found")

    def load_language_pack_from_file(self, locale):
        filename = None
        if locale == "en-US":
            filename = "en-US.json"
        elif locale == "zh-CN":
            filename = "zh-CN.json"
        if not filename:
            return None
        file_path = os.path.join(DIRECTORY, filename)
        if not os.path.isfile(file_path):
            return None
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return data if isinstance(data, dict) else None
        except Exception:
            return None

    def load_language_pack_from_db(self, locale):
        host = os.environ.get("MYSQL_HOST", "127.0.0.1")
        port = os.environ.get("MYSQL_PORT", "3306")
        user = os.environ.get("MYSQL_USER", "root")
        db = os.environ.get("MYSQL_DB", "i18n_test")

        env = _mysql_env()

        query = f"SELECT `key`, value FROM language_packs WHERE locale='{locale}';"
        cmd = [
            "mysql",
            "--protocol=TCP",
            "-h",
            host,
            "-P",
            str(port),
            "-u",
            user,
            "-D",
            db,
            "--batch",
            "--raw",
            "--skip-column-names",
            "-e",
            query,
        ]

        try:
            result = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=5)
        except Exception:
            return None, "db_error"

        if result.returncode != 0:
            return None, "db_error"

        out = result.stdout or ""
        out = out.strip("\n")
        if not out:
            return None, "not_found"

        pack = {}
        for line in out.splitlines():
            if "\t" not in line:
                continue
            k, v = line.split("\t", 1)
            if k:
                pack[k] = v
        return (pack, "ok") if pack else (None, "not_found")

    def sync_language_file(self, locale, pack):
        filename = None
        if locale == "en-US":
            filename = "en-US.json"
        elif locale == "zh-CN":
            filename = "zh-CN.json"
        if not filename:
            return

        file_path = os.path.join(DIRECTORY, filename)
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(pack, f, ensure_ascii=False, indent=2, sort_keys=True)
                f.write("\n")
        except Exception:
            return

    def handle_favorites_get(self):
        if not mysql_can_connect(timeout_sec=2):
            self.send_json(500, {"error": "db_error"})
            return
        ensure_user_tables()

        client_id = _safe_client_id(self.headers.get("X-Client-Id") or "")
        if not client_id:
            self.send_json(400, {"error": "invalid_client"})
            return

        host, port, user, db = _mysql_host_port_user_db()
        sql = (
            "SELECT entity_type, entity_id "
            f"FROM `{db}`.`user_favorites` "
            f"WHERE client_id='{_mysql_escape(client_id)}' "
            "ORDER BY created_at DESC;"
        )
        out, status = _mysql_exec(sql, include_db=False, timeout_sec=5)
        if status != "ok":
            self.send_json(500, {"error": "db_error"})
            return

        favorites = {"outfit": [], "pick": []}
        for line in (out or "").splitlines():
            parts = line.split("\t")
            if len(parts) != 2:
                continue
            t, entity_id = parts
            t = _safe_entity_type(t)
            entity_id = _safe_entity_id(entity_id)
            if not t or not entity_id:
                continue
            favorites[t].append(entity_id)

        self.send_json(200, {"favorites": favorites})

    def handle_favorites_post(self):
        if not mysql_can_connect(timeout_sec=2):
            self.send_json(500, {"error": "db_error"})
            return
        ensure_user_tables()

        client_id = _safe_client_id(self.headers.get("X-Client-Id") or "")
        if not client_id:
            self.send_json(400, {"error": "invalid_client"})
            return

        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0 or length > MAX_BODY_BYTES:
            self.send_json(413, {"error": "payload_too_large"})
            return

        try:
            raw = self.rfile.read(length).decode("utf-8")
            body = json.loads(raw) if raw else {}
        except Exception:
            self.send_json(400, {"error": "invalid_json"})
            return

        entity_type = _safe_entity_type(body.get("type"))
        entity_id = _safe_entity_id(body.get("id"))
        action = body.get("action") or "toggle"
        if not entity_type or not entity_id:
            self.send_json(400, {"error": "invalid_favorite"})
            return
        if action not in ("toggle", "add", "remove"):
            self.send_json(400, {"error": "invalid_action"})
            return

        host, port, user, db = _mysql_host_port_user_db()
        exists_sql = (
            "SELECT 1 "
            f"FROM `{db}`.`user_favorites` "
            f"WHERE client_id='{_mysql_escape(client_id)}' "
            f"AND entity_type='{_mysql_escape(entity_type)}' "
            f"AND entity_id='{_mysql_escape(entity_id)}' "
            "LIMIT 1;"
        )
        exists_out, status = _mysql_exec(exists_sql, include_db=False, timeout_sec=5)
        if status != "ok":
            self.send_json(500, {"error": "db_error"})
            return

        exists = bool((exists_out or "").strip())
        should_add = (action == "add") or (action == "toggle" and not exists)
        should_remove = (action == "remove") or (action == "toggle" and exists)

        if should_add:
            sql = (
                f"INSERT IGNORE INTO `{db}`.`user_favorites` "
                "(client_id, entity_type, entity_id) "
                f"VALUES ('{_mysql_escape(client_id)}', '{_mysql_escape(entity_type)}', '{_mysql_escape(entity_id)}');"
            )
            _, status = _mysql_exec(sql, include_db=False, timeout_sec=5)
            if status != "ok":
                self.send_json(500, {"error": "db_error"})
                return
            self.send_json(200, {"isFavorited": True})
            return

        if should_remove:
            sql = (
                f"DELETE FROM `{db}`.`user_favorites` "
                f"WHERE client_id='{_mysql_escape(client_id)}' "
                f"AND entity_type='{_mysql_escape(entity_type)}' "
                f"AND entity_id='{_mysql_escape(entity_id)}' "
                "LIMIT 1;"
            )
            _, status = _mysql_exec(sql, include_db=False, timeout_sec=5)
            if status != "ok":
                self.send_json(500, {"error": "db_error"})
                return
            self.send_json(200, {"isFavorited": False})
            return

        self.send_json(200, {"isFavorited": exists})

    def handle_user_kv_get(self, query):
        if not mysql_can_connect(timeout_sec=2):
            self.send_json(500, {"error": "db_error"})
            return
        ensure_user_tables()

        client_id = _safe_client_id(self.headers.get("X-Client-Id") or "")
        if not client_id:
            self.send_json(400, {"error": "invalid_client"})
            return

        params = urllib.parse.parse_qs(query or "")
        namespace = _safe_namespace((params.get("namespace") or [""])[0])
        key = _safe_kv_key((params.get("key") or [""])[0])
        if not namespace or not key:
            self.send_json(400, {"error": "invalid_key"})
            return

        host, port, user, db = _mysql_host_port_user_db()
        sql = (
            f"SELECT v_json FROM `{db}`.`user_kv` "
            f"WHERE client_id='{_mysql_escape(client_id)}' "
            f"AND namespace='{_mysql_escape(namespace)}' "
            f"AND k='{_mysql_escape(key)}' "
            "LIMIT 1;"
        )
        out, status = _mysql_exec(sql, include_db=False, timeout_sec=5)
        if status != "ok":
            self.send_json(500, {"error": "db_error"})
            return
        raw = (out or "").strip()
        if not raw:
            self.send_json(404, {"error": "not_found"})
            return
        try:
            value = json.loads(raw)
        except Exception:
            value = raw
        self.send_json(200, {"value": value})

    def handle_user_kv_post(self):
        if not mysql_can_connect(timeout_sec=2):
            self.send_json(500, {"error": "db_error"})
            return
        ensure_user_tables()

        client_id = _safe_client_id(self.headers.get("X-Client-Id") or "")
        if not client_id:
            self.send_json(400, {"error": "invalid_client"})
            return

        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0 or length > MAX_BODY_BYTES:
            self.send_json(413, {"error": "payload_too_large"})
            return

        try:
            raw = self.rfile.read(length).decode("utf-8")
            body = json.loads(raw) if raw else {}
        except Exception:
            self.send_json(400, {"error": "invalid_json"})
            return

        namespace = _safe_namespace(body.get("namespace"))
        key = _safe_kv_key(body.get("key"))
        if not namespace or not key:
            self.send_json(400, {"error": "invalid_key"})
            return

        try:
            v_json = json.dumps(body.get("value"), ensure_ascii=False)
        except Exception:
            self.send_json(400, {"error": "invalid_value"})
            return

        host, port, user, db = _mysql_host_port_user_db()
        sql = (
            f"INSERT INTO `{db}`.`user_kv` (client_id, namespace, k, v_json) "
            f"VALUES ('{_mysql_escape(client_id)}', '{_mysql_escape(namespace)}', '{_mysql_escape(key)}', '{_mysql_escape(v_json)}') "
            "ON DUPLICATE KEY UPDATE v_json=VALUES(v_json);"
        )
        _, status = _mysql_exec(sql, include_db=False, timeout_sec=5)
        if status != "ok":
            self.send_json(500, {"error": "db_error"})
            return
        self.send_json(200, {"ok": True})

    def send_json(self, status_code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def get_ip_address():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

if __name__ == "__main__":
    ip = get_ip_address()
    print(f"Starting server at http://{ip}:{PORT}")
    print(f"Serving directory: {DIRECTORY}")
    print(f"Access the app at: http://{ip}:{PORT}/index.html")
    print(f"Access wardrobe at: http://{ip}:{PORT}/wardrobe.html")
    
    # Enable address reuse to prevent "Address already in use" errors on restart
    socketserver.TCPServer.allow_reuse_address = True
    ensure_mysql_running()
    init_i18n_database()
    ensure_user_tables()
    ensure_auth_tables()
    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\nServer stopped.")
    except OSError as e:
        if getattr(e, "errno", None) in (48, 98):
            print(f"Port {PORT} is already in use. Stop the other process or run with PORT=<free_port>.")
        else:
            raise
