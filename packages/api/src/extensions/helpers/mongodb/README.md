# MongoDB helper

## Primary database

The helper registers `DB_TYPE=mongodb`. Persistence uses the native `mongodb` driver; `connect-mongo` provides persistent sessions and their TTL index. Existing TypeORM entity metadata and lifecycle subscribers are reused for UUID IDs, password hashing, audit events, and license checks. No SQL connection is opened.

```dotenv
DB_TYPE=mongodb
DB_URL=mongodb://localhost:27017/hexabot?replicaSet=rs0
DB_NAME=hexabot
```

Use a **replica set** (a single-node replica set is sufficient) or a sharded cluster. Saves, cascades, and workflow imports use native transactions; standalone servers are rejected at startup. URI credentials belong in `DB_URL`, not in the helper settings. With no URI, the connection string is built from `DB_HOST`, `DB_PORT` (default 27017), `DB_USERNAME`, and `DB_PASSWORD`, using a direct connection (and `authSource=admin` when a username is set) so a replica set behind a remapped port works. `DB_NAME` selects the database.

For an isolated local development server:

```sh
docker run -d --name hexabot-mongo-dev -p 127.0.0.1:27017:27017 mongo:7.0 --replSet rs0 --bind_ip_all
docker exec hexabot-mongo-dev mongosh --quiet --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"localhost:27017"}]})'
```

Use a new MongoDB database. This adapter does not import existing SQL data or legacy MongoDB collections. Startup creates application indexes and the content text index. Existing SQL migration scripts are skipped at startup and rejected by the migration runner; MongoDB data upgrades require database-specific migrations. `DB_SYNCHRONIZE` does not control native index provisioning.

The adapter supports the repository operations used by Hexabot: find/count, scalar and relation filters, ordering/pagination, relation population, saves, direct updates, and cascading deletes. Unsupported find operators and SQL query builders are not translated. Content retrieval uses MongoDB's native text index; ranking can differ from SQLite/PostgreSQL.

Integration tests use a disposable database and require an explicit replica-set URL:

```sh
MONGODB_TEST_URL='mongodb://localhost:27017/?replicaSet=rs0' pnpm --filter @hexabot-ai/api run test -- src/extensions/helpers/mongodb
```

## Additional connection for extensions

The original connection helper also works alongside any primary database. Create a credential containing a full MongoDB URI, select it in the MongoDB helper settings, set its database name, and enable it. These settings apply on restart and are independent of the primary database settings above.

```ts
import MongoDBHelper from 'hexabot-helper-mongodb';

// In an injectable extension class:
@Inject(MongoDBHelper)
private readonly mongodb: MongoDBHelper;

// In an async method:
const collection = await this.mongodb.getCollection('events');
await collection.insertOne({ message: 'Hello' });
```

The optional connection is opened lazily, shared across callers, and closed on shutdown. Disabled helpers reject connection requests. Failed connection requests can be retried. Collection operations use the native driver API.
