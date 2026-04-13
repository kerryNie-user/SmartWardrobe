import importlib
import os
import unittest


class BackendConfigTest(unittest.TestCase):
    def load_config(self, webapp_dir=None):
        previous = os.environ.get('WEBAPP_DIR')
        try:
            if webapp_dir is None:
                os.environ.pop('WEBAPP_DIR', None)
            else:
                os.environ['WEBAPP_DIR'] = webapp_dir

            import services.backend_legacy.config
            return importlib.reload(services.backend_legacy.config)
        finally:
            if previous is None:
                os.environ.pop('WEBAPP_DIR', None)
            else:
                os.environ['WEBAPP_DIR'] = previous

    def test_defaults_to_app_webapp(self):
        config = self.load_config()
        self.assertTrue(config.WEBAPP_DIR.endswith(os.path.join('apps', 'web-legacy')))

    def test_supports_relative_new_web_root(self):
        config = self.load_config('apps/web-new')
        self.assertTrue(config.WEBAPP_DIR.endswith(os.path.join('SmartWardrobe', 'apps', 'web-new')))


if __name__ == '__main__':
    unittest.main()
