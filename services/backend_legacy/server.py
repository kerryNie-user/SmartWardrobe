import socket
import socketserver

from . import config
from . import mysql_utils
from .handler import Handler


def get_ip_address():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def main():
    ip = get_ip_address()
    print(f"Starting server at http://{ip}:{config.PORT}")
    print(f"Serving directory: {config.WEBAPP_DIR}")
    print(f"Access the app at: http://{ip}:{config.PORT}/index.html")
    print(f"Access wardrobe at: http://{ip}:{config.PORT}/wardrobe.html")

    socketserver.TCPServer.allow_reuse_address = True
    mysql_utils.ensure_mysql_running()
    mysql_utils.init_i18n_database()
    mysql_utils.ensure_user_tables()
    mysql_utils.ensure_auth_tables()
    try:
        with socketserver.TCPServer(("", config.PORT), Handler) as httpd:
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\nServer stopped.")
    except OSError as e:
        if getattr(e, "errno", None) in (48, 98):
            print(f"Port {config.PORT} is already in use. Stop the other process or run with PORT=<free_port>.")
        else:
            raise


if __name__ == "__main__":
    main()

