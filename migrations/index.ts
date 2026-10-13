import * as migration_20261007_134254_initial from './20261007_134254_initial';
import * as migration_20261012_212424_job_type_website_stated_pay from './20261012_212424_job_type_website_stated_pay';

export const migrations = [
  {
    up: migration_20261007_134254_initial.up,
    down: migration_20261007_134254_initial.down,
    name: '20261007_134254_initial',
  },
  {
    up: migration_20261012_212424_job_type_website_stated_pay.up,
    down: migration_20261012_212424_job_type_website_stated_pay.down,
    name: '20261012_212424_job_type_website_stated_pay'
  },
];
