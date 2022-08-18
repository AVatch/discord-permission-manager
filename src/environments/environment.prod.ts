import { emulators } from './emulators';
import { secrets } from './secrets';
import { version } from './version';

export const environment = {
  production: true,
  useEmulators: false,
  emulators,
  secrets,
  version,
};
