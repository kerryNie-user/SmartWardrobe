import http.server
import json
import os
import time
import urllib.parse

from . import auth
from . import config
from . import mysql_utils
from . import validation


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=config.WEBAPP_DIR, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/i18n":
            self.handle_i18n(parsed.query)
            return
        if parsed.path == "/api/favorites":
            self.handle_favorites_get()
            return
        if parsed.path in ("/api/schedules", "/api/v1/schedules"):
            self.handle_schedules_get(parsed.query)
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
        if parsed.path in ("/api/schedules", "/api/v1/schedules"):
            self.handle_schedules_post()
            return
        if parsed.path == "/api/user_kv":
            self.handle_user_kv_post()
            return
        self.send_json(404, {"error": "not_found"})

    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path.startswith("/api/schedules/") or parsed.path.startswith("/api/v1/schedules/"):
            self.handle_schedule_put(parsed.path)
            return
        self.send_json(404, {"error": "not_found"})

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path.startswith("/api/schedules/") or parsed.path.startswith("/api/v1/schedules/"):
            self.handle_schedule_delete(parsed.path)
            return
        self.send_json(404, {"error": "not_found"})

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Client-Id, Authorization")
        self.send_header("Access-Control-Max-Age", "86400")
        self.end_headers()

    def _read_json_body(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0 or length > config.MAX_BODY_BYTES:
            return (None, "invalid_length")
        try:
            raw = self.rfile.read(length).decode("utf-8")
            body = json.loads(raw) if raw else {}
        except Exception:
            return (None, "invalid_json")
        if not isinstance(body, dict):
            return (None, "invalid_json")
        return (body, "ok")

    def _read_json_body_or_error(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0:
            self.send_json(400, {"error": "invalid_json"})
            return (None, False)
        if length > config.MAX_BODY_BYTES:
            self.send_json(413, {"error": "payload_too_large"})
            return (None, False)
        try:
            raw = self.rfile.read(length).decode("utf-8")
            body = json.loads(raw) if raw else {}
        except Exception:
            self.send_json(400, {"error": "invalid_json"})
            return (None, False)
        if not isinstance(body, dict):
            self.send_json(400, {"error": "invalid_json"})
            return (None, False)
        return (body, True)

    def handle_auth_register(self):
        if not mysql_utils.mysql_can_connect(timeout_sec=2):
            self.send_json(500, {"error": "db_error"})
            return
        mysql_utils.ensure_auth_tables()

        body, status = self._read_json_body()
        if status != "ok":
            self.send_json(400, {"error": status})
            return

        name = validation.safe_name(body.get("name"))
        email, mobile = validation.safe_email_or_mobile(body.get("emailOrMobile"))
        password = body.get("password")
        if not name or (not email and not mobile) or not isinstance(password, str):
            self.send_json(400, {"error": "invalid_fields"})
            return
        record = auth.hash_password(password)
        if not record:
            self.send_json(400, {"error": "password_too_short"})
            return

        host, port, user, db = mysql_utils.mysql_host_port_user_db()
        if email:
            sql = (
                f"SELECT id FROM `{db}`.`user_accounts` "
                f"WHERE email='{mysql_utils.mysql_escape(email)}' "
                "LIMIT 1;"
            )
            out, q_status = mysql_utils.mysql_exec(sql, include_db=False, timeout_sec=5)
            if q_status != "ok":
                self.send_json(500, {"error": "db_error"})
                return
            if (out or "").strip():
                self.send_json(409, {"error": "email_registered"})
                return
        if mobile:
            sql = (
                f"SELECT id FROM `{db}`.`user_accounts` "
                f"WHERE mobile='{mysql_utils.mysql_escape(mobile)}' "
                "LIMIT 1;"
            )
            out, q_status = mysql_utils.mysql_exec(sql, include_db=False, timeout_sec=5)
            if q_status != "ok":
                self.send_json(500, {"error": "db_error"})
                return
            if (out or "").strip():
                self.send_json(409, {"error": "mobile_registered"})
                return

        email_sql = f"'{mysql_utils.mysql_escape(email)}'" if email else "NULL"
        mobile_sql = f"'{mysql_utils.mysql_escape(mobile)}'" if mobile else "NULL"
        insert_sql = (
            f"INSERT INTO `{db}`.`user_accounts` "
            "(name, email, mobile, password_salt_hex, password_hash_hex, password_iterations) "
            f"VALUES ('{mysql_utils.mysql_escape(name)}', {email_sql}, {mobile_sql}, "
            f"'{mysql_utils.mysql_escape(record['salt_hex'])}', '{mysql_utils.mysql_escape(record['hash_hex'])}', {int(record['iterations'])});"
        )
        _, i_status = mysql_utils.mysql_exec(insert_sql, include_db=False, timeout_sec=5)
        if i_status != "ok":
            self.send_json(500, {"error": "db_error"})
            return

        where = f"email='{mysql_utils.mysql_escape(email)}'" if email else f"mobile='{mysql_utils.mysql_escape(mobile)}'"
        select_sql = (
            f"SELECT id, name, email, mobile FROM `{db}`.`user_accounts` "
            f"WHERE {where} "
            "LIMIT 1;"
        )
        out, s_status = mysql_utils.mysql_exec(select_sql, include_db=False, timeout_sec=5)
        if s_status != "ok":
            self.send_json(500, {"error": "db_error"})
            return
        line = (out or "").strip().splitlines()[0] if (out or "").strip() else ""
        parts = line.split("\t") if line else []
        if len(parts) >= 4:
            user_obj = {
                "id": int(parts[0]),
                "name": parts[1],
                "email": parts[2] or None,
                "mobile": parts[3] or None,
                "avatar": "images/default_avatar.svg",
            }
        else:
            user_obj = {"name": name, "email": email, "mobile": mobile, "avatar": "images/default_avatar.svg"}
        self.send_json(201, {"message": "registered", "user": user_obj})

    def handle_auth_login(self):
        if not mysql_utils.mysql_can_connect(timeout_sec=2):
            self.send_json(500, {"error": "db_error"})
            return
        mysql_utils.ensure_auth_tables()

        body, status = self._read_json_body()
        if status != "ok":
            self.send_json(400, {"error": status})
            return

        email, mobile = validation.safe_email_or_mobile(body.get("emailOrMobile"))
        password = body.get("password")
        if (not email and not mobile) or not isinstance(password, str):
            self.send_json(400, {"error": "invalid_fields"})
            return

        host, port, user, db = mysql_utils.mysql_host_port_user_db()
        where = f"email='{mysql_utils.mysql_escape(email)}'" if email else f"mobile='{mysql_utils.mysql_escape(mobile)}'"
        sql = (
            "SELECT id, name, email, mobile, password_salt_hex, password_hash_hex, password_iterations "
            f"FROM `{db}`.`user_accounts` "
            f"WHERE {where} "
            "LIMIT 1;"
        )
        out, q_status = mysql_utils.mysql_exec(sql, include_db=False, timeout_sec=5)
        if q_status != "ok":
            self.send_json(500, {"error": "db_error"})
            return
        line = (out or "").strip().splitlines()[0] if (out or "").strip() else ""
        parts = line.split("\t") if line else []
        if len(parts) < 7:
            self.send_json(401, {"error": "invalid_credentials"})
            return
        user_id, name, email_val, mobile_val, salt_hex, hash_hex, iterations = parts[:7]
        if not auth.verify_password(password, salt_hex, hash_hex, iterations):
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
        file_path = os.path.join(config.WEBAPP_DIR, filename)
        if not os.path.isfile(file_path):
            return None
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return data if isinstance(data, dict) else None
        except Exception:
            return None

    def load_language_pack_from_db(self, locale):
        host, port, user, db = mysql_utils.mysql_host_port_user_db()
        query = f"SELECT `key`, value FROM language_packs WHERE locale='{mysql_utils.mysql_escape(locale)}';"
        out, status = mysql_utils.mysql_exec(query, include_db=True, timeout_sec=5)
        if status != "ok":
            return None, "db_error"
        out = (out or "").strip("\n")
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

        file_path = os.path.join(config.WEBAPP_DIR, filename)
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(pack, f, ensure_ascii=False, indent=2, sort_keys=True)
                f.write("\n")
        except Exception:
            return

    def handle_favorites_get(self):
        if not mysql_utils.mysql_can_connect(timeout_sec=2):
            self.send_json(500, {"error": "db_error"})
            return
        mysql_utils.ensure_user_tables()

        client_id = validation.safe_client_id(self.headers.get("X-Client-Id") or "")
        if not client_id:
            self.send_json(400, {"error": "invalid_client"})
            return

        host, port, user, db = mysql_utils.mysql_host_port_user_db()
        sql = (
            "SELECT entity_type, entity_id "
            f"FROM `{db}`.`user_favorites` "
            f"WHERE client_id='{mysql_utils.mysql_escape(client_id)}' "
            "ORDER BY created_at DESC;"
        )
        out, status = mysql_utils.mysql_exec(sql, include_db=False, timeout_sec=5)
        if status != "ok":
            self.send_json(500, {"error": "db_error"})
            return

        favorites = {"outfit": [], "pick": []}
        for line in (out or "").splitlines():
            parts = line.split("\t")
            if len(parts) != 2:
                continue
            t, entity_id = parts
            t = validation.safe_entity_type(t)
            entity_id = validation.safe_entity_id(entity_id)
            if not t or not entity_id:
                continue
            favorites[t].append(entity_id)

        self.send_json(200, {"favorites": favorites})

    def handle_favorites_post(self):
        if not mysql_utils.mysql_can_connect(timeout_sec=2):
            self.send_json(500, {"error": "db_error"})
            return
        mysql_utils.ensure_user_tables()

        client_id = validation.safe_client_id(self.headers.get("X-Client-Id") or "")
        if not client_id:
            self.send_json(400, {"error": "invalid_client"})
            return

        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0 or length > config.MAX_BODY_BYTES:
            self.send_json(413, {"error": "payload_too_large"})
            return

        try:
            raw = self.rfile.read(length).decode("utf-8")
            body = json.loads(raw) if raw else {}
        except Exception:
            self.send_json(400, {"error": "invalid_json"})
            return

        entity_type = validation.safe_entity_type(body.get("type"))
        entity_id = validation.safe_entity_id(body.get("id"))
        action = body.get("action") or "toggle"
        if not entity_type or not entity_id:
            self.send_json(400, {"error": "invalid_favorite"})
            return
        if action not in ("toggle", "add", "remove"):
            self.send_json(400, {"error": "invalid_action"})
            return

        host, port, user, db = mysql_utils.mysql_host_port_user_db()
        exists_sql = (
            "SELECT 1 "
            f"FROM `{db}`.`user_favorites` "
            f"WHERE client_id='{mysql_utils.mysql_escape(client_id)}' "
            f"AND entity_type='{mysql_utils.mysql_escape(entity_type)}' "
            f"AND entity_id='{mysql_utils.mysql_escape(entity_id)}' "
            "LIMIT 1;"
        )
        exists_out, status = mysql_utils.mysql_exec(exists_sql, include_db=False, timeout_sec=5)
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
                f"VALUES ('{mysql_utils.mysql_escape(client_id)}', '{mysql_utils.mysql_escape(entity_type)}', '{mysql_utils.mysql_escape(entity_id)}');"
            )
            _, status = mysql_utils.mysql_exec(sql, include_db=False, timeout_sec=5)
            if status != "ok":
                self.send_json(500, {"error": "db_error"})
                return
            self.send_json(200, {"isFavorited": True})
            return

        if should_remove:
            sql = (
                f"DELETE FROM `{db}`.`user_favorites` "
                f"WHERE client_id='{mysql_utils.mysql_escape(client_id)}' "
                f"AND entity_type='{mysql_utils.mysql_escape(entity_type)}' "
                f"AND entity_id='{mysql_utils.mysql_escape(entity_id)}' "
                "LIMIT 1;"
            )
            _, status = mysql_utils.mysql_exec(sql, include_db=False, timeout_sec=5)
            if status != "ok":
                self.send_json(500, {"error": "db_error"})
                return
            self.send_json(200, {"isFavorited": False})
            return

        self.send_json(200, {"isFavorited": exists})

    def handle_schedules_get(self, query):
        if not mysql_utils.mysql_can_connect(timeout_sec=2):
            self.send_json(500, {"error": "db_error"})
            return
        mysql_utils.ensure_user_tables()

        client_id = validation.safe_client_id(self.headers.get("X-Client-Id") or "")
        if not client_id:
            self.send_json(400, {"error": "invalid_client"})
            return

        params = urllib.parse.parse_qs(query or "")
        from_raw = (params.get("from") or [""])[0]
        to_raw = (params.get("to") or [""])[0]
        from_dt = validation.parse_iso_datetime_utc(from_raw)
        to_dt = validation.parse_iso_datetime_utc(to_raw)
        if not from_dt or not to_dt or to_dt <= from_dt:
            self.send_json(400, {"error": "invalid_time_range"})
            return

        from_sql = validation.mysql_datetime3(from_dt)
        to_sql = validation.mysql_datetime3(to_dt)
        if not from_sql or not to_sql:
            self.send_json(400, {"error": "invalid_time_range"})
            return

        host, port, user, db = mysql_utils.mysql_host_port_user_db()
        sql = (
            "SELECT payload_json "
            f"FROM `{db}`.`user_schedules` "
            f"WHERE client_id='{mysql_utils.mysql_escape(client_id)}' "
            f"AND start_at >= '{mysql_utils.mysql_escape(from_sql)}' "
            f"AND start_at < '{mysql_utils.mysql_escape(to_sql)}' "
            "ORDER BY start_at ASC;"
        )
        out, status = mysql_utils.mysql_exec(sql, include_db=False, timeout_sec=5)
        if status != "ok":
            self.send_json(500, {"error": "db_error"})
            return

        items = []
        for line in (out or "").splitlines():
            raw = (line or "").strip()
            if not raw:
                continue
            try:
                obj = json.loads(raw)
            except Exception:
                continue
            if isinstance(obj, dict):
                items.append(obj)
        self.send_json(200, {"schedules": items})

    def _normalize_schedule_payload(self, body, schedule_id):
        title = body.get("title")
        start_at_raw = body.get("startAt")

        if not isinstance(title, str):
            title = str(title) if title is not None else ""
        title = title.strip()
        if not title:
            return (None, "invalid_payload")

        if not isinstance(start_at_raw, str):
            start_at_raw = str(start_at_raw) if start_at_raw is not None else ""
        start_at_raw = start_at_raw.strip()
        start_dt = validation.parse_iso_datetime_utc(start_at_raw)
        if not start_dt:
            return (None, "invalid_payload")

        end_at_raw = body.get("endAt")
        end_dt = None
        if end_at_raw is not None and end_at_raw != "":
            if not isinstance(end_at_raw, str):
                end_at_raw = str(end_at_raw)
            end_at_raw = end_at_raw.strip()
            if end_at_raw:
                end_dt = validation.parse_iso_datetime_utc(end_at_raw)
                if not end_dt:
                    return (None, "invalid_payload")

        def _str_field(k):
            v = body.get(k)
            if v is None:
                return ""
            if not isinstance(v, str):
                v = str(v)
            return v

        def _int_field(k, fallback):
            v = body.get(k)
            try:
                n = int(v)
                return n
            except Exception:
                return fallback

        now_ms = int(time.time() * 1000)
        created_at = _int_field("createdAt", now_ms)
        updated_at = _int_field("updatedAt", now_ms)
        reminded_at = _int_field("remindedAt", 0)

        payload = {
            "id": schedule_id,
            "title": title,
            "startAt": start_at_raw,
            "endAt": _str_field("endAt").strip(),
            "category": _str_field("category").strip(),
            "location": _str_field("location").strip(),
            "outfit": _str_field("outfit").strip(),
            "remindAt": _str_field("remindAt").strip(),
            "note": _str_field("note"),
            "done": bool(body.get("done")),
            "remindedAt": reminded_at,
            "createdAt": created_at,
            "updatedAt": updated_at,
        }

        return (payload, {"start_dt": start_dt, "end_dt": end_dt})

    def handle_schedules_post(self):
        if not mysql_utils.mysql_can_connect(timeout_sec=2):
            self.send_json(500, {"error": "db_error"})
            return
        mysql_utils.ensure_user_tables()

        client_id = validation.safe_client_id(self.headers.get("X-Client-Id") or "")
        if not client_id:
            self.send_json(400, {"error": "invalid_client"})
            return

        body, ok = self._read_json_body_or_error()
        if not ok:
            return

        schedule_id = validation.safe_schedule_id(body.get("id"))
        if not schedule_id:
            self.send_json(400, {"error": "invalid_payload"})
            return

        payload, meta = self._normalize_schedule_payload(body, schedule_id)
        if not payload:
            self.send_json(400, {"error": meta})
            return

        host, port, user, db = mysql_utils.mysql_host_port_user_db()
        exists_sql = (
            "SELECT 1 "
            f"FROM `{db}`.`user_schedules` "
            f"WHERE client_id='{mysql_utils.mysql_escape(client_id)}' "
            f"AND schedule_id='{mysql_utils.mysql_escape(schedule_id)}' "
            "LIMIT 1;"
        )
        out, status = mysql_utils.mysql_exec(exists_sql, include_db=False, timeout_sec=5)
        if status != "ok":
            self.send_json(500, {"error": "db_error"})
            return
        existed = bool((out or "").strip())

        start_sql = validation.mysql_datetime3(meta["start_dt"])
        end_sql = validation.mysql_datetime3(meta["end_dt"]) if meta.get("end_dt") else None
        if not start_sql:
            self.send_json(400, {"error": "invalid_payload"})
            return

        try:
            payload_json = json.dumps(payload, ensure_ascii=False)
        except Exception:
            self.send_json(400, {"error": "invalid_payload"})
            return

        end_value_sql = f"'{mysql_utils.mysql_escape(end_sql)}'" if end_sql else "NULL"
        upsert_sql = (
            f"INSERT INTO `{db}`.`user_schedules` (client_id, schedule_id, start_at, end_at, payload_json) "
            f"VALUES ('{mysql_utils.mysql_escape(client_id)}', '{mysql_utils.mysql_escape(schedule_id)}', '{mysql_utils.mysql_escape(start_sql)}', {end_value_sql}, '{mysql_utils.mysql_escape(payload_json)}') "
            "ON DUPLICATE KEY UPDATE "
            "start_at=VALUES(start_at), "
            "end_at=VALUES(end_at), "
            "payload_json=VALUES(payload_json);"
        )
        _, status = mysql_utils.mysql_exec(upsert_sql, include_db=False, timeout_sec=5)
        if status != "ok":
            self.send_json(500, {"error": "db_error"})
            return

        self.send_json(200 if existed else 201, payload)

    def _extract_schedule_id_from_path(self, path):
        base = "/api/schedules/"
        if path.startswith("/api/v1/schedules/"):
            base = "/api/v1/schedules/"
        if not path.startswith(base):
            return None
        raw = path[len(base) :]
        if "/" in raw:
            raw = raw.split("/", 1)[0]
        return validation.safe_schedule_id(raw)

    def handle_schedule_put(self, path):
        if not mysql_utils.mysql_can_connect(timeout_sec=2):
            self.send_json(500, {"error": "db_error"})
            return
        mysql_utils.ensure_user_tables()

        client_id = validation.safe_client_id(self.headers.get("X-Client-Id") or "")
        if not client_id:
            self.send_json(400, {"error": "invalid_client"})
            return

        schedule_id = self._extract_schedule_id_from_path(path)
        if not schedule_id:
            self.send_json(404, {"error": "not_found"})
            return

        body, ok = self._read_json_body_or_error()
        if not ok:
            return

        host, port, user, db = mysql_utils.mysql_host_port_user_db()
        get_sql = (
            "SELECT payload_json "
            f"FROM `{db}`.`user_schedules` "
            f"WHERE client_id='{mysql_utils.mysql_escape(client_id)}' "
            f"AND schedule_id='{mysql_utils.mysql_escape(schedule_id)}' "
            "LIMIT 1;"
        )
        out, status = mysql_utils.mysql_exec(get_sql, include_db=False, timeout_sec=5)
        if status != "ok":
            self.send_json(500, {"error": "db_error"})
            return
        raw = (out or "").strip()
        if not raw:
            self.send_json(404, {"error": "schedule_not_found"})
            return

        try:
            existing = json.loads(raw)
        except Exception:
            existing = {}
        if not isinstance(existing, dict):
            existing = {}

        merged = dict(existing)
        for k in (
            "title",
            "startAt",
            "endAt",
            "category",
            "location",
            "outfit",
            "remindAt",
            "note",
            "done",
            "remindedAt",
            "updatedAt",
        ):
            if k in body:
                merged[k] = body.get(k)
        merged["id"] = schedule_id

        if "createdAt" not in merged:
            merged["createdAt"] = int(time.time() * 1000)
        if "updatedAt" not in merged or not isinstance(merged.get("updatedAt"), int):
            merged["updatedAt"] = int(time.time() * 1000)

        payload, meta = self._normalize_schedule_payload(merged, schedule_id)
        if not payload:
            self.send_json(400, {"error": meta})
            return

        start_sql = validation.mysql_datetime3(meta["start_dt"])
        end_sql = validation.mysql_datetime3(meta["end_dt"]) if meta.get("end_dt") else None
        if not start_sql:
            self.send_json(400, {"error": "invalid_payload"})
            return

        try:
            payload_json = json.dumps(payload, ensure_ascii=False)
        except Exception:
            self.send_json(400, {"error": "invalid_payload"})
            return

        end_value_sql = f"'{mysql_utils.mysql_escape(end_sql)}'" if end_sql else "NULL"
        upsert_sql = (
            f"INSERT INTO `{db}`.`user_schedules` (client_id, schedule_id, start_at, end_at, payload_json) "
            f"VALUES ('{mysql_utils.mysql_escape(client_id)}', '{mysql_utils.mysql_escape(schedule_id)}', '{mysql_utils.mysql_escape(start_sql)}', {end_value_sql}, '{mysql_utils.mysql_escape(payload_json)}') "
            "ON DUPLICATE KEY UPDATE "
            "start_at=VALUES(start_at), "
            "end_at=VALUES(end_at), "
            "payload_json=VALUES(payload_json);"
        )
        _, status = mysql_utils.mysql_exec(upsert_sql, include_db=False, timeout_sec=5)
        if status != "ok":
            self.send_json(500, {"error": "db_error"})
            return

        self.send_json(200, payload)

    def handle_schedule_delete(self, path):
        if not mysql_utils.mysql_can_connect(timeout_sec=2):
            self.send_json(500, {"error": "db_error"})
            return
        mysql_utils.ensure_user_tables()

        client_id = validation.safe_client_id(self.headers.get("X-Client-Id") or "")
        if not client_id:
            self.send_json(400, {"error": "invalid_client"})
            return

        schedule_id = self._extract_schedule_id_from_path(path)
        if not schedule_id:
            self.send_json(404, {"error": "not_found"})
            return

        host, port, user, db = mysql_utils.mysql_host_port_user_db()
        sql = (
            f"DELETE FROM `{db}`.`user_schedules` "
            f"WHERE client_id='{mysql_utils.mysql_escape(client_id)}' "
            f"AND schedule_id='{mysql_utils.mysql_escape(schedule_id)}' "
            "LIMIT 1;"
        )
        _, status = mysql_utils.mysql_exec(sql, include_db=False, timeout_sec=5)
        if status != "ok":
            self.send_json(500, {"error": "db_error"})
            return
        self.send_json(200, {"message": "Schedule deleted successfully"})

    def handle_user_kv_get(self, query):
        if not mysql_utils.mysql_can_connect(timeout_sec=2):
            self.send_json(500, {"error": "db_error"})
            return
        mysql_utils.ensure_user_tables()

        client_id = validation.safe_client_id(self.headers.get("X-Client-Id") or "")
        if not client_id:
            self.send_json(400, {"error": "invalid_client"})
            return

        params = urllib.parse.parse_qs(query or "")
        namespace = validation.safe_namespace((params.get("namespace") or [""])[0])
        key = validation.safe_kv_key((params.get("key") or [""])[0])
        if not namespace or not key:
            self.send_json(400, {"error": "invalid_key"})
            return

        host, port, user, db = mysql_utils.mysql_host_port_user_db()
        sql = (
            f"SELECT v_json FROM `{db}`.`user_kv` "
            f"WHERE client_id='{mysql_utils.mysql_escape(client_id)}' "
            f"AND namespace='{mysql_utils.mysql_escape(namespace)}' "
            f"AND k='{mysql_utils.mysql_escape(key)}' "
            "LIMIT 1;"
        )
        out, status = mysql_utils.mysql_exec(sql, include_db=False, timeout_sec=5)
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
        if not mysql_utils.mysql_can_connect(timeout_sec=2):
            self.send_json(500, {"error": "db_error"})
            return
        mysql_utils.ensure_user_tables()

        client_id = validation.safe_client_id(self.headers.get("X-Client-Id") or "")
        if not client_id:
            self.send_json(400, {"error": "invalid_client"})
            return

        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0 or length > config.MAX_BODY_BYTES:
            self.send_json(413, {"error": "payload_too_large"})
            return

        try:
            raw = self.rfile.read(length).decode("utf-8")
            body = json.loads(raw) if raw else {}
        except Exception:
            self.send_json(400, {"error": "invalid_json"})
            return

        namespace = validation.safe_namespace(body.get("namespace"))
        key = validation.safe_kv_key(body.get("key"))
        if not namespace or not key:
            self.send_json(400, {"error": "invalid_key"})
            return

        try:
            v_json = json.dumps(body.get("value"), ensure_ascii=False)
        except Exception:
            self.send_json(400, {"error": "invalid_value"})
            return

        host, port, user, db = mysql_utils.mysql_host_port_user_db()
        sql = (
            f"INSERT INTO `{db}`.`user_kv` (client_id, namespace, k, v_json) "
            f"VALUES ('{mysql_utils.mysql_escape(client_id)}', '{mysql_utils.mysql_escape(namespace)}', '{mysql_utils.mysql_escape(key)}', '{mysql_utils.mysql_escape(v_json)}') "
            "ON DUPLICATE KEY UPDATE v_json=VALUES(v_json);"
        )
        _, status = mysql_utils.mysql_exec(sql, include_db=False, timeout_sec=5)
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
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

