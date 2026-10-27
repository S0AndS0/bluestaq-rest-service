/**
 * Attributions;
 *
 * - https://vitaly-t.github.io/pg-promise/
 * - https://github.com/vitaly-t/pg-promise/wiki/Connection-Syntax
 * - https://stackoverflow.com/questions/34382796/where-should-i-initialize-pg-promise
 */

import pgp from 'pg-promise';

const {
  POSTGRES_DB,
  POSTGRES_USER,
  POSTGRES_PASSWORD,
} = process.env as {
  POSTGRES_DB: string;
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;
};

const clientConfig = {
  database: POSTGRES_DB,
  user: POSTGRES_USER,
  password: POSTGRES_PASSWORD,
  /* docker-compose.yaml -> services -> "NAME" */
  host: 'postgres',
  // ssl: 'no-verify',
  ssl: false,
};

const database = pgp()(clientConfig);

// const database = pgp()(`postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@172.41.0.5:5432/${POSTGRES_DB}`);

export default database;


